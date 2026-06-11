const express = require('express')
const router = express.Router()
const multer = require('multer')
const fs = require('fs')
const path = require('path')
const db = require('../db')
const { generateAccessCode } = require('../db')
const { requireAuth, requireAdmin } = require('../middleware/auth')
const { USE_CLOUDINARY, cloudinary, uploadToCloudinary, getCloudinaryPublicId } = require('../storage')

const LOGOS_DIR = path.join(__dirname, '../uploads/logos')
if (!USE_CLOUDINARY) fs.mkdirSync(LOGOS_DIR, { recursive: true })

const logoUpload = multer({
  limits: { fileSize: 5 * 1024 * 1024 },
  storage: USE_CLOUDINARY
    ? multer.memoryStorage()
    : multer.diskStorage({
        destination: LOGOS_DIR,
        filename: (req, file, cb) => cb(null, `org-${req.session.orgId}-${Date.now()}${path.extname(file.originalname)}`),
      }),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true)
    else cb(new Error('Image files only'))
  },
})

router.get('/', requireAuth, async (req, res) => {
  const org = await db.getOne('SELECT * FROM organizations WHERE id = ?', [req.session.orgId])
  if (!org) return res.status(404).json({ error: 'Organization not found' })
  res.json(org)
})

router.use(requireAdmin)

router.put('/', async (req, res) => {
  const { name, shortName, addressStreet, addressCity, addressState, addressZip, website, phone, timezone } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })
  await db.execute(
    'UPDATE organizations SET name = ?, short_name = ?, address_street = ?, address_city = ?, address_state = ?, address_zip = ?, website = ?, phone = ?, timezone = ? WHERE id = ?',
    [
      name.trim(),
      shortName?.trim() || null,
      addressStreet?.trim() || null,
      addressCity?.trim() || null,
      addressState?.trim() || null,
      addressZip?.trim() || null,
      website?.trim() || null,
      phone?.trim() || null,
      timezone || 'America/Chicago',
      req.session.orgId,
    ]
  )
  const org = await db.getOne('SELECT * FROM organizations WHERE id = ?', [req.session.orgId])
  res.json(org)
})

router.post('/logo', (req, res) => {
  logoUpload.single('logo')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message })
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    const org = await db.getOne('SELECT logo_url FROM organizations WHERE id = ?', [req.session.orgId])

    let logoUrl
    if (USE_CLOUDINARY) {
      if (org?.logo_url) {
        const publicId = getCloudinaryPublicId(org.logo_url)
        if (publicId) await cloudinary.uploader.destroy(publicId).catch(() => {})
      }
      const result = await uploadToCloudinary(req.file.buffer, { folder: 'beacon/logos', resource_type: 'image' })
      logoUrl = result.secure_url
    } else {
      if (org?.logo_url) {
        const oldPath = path.join(__dirname, '..', org.logo_url.replace(/^\//, ''))
        fs.unlink(oldPath, () => {})
      }
      logoUrl = `/uploads/logos/${req.file.filename}`
    }

    await db.execute('UPDATE organizations SET logo_url = ? WHERE id = ?', [logoUrl, req.session.orgId])
    res.json({ logo_url: logoUrl })
  })
})

