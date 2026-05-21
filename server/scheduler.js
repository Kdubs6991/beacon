const cron = require('node-cron')
const db = require('./db')

const activeTasks = new Map()

function startScheduler() {
  const schedules = db.prepare(`
    SELECT s.*, st.name as service_type_name, st.pco_service_type_id
    FROM schedules s
    JOIN service_types st ON s.service_type_id = st.id
    WHERE s.enabled = 1
  `).all()

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

// ── Label resolver (same logic as run-automation route) ──────────────────────

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

// ── Get today's date string in a given timezone ───────────────────────────────

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

// ── Main schedule runner ─────────────────────────────────────────────────────

async function runSchedule(scheduleId) {
  // Load schedule with all related data needed for the pipeline
  const schedule = db.prepare(`
    SELECT s.*,
           st.name          AS service_type_name,
           st.pco_service_type_id,
           c.org_id,
           o.timezone
    FROM schedules s
    JOIN service_types st ON s.service_type_id = st.id
    JOIN campuses     c  ON st.campus_id = c.id
    JOIN organizations o ON c.org_id    = o.id
    WHERE s.id = ?
  `).get(scheduleId)

  if (!schedule) return

  const { org_id: orgId, timezone, service_type_name, pco_service_type_id } = schedule

  const stamp = `[schedule ${scheduleId} · ${service_type_name}]`
  console.log(`${stamp} triggered`)

  // ── Validate prerequisites ────────────────────────────────────────────────

  if (!pco_service_type_id) {
    console.log(`${stamp} no PCO service type ID — nothing to sync`)
    db.prepare("UPDATE schedules SET last_run = datetime('now') WHERE id = ?").run(scheduleId)
    return
  }

  const pcoToken = db.prepare('SELECT id FROM pco_tokens LIMIT 1').get()
  if (!pcoToken) {
    console.log(`${stamp} PCO not connected — skipping`)
    db.prepare("UPDATE schedules SET last_run = datetime('now') WHERE id = ?").run(scheduleId)
    return
  }

  // ── Determine target screens ──────────────────────────────────────────────

  let targetScreenIds = []
  try { targetScreenIds = schedule.screen_ids ? JSON.parse(schedule.screen_ids) : [] } catch {}

  if (!targetScreenIds.length) {
    console.log(`${stamp} no target screens configured — skipping`)
    db.prepare("UPDATE schedules SET last_run = datetime('now') WHERE id = ?").run(scheduleId)
    return
  }

  // Filter to only screens that are currently active (heartbeat within 90s)
  const activeScreenIds = targetScreenIds.filter(id => {
    const row = db.prepare(
      "SELECT id FROM screens WHERE id = ? AND last_heartbeat > datetime('now', '-90 seconds')"
    ).get(id)
    return !!row
  })

  if (!activeScreenIds.length) {
    console.log(`${stamp} none of the ${targetScreenIds.length} target screen(s) are active — skipping`)
    db.prepare("UPDATE schedules SET last_run = datetime('now') WHERE id = ?").run(scheduleId)
    return
  }

  // ── PCO: find today's plan ────────────────────────────────────────────────

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
      const planDay = todayInTz(tz).length > 0
        ? new Intl.DateTimeFormat('en-CA', {
            timeZone: tz,
            year: 'numeric', month: '2-digit', day: '2-digit',
          }).format(new Date(sortDate))
        : sortDate.split('T')[0]
      return planDay === today
    })

    if (!todayPlan) {
      console.log(`${stamp} no plan found for today (${today}) — nothing to push`)
      db.prepare("UPDATE schedules SET last_run = datetime('now') WHERE id = ?").run(scheduleId)
      return
    }

    const planTitle = todayPlan.attributes?.title ?? service_type_name
    console.log(`${stamp} found plan ${todayPlan.id} "${planTitle}"`)

    // ── PCO: fetch team members ───────────────────────────────────────────

    const teamRes = await pcoGet(
      `/services/v2/service_types/${pco_service_type_id}/plans/${todayPlan.id}/team_members?per_page=100&include=person`
    )

    const members  = teamRes.data     ?? []
    const included = teamRes.included ?? []

    // Map PCO person ID → included person object (for photo lookup)
    const pcoPersonById = {}
    for (const p of included) {
      if (p.type === 'Person') pcoPersonById[p.id] = p
    }

    // ── Automation rules + labels ─────────────────────────────────────────

    const rules  = db.prepare('SELECT * FROM automation_rules WHERE org_id = ? ORDER BY priority').all(orgId)
    const labels = db.prepare('SELECT * FROM labels WHERE org_id = ? ORDER BY type, sort_order').all(orgId)

    // ── Process each team member ──────────────────────────────────────────

    const usedMicIds = new Set()
    const usedIemIds = new Set()
    const assignments = []
    let nextSlot = 0

    for (const member of members) {
      const name         = member.attributes?.name               ?? ''
      const teamPosition = member.attributes?.team_position_name ?? ''
      const status       = member.attributes?.status

      // Skip people who declined
      if (status === 'D') continue

      // Run automation rules — match on name OR position
      let mic = null
      let iem = null
      let matched = false

      for (const rule of rules) {
        const fieldValue = rule.condition_field === 'name' ? name : teamPosition
        const condVal    = rule.condition_value ?? ''

        let ruleMatches = false
        if (rule.condition_op === 'is') {
          ruleMatches = fieldValue.toLowerCase() === condVal.toLowerCase()
        } else if (rule.condition_op === 'contains') {
          ruleMatches = fieldValue.toLowerCase().includes(condVal.toLowerCase())
        }

        if (!ruleMatches) continue
        matched = true

        if (rule.action_type === 'mic' && !mic) {
          mic = resolveLabel(rule.action_value, 'mic', labels, usedMicIds)
        } else if (rule.action_type === 'iem' && !iem) {
          iem = resolveLabel(rule.action_value, 'iem', labels, usedIemIds)
        }
      }

      // If no rule matched this person, skip them (instruments, non-worship roles, etc.)
      if (!matched) {
        console.log(`${stamp}   skip "${name}" (${teamPosition}) — no rule matched`)
        continue
      }

      // ── Match to Beacon person by PCO ID ─────────────────────────────

      const pcoPId      = member.relationships?.person?.data?.id ?? null
      let   personId    = null
      let   personName  = name
      let   personPhoto = member.attributes?.photo_thumbnail ?? null

      if (pcoPId) {
        // Prefer photo from included person object if available
        const pcoPerson = pcoPersonById[pcoPId]
        if (pcoPerson?.attributes?.photo_thumbnail) {
          personPhoto = pcoPerson.attributes.photo_thumbnail
        }

        // Look up in Beacon people by pco_person_id
        const beaconPerson = db.prepare(
          'SELECT * FROM people WHERE pco_person_id = ? AND org_id = ?'
        ).get(pcoPId, orgId)

        if (beaconPerson) {
          personId    = beaconPerson.id
          personName  = beaconPerson.name_override  ?? beaconPerson.name
          personPhoto = beaconPerson.photo_override ?? beaconPerson.photo_url ?? personPhoto
        }
      }

      console.log(`${stamp}   include "${personName}" (${teamPosition}) → mic: ${mic?.name ?? 'none'}, iem: ${iem?.name ?? 'none'}`)

      assignments.push({
        slot:      nextSlot++,
        personId,
        personName,
        personPhoto,
        position:  teamPosition,
        micLabel:  mic?.name ?? null,
        iemLabel:  iem?.name ?? null,
      })
    }

    // ── Push to active screens ────────────────────────────────────────────

    const eventDate = today
    const eventName = service_type_name

    const insertAssignment = db.prepare(`
      INSERT INTO active_assignments
        (screen_id, person_id, person_name, person_photo, slot, position, mic_label, iem_label, event_name, event_date, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `)

    for (const screenId of activeScreenIds) {
      db.transaction(() => {
        db.prepare('DELETE FROM active_assignments WHERE screen_id = ?').run(screenId)
        for (const a of assignments) {
          insertAssignment.run(
            screenId, a.personId, a.personName, a.personPhoto,
            a.slot, a.position, a.micLabel, a.iemLabel,
            eventName, eventDate
          )
        }
      })()
      console.log(`${stamp}   pushed ${assignments.length} musicians to screen ${screenId}`)
    }

    db.prepare("UPDATE schedules SET last_run = datetime('now') WHERE id = ?").run(scheduleId)
    console.log(`${stamp} done — ${assignments.length} musicians on ${activeScreenIds.length} screen(s)`)

  } catch (err) {
    console.error(`[schedule ${scheduleId}] failed:`, err.message)
    db.prepare("UPDATE schedules SET last_run = datetime('now') WHERE id = ?").run(scheduleId)
  }
}

module.exports = { startScheduler, registerSchedule, unregisterSchedule, runSchedule }
