const cron = require('node-cron')
const db = require('./db')

const activeTasks = new Map()

async function startScheduler() {
  const schedules = await db.getAll(`
    SELECT s.*, st.name as service_type_name, st.pco_service_type_id
    FROM schedules s
    JOIN service_types st ON s.service_type_id = st.id
    WHERE s.enabled = 1
  `)

  for (const schedule of schedules) {
    registerSchedule(schedule)
  }

  console.log(`Scheduler started with ${schedules.length} active schedule(s)`)
}

function registerSchedule(schedule) {
  if (activeTasks.has(schedule.id)) {
    activeTasks.get(schedule.id).stop()
  }

  if (!cron.validate(schedule.cron_expr)) {
    console.warn(`Invalid cron expression for schedule ${schedule.id}: ${schedule.cron_expr}`)
    return
  }

  const task = cron.schedule(schedule.cron_expr, () => runSchedule(schedule.id))
  activeTasks.set(schedule.id, task)
  console.log(`Registered schedule ${schedule.id} (${schedule.service_type_name}): ${schedule.cron_expr}`)
}

function unregisterSchedule(scheduleId) {
  if (activeTasks.has(scheduleId)) {
    activeTasks.get(scheduleId).stop()
    activeTasks.delete(scheduleId)
  }
}

function resolveLabel(actionValue, type, labels, usedIds) {
  if (actionValue === 'next_available' || actionValue.startsWith('next_available:')) {
    const groupName = actionValue.startsWith('next_available:')
      ? actionValue.slice('next_available:'.length)
      : null
    const available = labels.filter(l =>
      l.type === type &&
      !usedIds.has(l.id) &&
      (!groupName || l.group_name === groupName)
    )
    if (!available.length) return null
    usedIds.add(available[0].id)
    return available[0]
  }
  const label = labels.find(l => l.id === Number(actionValue) && l.type === type)
  if (!label || usedIds.has(label.id)) return null
  usedIds.add(label.id)
  return label
}

function todayInTz(tz) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(new Date())
  } catch {
    return new Date().toISOString().split('T')[0]
  }
}