router.delete('/logo', async (req, res) => {
  const org = await db.getOne('SELECT logo_url FROM organizations WHERE id = ?', [req.session.orgId])
  if (org?.logo_url) {
    if (USE_CLOUDINARY) {
      const publicId = getCloudinaryPublicId(org.logo_url)
      if (publicId) await cloudinary.uploader.destroy(publicId).catch(() => {})
    } else {
      const filePath = path.join(__dirname, '..', org.logo_url.replace(/^\//, ''))
      fs.unlink(filePath, () => {})
    }
    await db.execute('UPDATE organizations SET logo_url = NULL WHERE id = ?', [req.session.orgId])
  }
  res.json({ ok: true })
})

router.get('/export', async (req, res) => {
  const orgId = req.session.orgId
  const org = await db.getOne('SELECT * FROM organizations WHERE id = ?', [orgId])
  const campuses = await db.getAll('SELECT * FROM campuses WHERE org_id = ?', [orgId])
  const serviceTypes = await db.getAll(
    'SELECT * FROM service_types WHERE campus_id IN (SELECT id FROM campuses WHERE org_id = ?)',
    [orgId]
  )
  const people = await db.getAll('SELECT * FROM people WHERE org_id = ?', [orgId])
  const labels = await db.getAll('SELECT * FROM labels WHERE org_id = ? ORDER BY sort_order', [orgId])
  const automationRules = await db.getAll('SELECT * FROM automation_rules WHERE org_id = ? ORDER BY priority', [orgId])
  const screens = await db.getAll(
    'SELECT id, name, token, campus_id, share_code, mirror_screen_id, description, layout FROM screens WHERE org_id = ?',
    [orgId]
  )
  const templates = await db.getAll('SELECT * FROM templates WHERE org_id = ?', [orgId])
  const schedules = await db.getAll(
    'SELECT id, service_type_id, cron_expr, enabled, screen_ids FROM schedules WHERE service_type_id IN (SELECT id FROM service_types WHERE campus_id IN (SELECT id FROM campuses WHERE org_id = ?))',
    [orgId]
  )
  const manualAssignments = await db.getAll(
    'SELECT * FROM manual_assignments WHERE service_type_id IN (SELECT id FROM service_types WHERE campus_id IN (SELECT id FROM campuses WHERE org_id = ?))',
    [orgId]
  )
  const positionTypes = await db.getAll('SELECT * FROM position_types WHERE org_id = ?', [orgId])

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

router.post('/import', express.json({ limit: '20mb' }), async (req, res) => {
  const backup = req.body
  if (!backup || !backup.organization) {
    return res.status(400).json({ error: 'Invalid backup file' })
  }

  const orgId = req.session.orgId

  try {
    await db.withTransaction(async (tx) => {
      const o = backup.organization
      await tx.execute(`
        UPDATE organizations SET name = ?, short_name = ?, timezone = ?,
          address_street = ?, address_city = ?, address_state = ?, address_zip = ?,
          logo_url = ?
        WHERE id = ?
      `, [
        o.name || 'My Church', o.short_name || null, o.timezone || 'America/Chicago',
        o.address_street || null, o.address_city || null, o.address_state || null, o.address_zip || null,
        o.logo_url || null, orgId,
      ])

      await tx.execute('DELETE FROM active_assignments WHERE screen_id IN (SELECT id FROM screens WHERE org_id = ?)', [orgId])
      await tx.execute('DELETE FROM schedules WHERE service_type_id IN (SELECT id FROM service_types WHERE campus_id IN (SELECT id FROM campuses WHERE org_id = ?))', [orgId])
      await tx.execute('DELETE FROM manual_assignments WHERE service_type_id IN (SELECT id FROM service_types WHERE campus_id IN (SELECT id FROM campuses WHERE org_id = ?))', [orgId])
      await tx.execute('DELETE FROM automation_rules WHERE org_id = ?', [orgId])
      await tx.execute('DELETE FROM templates WHERE org_id = ?', [orgId])
      await tx.execute('DELETE FROM screens WHERE org_id = ?', [orgId])
      await tx.execute('DELETE FROM people WHERE org_id = ?', [orgId])
      await tx.execute('DELETE FROM labels WHERE org_id = ?', [orgId])
      await tx.execute('DELETE FROM position_types WHERE org_id = ?', [orgId])
      await tx.execute('DELETE FROM service_types WHERE campus_id IN (SELECT id FROM campuses WHERE org_id = ?)', [orgId])
      await tx.execute('DELETE FROM campuses WHERE org_id = ?', [orgId])

      const campusMap = {}
      for (const c of (backup.campuses || [])) {
        const r = await tx.execute(
          'INSERT INTO campuses (org_id, name, description) VALUES (?, ?, ?) RETURNING id',
          [orgId, c.name, c.description || null]
        )
        campusMap[c.id] = r.lastInsertId
      }

      const serviceTypeMap = {}
      for (const st of (backup.service_types || [])) {
        const r = await tx.execute(
          'INSERT INTO service_types (campus_id, name, pco_service_type_id, mode) VALUES (?, ?, ?, ?) RETURNING id',
          [campusMap[st.campus_id] || null, st.name, st.pco_service_type_id || null, st.mode || 'manual']
        )
        serviceTypeMap[st.id] = r.lastInsertId
      }

      const personMap = {}
      for (const p of (backup.people || [])) {
        const r = await tx.execute(`
          INSERT INTO people (org_id, name, pco_person_id, photo_url, photo_url_portrait,
            photo_override, photo_override_portrait, name_override,
            email, email_override, category, category_override, position, position_override)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id
        `, [
          orgId, p.name, p.pco_person_id || null, p.photo_url || null, p.photo_url_portrait || null,
          p.photo_override || null, p.photo_override_portrait || null, p.name_override || null,
          p.email || null, p.email_override || null, p.category || null, p.category_override || null,
          p.position || null, p.position_override || null,
        ])
        personMap[p.id] = r.lastInsertId
      }

      const labelMap = {}
      for (const l of (backup.labels || [])) {
        const r = await tx.execute(
          'INSERT INTO labels (org_id, name, type, group_name, sort_order) VALUES (?, ?, ?, ?, ?) RETURNING id',
          [orgId, l.name, l.type, l.group_name || null, l.sort_order || 0]
        )
        labelMap[l.id] = r.lastInsertId
      }

      for (const pt of (backup.position_types || [])) {
        await tx.execute(
          'INSERT INTO position_types (org_id, name, sort_order) VALUES (?, ?, ?)',
          [orgId, pt.name, pt.sort_order || 0]
        )
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
        const r = await tx.execute(
          'INSERT INTO templates (org_id, name, description, config) VALUES (?, ?, ?, ?) RETURNING id',
          [orgId, t.name, t.description || null, config || null]
        )
        templateMap[t.id] = r.lastInsertId
      }

      const screenMap = {}
      for (const s of (backup.screens || [])) {
        let layout = s.layout || 'grid-standard'
        if (layout.startsWith('template:')) {
          const oldTid = parseInt(layout.split(':')[1])
          layout = templateMap[oldTid] ? `template:${templateMap[oldTid]}` : 'grid-standard'
        }
        const r = await tx.execute(`
          INSERT INTO screens (org_id, name, token, campus_id, share_code, description, layout)
          VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id
        `, [orgId, s.name, s.token, campusMap[s.campus_id] || null, s.share_code || null, s.description || null, layout])
        screenMap[s.id] = r.lastInsertId
      }

      for (const s of (backup.screens || [])) {
        if (s.mirror_screen_id && screenMap[s.mirror_screen_id] && screenMap[s.id]) {
          await tx.execute(
            'UPDATE screens SET mirror_screen_id = ? WHERE id = ?',
            [screenMap[s.mirror_screen_id], screenMap[s.id]]
          )
        }
      }

      for (const rule of (backup.automation_rules || [])) {
        let actionValue = rule.action_value
        if ((rule.action_type === 'mic' || rule.action_type === 'iem') &&
            actionValue && !actionValue.startsWith('next_available')) {
          const oldId = parseInt(actionValue)
          if (!isNaN(oldId) && labelMap[oldId]) actionValue = String(labelMap[oldId])
        }
        await tx.execute(`
          INSERT INTO automation_rules (org_id, priority, condition_field, condition_op, condition_value, action_type, action_value)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [orgId, rule.priority, rule.condition_field, rule.condition_op, rule.condition_value, rule.action_type, actionValue])
      }

      for (const sched of (backup.schedules || [])) {
        const newStId = serviceTypeMap[sched.service_type_id]
        if (!newStId) continue
        let screenIds = '[]'
        try {
          const oldIds = typeof sched.screen_ids === 'string' ? JSON.parse(sched.screen_ids) : (sched.screen_ids || [])
          screenIds = JSON.stringify(oldIds.map(id => screenMap[id]).filter(Boolean))
        } catch (_) {}
        await tx.execute(
          'INSERT INTO schedules (service_type_id, cron_expr, enabled, screen_ids) VALUES (?, ?, ?, ?)',
          [newStId, sched.cron_expr, sched.enabled ?? 1, screenIds]
        )
      }

      for (const ma of (backup.manual_assignments || [])) {
        const newStId = serviceTypeMap[ma.service_type_id]
        const newPersonId = personMap[ma.person_id]
        if (!newStId || !newPersonId) continue
        await tx.execute(
          'INSERT INTO manual_assignments (service_type_id, person_id, slot, position) VALUES (?, ?, ?, ?)',
          [newStId, newPersonId, ma.slot || 0, ma.position || null]
        )
      }
    })

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
      },
    })
  } catch (err) {
    console.error('[import]', err)
    res.status(500).json({ error: err.message || 'Import failed' })
  }
})

router.post('/regenerate-code', async (req, res) => {
  const newCode = generateAccessCode()
  await db.execute('UPDATE organizations SET access_code = ? WHERE id = ?', [newCode, req.session.orgId])
  const org = await db.getOne('SELECT * FROM organizations WHERE id = ?', [req.session.orgId])
  res.json(org)
})

module.exports = router
