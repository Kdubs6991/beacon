const express = require('express')
const router = express.Router()
const multer = require('multer')
const fs = require('fs')
const path = require('path')
const db = require('../db')
const { generateAccessCode } = require('../db')
const { requireAuth, requireAdmin } = require('../middleware/auth')

const LOGOS_DIR = path.join(__dirname, '../uploads/logos')
fs.mkdirSync(LOGOS_DIR, { recursive: true })

const logoUpload = multer({
  limits: { fileSize: 5 * 1024 * 1024 },
  storage: multer.diskStorage({
    destination: LOGOS_DIR,
    filename: (req, file, cb) => cb(null, `org-${req.session.orgId}-${Date.now()}${path.extname(file.originalname)}`),
  }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Image files only'))
  },
})

// GET /api/org — return the org for the current session (any authenticated user)
router.get('/', requireAuth, (req, res) => {
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.session.orgId)
  if (!org) return res.status(404).json({ error: 'Organization not found' })
  res.json(org)
})

router.use(requireAdmin)

// PUT /api/org — update name, short_name, address fields, website, phone, timezone (not slug or access_code)
router.put('/', (req, res) => {
  const { name, shortName, addressStreet, addressCity, addressState, addressZip, website, phone, timezone } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })
  db.prepare(
    'UPDATE organizations SET name = ?, short_name = ?, address_street = ?, address_city = ?, address_state = ?, address_zip = ?, website = ?, phone = ?, timezone = ? WHERE id = ?'
  ).run(
    name.trim(),
    shortName?.trim() || null,
    addressStreet?.trim() || null,
    addressCity?.trim() || null,
    addressState?.trim() || null,
    addressZip?.trim() || null,
    website?.trim() || null,
    phone?.trim() || null,
    timezone || 'America/Chicago',
    req.session.orgId
  )
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.session.orgId)
  res.json(org)
})

