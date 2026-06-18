const express = require('express')
const router = express.Router()
const { pcoGet } = require('../pco-client')
const db = require('../db')
const { requireAuth } = require('../middleware/auth')
const { cloudinary, USE_CLOUDINARY } = require('../storage')

router.use(requireAuth)

router.get('/status', async (req, res) => {
  const orgId = req.session.orgId
  const token = await db.getOne('SELECT id FROM pco_tokens WHERE org_id = ? LIMIT 1', [orgId])
  res.json({ connected: !!token })
})

router.get('/service-types', async (req, res) => {
  const orgId = req.session.orgId
  try {
    const data = await pcoGet('/services/v2/service_types?per_page=100&order=name', orgId)
    res.json(data)
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

router.get('/service-types/:id/plans', async (req, res) => {
  const orgId = req.session.orgId
  try {
    const data = await pcoGet(
      `/services/v2/service_types/${req.params.id}/plans?filter=future&per_page=10&order=sort_date`,
      orgId
    )
    res.json(data)
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

// Teams for a service type — used to build team filter/selection UI
router.get('/service-types/:id/teams', async (req, res) => {
  const orgId = req.session.orgId
  try {
    const data = await pcoGet(`/services/v2/service_types/${req.params.id}/teams?per_page=100`, orgId)
    res.json(data)
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

router.get('/service-types/:typeId/plans/:planId/team-members', async (req, res) => {
  const orgId = req.session.orgId
  try {
    const data = await pcoGet(
      `/services/v2/service_types/${req.params.typeId}/plans/${req.params.planId}/team_members?per_page=100&include=person,team`,
      orgId
    )
    res.json(data)
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

// Preview what would be pushed — runs automation matching, includes team name per member
router.get('/service-types/:typeId/plans/:planId/team-preview', async (req, res) => {
  const orgId = req.session.orgId
  const beaconServiceTypeId = req.query.service_type_id ? Number(req.query.service_type_id) : null
  try {
    const teamRes = await pcoGet(
      `/services/v2/service_types/${req.params.typeId}/plans/${req.params.planId}/team_members?per_page=100&include=person,team`,
      orgId
    )
    const members  = teamRes.data     ?? []
    const included = teamRes.included ?? []
    const pcoPersonById = {}
    const pcoTeamById = {}
    for (const item of included) {
      if (item.type === 'Person') pcoPersonById[item.id] = item
      if (item.type === 'Team')   pcoTeamById[item.id]   = item
    }

    let rules  = []
    let labels = []
    if (beaconServiceTypeId) {
      rules  = await db.getAll('SELECT * FROM automation_rules WHERE org_id = ? ORDER BY priority', [orgId])
      labels = await db.getAll('SELECT * FROM labels WHERE org_id = ? ORDER BY type, sort_order', [orgId])
    }

    function resolveLabel(actionValue, type, usedIds) {
      if (actionValue === 'next_available' || actionValue.startsWith('next_available:')) {
        const groupName = actionValue.startsWith('next_available:') ? actionValue.slice('next_available:'.length) : null
        const avail = labels.filter(l => l.type === type && !usedIds.has(l.id) && (!groupName || l.group_name === groupName))
        if (!avail.length) return null
        usedIds.add(avail[0].id); return avail[0]
      }
      const label = labels.find(l => l.id === Number(actionValue) && l.type === type)
      if (!label || usedIds.has(label.id)) return null
      usedIds.add(label.id); return label
    }

    const usedMicIds = new Set()
    const usedIemIds = new Set()
    const preview = []

    for (const member of members) {
      if (member.attributes?.status === 'D') continue
      const name     = member.attributes?.name               ?? ''
      const position = member.attributes?.team_position_name ?? ''
      const pcoPId   = member.relationships?.person?.data?.id ?? null
      const teamId   = member.relationships?.team?.data?.id   ?? null
      const pcoPerson = pcoPId ? pcoPersonById[pcoPId] : null
      const teamName  = teamId ? (pcoTeamById[teamId]?.attributes?.name ?? null) : null

      let mic = null, iem = null, matched = false
      for (const rule of rules) {
        const fieldValue = rule.condition_field === 'name' ? name : position
        const condVal    = rule.condition_value ?? ''
        const hit = rule.condition_op === 'is'
          ? fieldValue.toLowerCase() === condVal.toLowerCase()
          : fieldValue.toLowerCase().includes(condVal.toLowerCase())
        if (!hit) continue
        matched = true
        if (rule.action_type === 'mic' && !mic) mic = resolveLabel(rule.action_value, 'mic', usedMicIds)
        else if (rule.action_type === 'iem' && !iem) iem = resolveLabel(rule.action_value, 'iem', usedIemIds)
      }

      const beaconPerson = pcoPId
        ? await db.getOne('SELECT id, name, name_override, photo_url, photo_override FROM people WHERE pco_person_id = ? AND org_id = ?', [pcoPId, orgId])
        : null

      preview.push({
        pcoPersonId:  pcoPId,
        name,
        displayName:  beaconPerson?.name_override ?? beaconPerson?.name ?? name,
        position,
        teamId,
        teamName,
        photo:        beaconPerson?.photo_override ?? beaconPerson?.photo_url ?? pcoPerson?.attributes?.photo_thumbnail ?? null,
        inBeacon:     !!beaconPerson,
        beaconId:     beaconPerson?.id ?? null,
        matched:      rules.length > 0 ? matched : null,
        micLabel:     mic?.name ?? null,
        iemLabel:     iem?.name ?? null,
      })
    }
    res.json({ preview })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

// Import people from a PCO plan into the Beacon people roster
// Accepts optional pco_person_ids array to import only specific people
router.post('/import-people', async (req, res) => {
  const orgId = req.session.orgId
  const { pco_service_type_id, plan_id, pco_person_ids } = req.body
  if (!pco_service_type_id || !plan_id) {
    return res.status(400).json({ error: 'pco_service_type_id and plan_id required' })
  }

  const allowedIds = Array.isArray(pco_person_ids) && pco_person_ids.length > 0 ? new Set(pco_person_ids) : null

  try {
    const teamRes = await pcoGet(
      `/services/v2/service_types/${pco_service_type_id}/plans/${plan_id}/team_members?per_page=100&include=person`,
      orgId
    )
    const members  = teamRes.data     ?? []
    const included = teamRes.included ?? []
    const pcoPersonById = {}
    for (const p of included) { if (p.type === 'Person') pcoPersonById[p.id] = p }

    // Get org slug once for Cloudinary folder paths
    let orgSlug = null
    if (USE_CLOUDINARY && cloudinary) {
      const org = await db.getOne('SELECT slug FROM organizations WHERE id = ?', [orgId])
      orgSlug = org?.slug ?? 'unknown'
    }

    let imported = 0, skipped = 0
    for (const member of members) {
      if (member.attributes?.status === 'D') continue
      const pcoPId = member.relationships?.person?.data?.id ?? null
      if (!pcoPId) continue

      // If caller specified which people to import, skip others
      if (allowedIds && !allowedIds.has(pcoPId)) { skipped++; continue }

      // Skip if already in this org's people
      const existing = await db.getOne(
        'SELECT id FROM people WHERE pco_person_id = ? AND org_id = ?',
        [pcoPId, orgId]
      )
      if (existing) { skipped++; continue }

      const pcoPerson = pcoPersonById[pcoPId]
      const name     = member.attributes?.name               ?? pcoPerson?.attributes?.full_name ?? 'Unknown'
      const position = member.attributes?.team_position_name ?? null
      const photoUrl = pcoPerson?.attributes?.photo_thumbnail ?? null

      if (name.trim().length > 60) { skipped++; continue }

      // Insert person first (without photo) to get the ID
      const row = await db.getOne(
        'INSERT INTO people (org_id, name, pco_person_id, position) VALUES (?, ?, ?, ?) RETURNING id',
        [orgId, name.trim(), pcoPId, position]
      )
      const newId = row.id

      // Upload photo to Cloudinary or store PCO URL directly
      if (photoUrl) {
        let finalPhotoUrl = photoUrl
        if (USE_CLOUDINARY && cloudinary && orgSlug) {
          try {
            const uploadRes = await cloudinary.uploader.upload(photoUrl, {
              folder:        `beacon/${orgSlug}/photos/${newId}`,
              resource_type: 'image',
              transformation: [{ width: 800, crop: 'limit' }],
            })
            finalPhotoUrl = uploadRes.secure_url
          } catch { /* fall back to PCO URL */ }
        }
        await db.execute('UPDATE people SET photo_url = ? WHERE id = ?', [finalPhotoUrl, newId])
      }

      imported++
    }
    res.json({ imported, skipped })
  } catch (err) {
    res.status(503).json({ error: err.message })
  }
})

// Test PCO connection — tests both People and Services separately for diagnosis
router.get('/test-connection', async (req, res) => {
  const orgId = req.session.orgId
  let peopleOk = false, servicesOk = false, serviceTypeCount = 0, error = null

  try {
    await pcoGet('/people/v2/me', orgId)
    peopleOk = true
  } catch (err) {
    error = err.message
  }

  try {
    const data = await pcoGet('/services/v2/service_types?per_page=1', orgId)
    serviceTypeCount = data.meta?.total_count ?? (data.data?.length ?? 0)
    servicesOk = true
  } catch (err) {
    if (!error) error = err.message
  }

  if (servicesOk) {
    return res.json({ ok: true, serviceTypeCount, peopleOk, servicesOk })
  }
  if (peopleOk && !servicesOk) {
    return res.status(503).json({
      ok: false,
      peopleOk,
      servicesOk,
      error: 'Token is valid but Services access was denied (403). Your PCO account may not have the Services module, or the authorization was granted without the Services scope. Revoke Beacon\'s access in PCO (Profile → Connected Apps), then reconnect.',
    })
  }
  res.status(503).json({ ok: false, peopleOk, servicesOk, error: error ?? 'Unknown error' })
})

module.exports = router