async function runSchedule(scheduleId) {
  const schedule = await db.getOne(`
    SELECT s.*,
           st.name               AS service_type_name,
           st.pco_service_type_id,
           st.mode               AS service_type_mode,
           c.org_id,
           o.timezone
    FROM schedules s
    JOIN service_types st ON s.service_type_id = st.id
    JOIN campuses     c  ON st.campus_id = c.id
    JOIN organizations o ON c.org_id    = o.id
    WHERE s.id = ?
  `, [scheduleId])

  if (!schedule) return

  const { org_id: orgId, timezone, service_type_name, pco_service_type_id, service_type_mode } = schedule
  const mode = service_type_mode ?? 'pco'
  const stamp = `[schedule ${scheduleId} · ${service_type_name}]`
  console.log(`${stamp} triggered`)

  if (mode !== 'manual') {
    if (!pco_service_type_id) {
      console.log(`${stamp} no PCO service type ID — nothing to sync`)
      await db.execute('UPDATE schedules SET last_run = NOW() WHERE id = ?', [scheduleId])
      return
    }
    const pcoToken = await db.getOne('SELECT id FROM pco_tokens LIMIT 1')
    if (!pcoToken) {
      console.log(`${stamp} PCO not connected — skipping`)
      await db.execute('UPDATE schedules SET last_run = NOW() WHERE id = ?', [scheduleId])
      return
    }
  }

  let targetScreenIds = []
  try { targetScreenIds = schedule.screen_ids ? JSON.parse(schedule.screen_ids) : [] } catch {}

  if (!targetScreenIds.length) {
    console.log(`${stamp} no target screens configured — skipping`)
    await db.execute('UPDATE schedules SET last_run = NOW() WHERE id = ?', [scheduleId])
    return
  }

  const activeScreenRows = await Promise.all(
    targetScreenIds.map(id =>
      db.getOne(
        "SELECT id FROM screens WHERE id = ? AND last_heartbeat > NOW() - INTERVAL '90 seconds'",
        [id]
      )
    )
  )
  const activeScreenIds = targetScreenIds.filter((_, i) => !!activeScreenRows[i])

  if (!activeScreenIds.length) {
    console.log(`${stamp} none of the ${targetScreenIds.length} target screen(s) are active — skipping`)
    await db.execute('UPDATE schedules SET last_run = NOW() WHERE id = ?', [scheduleId])
    return
  }

  if (mode === 'manual') {
    try {
      const tz = timezone || 'America/Chicago'
      const today = todayInTz(tz)

      const manualRows = await db.getAll(`
        SELECT ma.*,
               COALESCE(p.name_override, p.name) AS person_name,
               COALESCE(p.photo_override, p.photo_url) AS person_photo
        FROM manual_assignments ma
        LEFT JOIN people p ON ma.person_id = p.id
        WHERE ma.service_type_id = ?
        ORDER BY ma.slot
      `, [schedule.service_type_id])

      const rules  = await db.getAll('SELECT * FROM automation_rules WHERE org_id = ? ORDER BY priority', [orgId])
      const labels = await db.getAll('SELECT * FROM labels WHERE org_id = ? ORDER BY type, sort_order', [orgId])
      const usedMicIds = new Set()
      const usedIemIds = new Set()

      const assignments = []
      for (const row of manualRows) {
        const name         = row.person_name ?? ''
        const teamPosition = row.position    ?? ''
        let mic = null, iem = null

        for (const rule of rules) {
          const fieldValue = rule.condition_field === 'name' ? name : teamPosition
          const condVal    = rule.condition_value ?? ''
          let ruleMatches = false
          if (rule.condition_op === 'is')          ruleMatches = fieldValue.toLowerCase() === condVal.toLowerCase()
          else if (rule.condition_op === 'contains') ruleMatches = fieldValue.toLowerCase().includes(condVal.toLowerCase())
          if (!ruleMatches) continue
          if (rule.action_type === 'mic' && !mic) mic = resolveLabel(rule.action_value, 'mic', labels, usedMicIds)
          else if (rule.action_type === 'iem' && !iem) iem = resolveLabel(rule.action_value, 'iem', labels, usedIemIds)
        }

        console.log(`${stamp}   include "${name}" (${teamPosition || 'no position'}) → mic: ${mic?.name ?? 'none'}, iem: ${iem?.name ?? 'none'}`)
        assignments.push({
          slot: assignments.length, personId: row.person_id,
          personName: row.person_name, personPhoto: row.person_photo,
          position: teamPosition, micLabel: mic?.name ?? null, iemLabel: iem?.name ?? null,
        })
      }

      for (const screenId of activeScreenIds) {
        await db.withTransaction(async (tx) => {
          await tx.execute('DELETE FROM active_assignments WHERE screen_id = ?', [screenId])
          for (const a of assignments) {
            await tx.execute(`
              INSERT INTO active_assignments
                (screen_id, person_id, person_name, person_photo, slot, position, mic_label, iem_label, event_name, event_date)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [screenId, a.personId, a.personName, a.personPhoto, a.slot, a.position, a.micLabel, a.iemLabel, service_type_name, today])
          }
        })
        console.log(`${stamp}   pushed ${assignments.length} manual musicians to screen ${screenId}`)
      }

      await db.execute('UPDATE schedules SET last_run = NOW() WHERE id = ?', [scheduleId])
      console.log(`${stamp} done (manual) — ${assignments.length} musicians on ${activeScreenIds.length} screen(s)`)
    } catch (err) {
      console.error(`[schedule ${scheduleId}] manual mode failed:`, err.message)
      await db.execute('UPDATE schedules SET last_run = NOW() WHERE id = ?', [scheduleId])
    }
    return
  }

  // ── PCO mode ─────────────────────────────────────────────────────────────────

  try {
    const { pcoGet } = require('./pco-client')
    const tz = timezone || 'America/Chicago'
    const today = todayInTz(tz)

    console.log(`${stamp} looking for PCO plans on ${today} (tz: ${tz})`)

    const plansRes = await pcoGet(
      `/services/v2/service_types/${pco_service_type_id}/plans?per_page=15&order=sort_date`
    )

    const todayPlan = (plansRes.data ?? []).find(p => {
      const sortDate = p.attributes?.sort_date
      if (!sortDate) return false
      const planDay = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
      }).format(new Date(sortDate))
      return planDay === today
    })

    if (!todayPlan) {
      console.log(`${stamp} no plan found for today (${today}) — nothing to push`)
      await db.execute('UPDATE schedules SET last_run = NOW() WHERE id = ?', [scheduleId])
      return
    }

    const planTitle = todayPlan.attributes?.title ?? service_type_name
    console.log(`${stamp} found plan ${todayPlan.id} "${planTitle}"`)

    const teamRes = await pcoGet(
      `/services/v2/service_types/${pco_service_type_id}/plans/${todayPlan.id}/team_members?per_page=100&include=person`
    )

    const members  = teamRes.data     ?? []
    const included = teamRes.included ?? []

    const pcoPersonById = {}
    for (const p of included) {
      if (p.type === 'Person') pcoPersonById[p.id] = p
    }

    const rules  = await db.getAll('SELECT * FROM automation_rules WHERE org_id = ? ORDER BY priority', [orgId])
    const labels = await db.getAll('SELECT * FROM labels WHERE org_id = ? ORDER BY type, sort_order', [orgId])

    const usedMicIds = new Set()
    const usedIemIds = new Set()
    const assignments = []
    let nextSlot = 0

    for (const member of members) {
      const name         = member.attributes?.name               ?? ''
      const teamPosition = member.attributes?.team_position_name ?? ''
      const status       = member.attributes?.status

      if (status === 'D') continue

      let mic = null, iem = null, matched = false

      for (const rule of rules) {
        const fieldValue = rule.condition_field === 'name' ? name : teamPosition
        const condVal    = rule.condition_value ?? ''
        let ruleMatches = false
        if (rule.condition_op === 'is')          ruleMatches = fieldValue.toLowerCase() === condVal.toLowerCase()
        else if (rule.condition_op === 'contains') ruleMatches = fieldValue.toLowerCase().includes(condVal.toLowerCase())
        if (!ruleMatches) continue
        matched = true
        if (rule.action_type === 'mic' && !mic) mic = resolveLabel(rule.action_value, 'mic', labels, usedMicIds)
        else if (rule.action_type === 'iem' && !iem) iem = resolveLabel(rule.action_value, 'iem', labels, usedIemIds)
      }

      if (!matched) {
        console.log(`${stamp}   skip "${name}" (${teamPosition}) — no rule matched`)
        continue
      }

      const pcoPId   = member.relationships?.person?.data?.id ?? null
      let personId   = null
      let personName = name
      let personPhoto = member.attributes?.photo_thumbnail ?? null

      if (pcoPId) {
        const pcoPerson = pcoPersonById[pcoPId]
        if (pcoPerson?.attributes?.photo_thumbnail) {
          personPhoto = pcoPerson.attributes.photo_thumbnail
        }
        const beaconPerson = await db.getOne(
          'SELECT * FROM people WHERE pco_person_id = ? AND org_id = ?',
          [pcoPId, orgId]
        )
        if (beaconPerson) {
          personId    = beaconPerson.id
          personName  = beaconPerson.name_override  ?? beaconPerson.name
          personPhoto = beaconPerson.photo_override ?? beaconPerson.photo_url ?? personPhoto
        }
      }

      console.log(`${stamp}   include "${personName}" (${teamPosition}) → mic: ${mic?.name ?? 'none'}, iem: ${iem?.name ?? 'none'}`)
      assignments.push({
        slot: nextSlot++, personId, personName, personPhoto,
        position: teamPosition, micLabel: mic?.name ?? null, iemLabel: iem?.name ?? null,
      })
    }

    for (const screenId of activeScreenIds) {
      await db.withTransaction(async (tx) => {
        await tx.execute('DELETE FROM active_assignments WHERE screen_id = ?', [screenId])
        for (const a of assignments) {
          await tx.execute(`
            INSERT INTO active_assignments
              (screen_id, person_id, person_name, person_photo, slot, position, mic_label, iem_label, event_name, event_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [screenId, a.personId, a.personName, a.personPhoto, a.slot, a.position, a.micLabel, a.iemLabel, service_type_name, today])
        }
      })
      console.log(`${stamp}   pushed ${assignments.length} musicians to screen ${screenId}`)
    }

    await db.execute('UPDATE schedules SET last_run = NOW() WHERE id = ?', [scheduleId])
    console.log(`${stamp} done — ${assignments.length} musicians on ${activeScreenIds.length} screen(s)`)

  } catch (err) {
    console.error(`[schedule ${scheduleId}] failed:`, err.message)
    await db.execute('UPDATE schedules SET last_run = NOW() WHERE id = ?', [scheduleId])
  }
}

async function pushToScreens(serviceTypeId, screenIds) {
  const serviceType = await db.getOne(`
    SELECT st.*, c.org_id, o.timezone
    FROM service_types st
    JOIN campuses     c ON st.campus_id = c.id
    JOIN organizations o ON c.org_id   = o.id
    WHERE st.id = ?
  `, [serviceTypeId])

  if (!serviceType) throw new Error('Service type not found')

  const { org_id: orgId, timezone, name: serviceName, mode, pco_service_type_id } = serviceType
  const tz    = timezone || 'America/Chicago'
  const today = todayInTz(tz)
  const rules  = await db.getAll('SELECT * FROM automation_rules WHERE org_id = ? ORDER BY priority', [orgId])
  const labels = await db.getAll('SELECT * FROM labels WHERE org_id = ? ORDER BY type, sort_order', [orgId])
  const assignments = []

  if ((mode ?? 'pco') === 'manual') {
    const usedMicIds = new Set()
    const usedIemIds = new Set()
    const rows = await db.getAll(`
      SELECT ma.*,
             COALESCE(p.name_override, p.name)       AS person_name,
             COALESCE(p.photo_override, p.photo_url)  AS person_photo
      FROM manual_assignments ma
      LEFT JOIN people p ON ma.person_id = p.id
      WHERE ma.service_type_id = ?
      ORDER BY ma.slot
    `, [serviceTypeId])

    for (const row of rows) {
      const name = row.person_name ?? ''
      const pos  = row.position    ?? ''
      let mic = null, iem = null
      for (const rule of rules) {
        const val = rule.condition_field === 'name' ? name : pos
        const cv  = rule.condition_value ?? ''
        const hit = rule.condition_op === 'is' ? val.toLowerCase() === cv.toLowerCase()
                  : val.toLowerCase().includes(cv.toLowerCase())
        if (!hit) continue
        if (rule.action_type === 'mic' && !mic) mic = resolveLabel(rule.action_value, 'mic', labels, usedMicIds)
        else if (rule.action_type === 'iem' && !iem) iem = resolveLabel(rule.action_value, 'iem', labels, usedIemIds)
      }
      assignments.push({
        slot: assignments.length, personId: row.person_id,
        personName: row.person_name, personPhoto: row.person_photo,
        position: pos, micLabel: mic?.name ?? null, iemLabel: iem?.name ?? null,
      })
    }
  } else {
    const pcoToken = await db.getOne('SELECT id FROM pco_tokens LIMIT 1')
    if (!pcoToken) throw new Error('Planning Center is not connected. Go to Integrations to connect it.')
    if (!pco_service_type_id) throw new Error('This service type has no Planning Center ID configured.')

    const { pcoGet } = require('./pco-client')
    const plansRes = await pcoGet(`/services/v2/service_types/${pco_service_type_id}/plans?per_page=15&order=sort_date`)
    const todayPlan = (plansRes.data ?? []).find(p => {
      const sd = p.attributes?.sort_date
      return sd && new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(sd)) === today
    })
    if (!todayPlan) throw new Error(`No plan found for today (${today}) in Planning Center.`)

    const teamRes = await pcoGet(`/services/v2/service_types/${pco_service_type_id}/plans/${todayPlan.id}/team_members?per_page=100&include=person`)
    const pcoPersonById = {}
    for (const p of teamRes.included ?? []) { if (p.type === 'Person') pcoPersonById[p.id] = p }

    const usedMicIds = new Set()
    const usedIemIds = new Set()
    for (const member of teamRes.data ?? []) {
      if (member.attributes?.status === 'D') continue
      const name = member.attributes?.name ?? ''
      const pos  = member.attributes?.team_position_name ?? ''
      let mic = null, iem = null, matched = false
      for (const rule of rules) {
        const val = rule.condition_field === 'name' ? name : pos
        const cv  = rule.condition_value ?? ''
        const hit = rule.condition_op === 'is' ? val.toLowerCase() === cv.toLowerCase() : val.toLowerCase().includes(cv.toLowerCase())
        if (!hit) continue
        matched = true
        if (rule.action_type === 'mic' && !mic) mic = resolveLabel(rule.action_value, 'mic', labels, usedMicIds)
        else if (rule.action_type === 'iem' && !iem) iem = resolveLabel(rule.action_value, 'iem', labels, usedIemIds)
      }
      if (!matched) continue
      const pcoPId = member.relationships?.person?.data?.id ?? null
      let personId = null, personName = name
      let personPhoto = pcoPersonById[pcoPId]?.attributes?.photo_thumbnail ?? member.attributes?.photo_thumbnail ?? null
      if (pcoPId) {
        const bp = await db.getOne('SELECT * FROM people WHERE pco_person_id = ? AND org_id = ?', [pcoPId, orgId])
        if (bp) { personId = bp.id; personName = bp.name_override ?? bp.name; personPhoto = bp.photo_override ?? bp.photo_url ?? personPhoto }
      }
      assignments.push({
        slot: assignments.length, personId, personName, personPhoto,
        position: pos, micLabel: mic?.name ?? null, iemLabel: iem?.name ?? null,
      })
    }
  }

  for (const screenId of screenIds) {
    await db.withTransaction(async (tx) => {
      await tx.execute('DELETE FROM active_assignments WHERE screen_id = ?', [screenId])
      for (const a of assignments) {
        await tx.execute(`
          INSERT INTO active_assignments
            (screen_id, person_id, person_name, person_photo, slot, position, mic_label, iem_label, event_name, event_date)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [screenId, a.personId, a.personName, a.personPhoto, a.slot, a.position, a.micLabel, a.iemLabel, serviceName, today])
      }
    })
  }
  return { pushed: assignments.length, screens: screenIds.length }
}

module.exports = { startScheduler, registerSchedule, unregisterSchedule, runSchedule, pushToScreens }