// POST /api/org/logo — upload org logo
router.post('/logo', logoUpload.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
  const org = db.prepare('SELECT logo_url FROM organizations WHERE id = ?').get(req.session.orgId)
  if (org?.logo_url) {
    const oldPath = path.join(__dirname, '..', org.logo_url.replace(/^\//, ''))
    fs.unlink(oldPath, () => {})
  }
  const logoUrl = `/uploads/logos/${req.file.filename}`
  db.prepare('UPDATE organizations SET logo_url = ? WHERE id = ?').run(logoUrl, req.session.orgId)
  res.json({ logo_url: logoUrl })
})

// DELETE /api/org/logo — remove org logo
router.delete('/logo', (req, res) => {
  const org = db.prepare('SELECT logo_url FROM organizations WHERE id = ?').get(req.session.orgId)
  if (org?.logo_url) {
    const filePath = path.join(__dirname, '..', org.logo_url.replace(/^\//, ''))
    fs.unlink(filePath, () => {})
    db.prepare('UPDATE organizations SET logo_url = NULL WHERE id = ?').run(req.session.orgId)
  }
  res.json({ ok: true })
})

// GET /api/org/export — full org data backup as JSON
router.get('/export', (req, res) => {
  const orgId = req.session.orgId
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(orgId)
  const campuses = db.prepare('SELECT * FROM campuses WHERE org_id = ?').all(orgId)
  const serviceTypes = db.prepare(
    'SELECT * FROM service_types WHERE campus_id IN (SELECT id FROM campuses WHERE org_id = ?)'
  ).all(orgId)
  const people = db.prepare('SELECT * FROM people WHERE org_id = ?').all(orgId)
  const labels = db.prepare('SELECT * FROM labels WHERE org_id = ? ORDER BY sort_order').all(orgId)
  const automationRules = db.prepare('SELECT * FROM automation_rules WHERE org_id = ? ORDER BY priority').all(orgId)
  const screens = db.prepare(
    'SELECT id, name, token, campus_id, share_code, mirror_screen_id, description, layout FROM screens WHERE org_id = ?'
  ).all(orgId)
  const templates = db.prepare('SELECT * FROM templates WHERE org_id = ?').all(orgId)
  const schedules = db.prepare(
    'SELECT id, service_type_id, cron_expr, enabled, screen_ids FROM schedules WHERE service_type_id IN (SELECT id FROM service_types WHERE campus_id IN (SELECT id FROM campuses WHERE org_id = ?))'
  ).all(orgId)
  const manualAssignments = db.prepare(
    'SELECT * FROM manual_assignments WHERE service_type_id IN (SELECT id FROM service_types WHERE campus_id IN (SELECT id FROM campuses WHERE org_id = ?))'
  ).all(orgId)
  const positionTypes = db.prepare('SELECT * FROM position_types WHERE org_id = ?').all(orgId)

  const { access_code, ...orgPublic } = org
  res.json({
    backup_version: 2,
    exported_at: new Date().toISOString(),
    organization: orgPublic,
    campuses,
    service_types: serviceTypes,
    people,
    labels,
    automation_rules: automationRules,
    screens,
    templates,
    schedules,
    manual_assignments: manualAssignments,
    position_types: positionTypes,
  })
})

// POST /api/org/import — restore from backup JSON (replaces all org data)
router.post('/import', express.json({ limit: '20mb' }), (req, res) => {
  const backup = req.body
  if (!backup || !backup.organization) {
    return res.status(400).json({ error: 'Invalid backup file' })
  }

  const orgId = req.session.orgId

  try {
    db.exec('BEGIN')

    // Update org profile (keep existing access_code and slug)
    const o = backup.organization
    db.prepare(`
      UPDATE organizations SET name = ?, short_name = ?, timezone = ?,
        address_street = ?, address_city = ?, address_state = ?, address_zip = ?,
        logo_url = ?
      WHERE id = ?
    `).run(
      o.name || 'My Church', o.short_name || null, o.timezone || 'America/Chicago',
      o.address_street || null, o.address_city || null, o.address_state || null, o.address_zip || null,
      o.logo_url || null, orgId
    )

    // Clear existing data in dependency order
    db.prepare('DELETE FROM active_assignments WHERE screen_id IN (SELECT id FROM screens WHERE org_id = ?)').run(orgId)
    db.prepare(`DELETE FROM schedules WHERE service_type_id IN (
      SELECT id FROM service_types WHERE campus_id IN (SELECT id FROM campuses WHERE org_id = ?)
    )`).run(orgId)
    db.prepare(`DELETE FROM manual_assignments WHERE service_type_id IN (
      SELECT id FROM service_types WHERE campus_id IN (SELECT id FROM campuses WHERE org_id = ?)
    )`).run(orgId)
    db.prepare('DELETE FROM automation_rules WHERE org_id = ?').run(orgId)
    db.prepare('DELETE FROM templates WHERE org_id = ?').run(orgId)
    db.prepare('DELETE FROM screens WHERE org_id = ?').run(orgId)
    db.prepare('DELETE FROM people WHERE org_id = ?').run(orgId)
    db.prepare('DELETE FROM labels WHERE org_id = ?').run(orgId)
    db.prepare('DELETE FROM position_types WHERE org_id = ?').run(orgId)
    db.prepare(`DELETE FROM service_types WHERE campus_id IN (
      SELECT id FROM campuses WHERE org_id = ?
    )`).run(orgId)
    db.prepare('DELETE FROM campuses WHERE org_id = ?').run(orgId)

    // Build ID maps as we insert each table
    const campusMap = {}
    for (const c of (backup.campuses || [])) {
      const r = db.prepare('INSERT INTO campuses (org_id, name, description) VALUES (?, ?, ?)').run(orgId, c.name, c.description || null)
      campusMap[c.id] = r.lastInsertRowid
    }

    const serviceTypeMap = {}
    for (const st of (backup.service_types || [])) {
      const r = db.prepare('INSERT INTO service_types (campus_id, name, pco_service_type_id, mode) VALUES (?, ?, ?, ?)').run(
        campusMap[st.campus_id] || null, st.name, st.pco_service_type_id || null, st.mode || 'manual'
      )
      serviceTypeMap[st.id] = r.lastInsertRowid
    }

    const personMap = {}
    for (const p of (backup.people || [])) {
      const r = db.prepare(`
        INSERT INTO people (org_id, name, pco_person_id, photo_url, photo_url_portrait,
          photo_override, photo_override_portrait, name_override,
          email, email_override, category, category_override, position, position_override)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(orgId, p.name, p.pco_person_id || null, p.photo_url || null, p.photo_url_portrait || null,
        p.photo_override || null, p.photo_override_portrait || null, p.name_override || null,
        p.email || null, p.email_override || null, p.category || null, p.category_override || null,
        p.position || null, p.position_override || null)
      personMap[p.id] = r.lastInsertRowid
    }

    const labelMap = {}
    for (const l of (backup.labels || [])) {
      const r = db.prepare('INSERT INTO labels (org_id, name, type, group_name, sort_order) VALUES (?, ?, ?, ?, ?)').run(
        orgId, l.name, l.type, l.group_name || null, l.sort_order || 0
      )
      labelMap[l.id] = r.lastInsertRowid
    }

    for (const pt of (backup.position_types || [])) {
      db.prepare('INSERT INTO position_types (org_id, name, sort_order) VALUES (?, ?, ?)').run(orgId, pt.name, pt.sort_order || 0)
    }

    const templateMap = {}
    for (const t of (backup.templates || [])) {
      let config = t.config
      if (config) {
        try {
          const parsed = typeof config === 'string' ? JSON.parse(config) : config
          if (parsed.slots) {
            for (const slot of Object.values(parsed.slots)) {
              if (slot.labelId != null && labelMap[slot.labelId]) slot.labelId = labelMap[slot.labelId]
            }
          }
          config = JSON.stringify(parsed)
        } catch (_) { /* leave config unchanged */ }
      }
      const r = db.prepare('INSERT INTO templates (org_id, name, description, config) VALUES (?, ?, ?, ?)').run(
        orgId, t.name, t.description || null, config || null
      )
      templateMap[t.id] = r.lastInsertRowid
    }

    const screenMap = {}
    for (const s of (backup.screens || [])) {
      let layout = s.layout || 'grid-standard'
      if (layout.startsWith('template:')) {
        const oldTid = parseInt(layout.split(':')[1])
        layout = templateMap[oldTid] ? `template:${templateMap[oldTid]}` : 'grid-standard'
      }
      const r = db.prepare(`
        INSERT INTO screens (org_id, name, token, campus_id, share_code, description, layout)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(orgId, s.name, s.token, campusMap[s.campus_id] || null, s.share_code || null, s.description || null, layout)
      screenMap[s.id] = r.lastInsertRowid
    }

    // Second pass to wire up mirror relationships
    for (const s of (backup.screens || [])) {
      if (s.mirror_screen_id && screenMap[s.mirror_screen_id] && screenMap[s.id]) {
        db.prepare('UPDATE screens SET mirror_screen_id = ? WHERE id = ?').run(screenMap[s.mirror_screen_id], screenMap[s.id])
      }
    }

    for (const rule of (backup.automation_rules || [])) {
      let actionValue = rule.action_value
      if ((rule.action_type === 'mic' || rule.action_type === 'iem') &&
          actionValue && !actionValue.startsWith('next_available')) {
        const oldId = parseInt(actionValue)
        if (!isNaN(oldId) && labelMap[oldId]) actionValue = String(labelMap[oldId])
      }
      db.prepare(`
        INSERT INTO automation_rules (org_id, priority, condition_field, condition_op, condition_value, action_type, action_value)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(orgId, rule.priority, rule.condition_field, rule.condition_op, rule.condition_value, rule.action_type, actionValue)
    }

    for (const sched of (backup.schedules || [])) {
      const newStId = serviceTypeMap[sched.service_type_id]
      if (!newStId) continue
      let screenIds = '[]'
      try {
        const oldIds = typeof sched.screen_ids === 'string' ? JSON.parse(sched.screen_ids) : (sched.screen_ids || [])
        screenIds = JSON.stringify(oldIds.map(id => screenMap[id]).filter(Boolean))
      } catch (_) {}
      db.prepare('INSERT INTO schedules (service_type_id, cron_expr, enabled, screen_ids) VALUES (?, ?, ?, ?)').run(
        newStId, sched.cron_expr, sched.enabled ?? 1, screenIds
      )
    }

    for (const ma of (backup.manual_assignments || [])) {
      const newStId = serviceTypeMap[ma.service_type_id]
      const newPersonId = personMap[ma.person_id]
      if (!newStId || !newPersonId) continue
      db.prepare('INSERT INTO manual_assignments (service_type_id, person_id, slot, position) VALUES (?, ?, ?, ?)').run(
        newStId, newPersonId, ma.slot || 0, ma.position || null
      )
    }

    db.exec('COMMIT')

    res.json({
      ok: true,
      counts: {
        campuses:           (backup.campuses || []).length,
        service_types:      (backup.service_types || []).length,
        people:             (backup.people || []).length,
        labels:             (backup.labels || []).length,
        templates:          (backup.templates || []).length,
        screens:            (backup.screens || []).length,
        automation_rules:   (backup.automation_rules || []).length,
        schedules:          (backup.schedules || []).length,
        manual_assignments: (backup.manual_assignments || []).length,
        position_types:     (backup.position_types || []).length,
      }
    })
  } catch (err) {
    try { db.exec('ROLLBACK') } catch (_) {}
    console.error('[import]', err)
    res.status(500).json({ error: err.message || 'Import failed' })
  }
})

// POST /api/org/regenerate-code — generate a new access_code
router.post('/regenerate-code', (req, res) => {
  const newCode = generateAccessCode()
  db.prepare('UPDATE organizations SET access_code = ? WHERE id = ?').run(newCode, req.session.orgId)
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.session.orgId)
  res.json(org)
})

module.exports = router
