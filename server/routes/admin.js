const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')
const { randomBytes } = require('node:crypto')
const path = require('path')
const fs = require('fs')
const multer = require('multer')
const db = require('../db')
const { requireAuth, requireAdmin } = require('../middleware/auth')
const { sendInviteEmail } = require('../utils/mailer')

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'photos')

const photoUpload = multer({
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    cb(null, file.mimetype.startsWith('image/'))
  },
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      const ext = file.mimetype === 'image/webp' ? '.webp'
                : file.mimetype === 'image/png'  ? '.png'
                : '.jpg'
      cb(null, `${randomBytes(12).toString('hex')}${ext}`)
    },
  }),
})

router.use(requireAuth)

// --- Users (admin only) ---
router.get('/users', requireAdmin, (req, res) => {
  const orgId = req.session.orgId
  res.json(db.prepare('SELECT id, name, email, role, created_at FROM users WHERE org_id = ? ORDER BY created_at').all(orgId))
})

router.put('/users/:id/role', requireAdmin, (req, res) => {
  const orgId = req.session.orgId
  const { role } = req.body
  if (!['admin', 'team_member'].includes(role)) {
    return res.status(400).json({ error: 'role must be admin or team_member' })
  }
  const userId = parseInt(req.params.id)
  if (userId === req.session.userId && role !== 'admin') {
    return res.status(400).json({ error: 'Cannot remove your own admin role' })
  }
  if (role !== 'admin') {
    const adminCount = db.prepare("SELECT COUNT(*) as n FROM users WHERE role = 'admin' AND org_id = ?").get(orgId)
    const target = db.prepare('SELECT role FROM users WHERE id = ? AND org_id = ?').get(userId, orgId)
    if (target?.role === 'admin' && adminCount.n <= 1) {
      return res.status(400).json({ error: 'Cannot remove the last admin account' })
    }
  }
  db.prepare('UPDATE users SET role = ? WHERE id = ? AND org_id = ?').run(role, userId, orgId)
  res.json(db.prepare('SELECT id, name, email, role, created_at FROM users WHERE id = ? AND org_id = ?').get(userId, orgId))
})

router.delete('/users/:id', requireAdmin, (req, res) => {
  const orgId = req.session.orgId
  const userId = parseInt(req.params.id)
  if (userId === req.session.userId) {
    return res.status(400).json({ error: 'Cannot delete your own account' })
  }
  const adminCount = db.prepare("SELECT COUNT(*) as n FROM users WHERE role = 'admin' AND org_id = ?").get(orgId)
  const target = db.prepare('SELECT role FROM users WHERE id = ? AND org_id = ?').get(userId, orgId)
  if (target?.role === 'admin' && adminCount.n <= 1) {
    return res.status(400).json({ error: 'Cannot delete the last admin account' })
  }
  db.prepare('DELETE FROM users WHERE id = ? AND org_id = ?').run(userId, orgId)
  res.json({ ok: true })
})

// --- Invite tokens (admin only) ---
router.post('/users/invite', requireAdmin, async (req, res) => {
  const orgId = req.session.orgId
  const { email, role = 'team_member' } = req.body
  if (!email) return res.status(400).json({ error: 'email is required' })
  if (!['admin', 'team_member'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' })
  }

  // Check if user with this email already exists in org
  const existing = db.prepare('SELECT id FROM users WHERE email = ? AND org_id = ?').get(email.toLowerCase(), orgId)
  if (existing) return res.status(409).json({ error: 'A user with that email already exists' })

  const token = randomBytes(24).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  db.prepare(
    'INSERT INTO invite_tokens (org_id, token, role, email, expires_at) VALUES (?, ?, ?, ?, ?)'
  ).run(orgId, token, role, email.toLowerCase(), expiresAt)

  const org = db.prepare('SELECT name FROM organizations WHERE id = ?').get(orgId)
  const origin = req.headers.origin || `http://localhost:${process.env.PORT || 3001}`
  const inviteUrl = `${origin}/register?invite=${token}`

  try {
    const result = await sendInviteEmail({ to: email, orgName: org.name, role, inviteUrl })
    res.json({ token, expiresAt, email, sent: result.sent, link: result.sent ? undefined : inviteUrl })
  } catch (err) {
    res.json({ token, expiresAt, email, sent: false, link: inviteUrl, error: err.message })
  }
})

router.get('/users/invites', requireAdmin, (req, res) => {
  const orgId = req.session.orgId
  res.json(db.prepare(
    `SELECT * FROM invite_tokens WHERE org_id = ? AND used = 0 AND expires_at > datetime('now') ORDER BY created_at DESC`
  ).all(orgId))
})

router.delete('/users/invites/:id', requireAdmin, (req, res) => {
  const orgId = req.session.orgId
  db.prepare('DELETE FROM invite_tokens WHERE id = ? AND org_id = ?').run(req.params.id, orgId)
  res.json({ ok: true })
})

// --- Campuses ---
const CAMPUS_ONE = `
  SELECT c.*,
    (SELECT COUNT(*) FROM screens       WHERE campus_id = c.id) AS screen_count,
    (SELECT COUNT(*) FROM service_types WHERE campus_id = c.id) AS service_type_count
  FROM campuses c WHERE c.id = ? AND c.org_id = ?
`
router.get('/campuses', (req, res) => {
  const orgId = req.session.orgId
  res.json(db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM screens       WHERE campus_id = c.id) AS screen_count,
      (SELECT COUNT(*) FROM service_types WHERE campus_id = c.id) AS service_type_count
    FROM campuses c WHERE c.org_id = ? ORDER BY c.name
  `).all(orgId))
})
router.post('/campuses', (req, res) => {
  const orgId = req.session.orgId
  const { name, description } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  const r = db.prepare('INSERT INTO campuses (org_id, name, description) VALUES (?, ?, ?)').run(orgId, name, description ?? null)
  res.json(db.prepare(CAMPUS_ONE).get(r.lastInsertRowid, orgId))
})
router.put('/campuses/:id', (req, res) => {
  const orgId = req.session.orgId
  const { name, description } = req.body
  db.prepare('UPDATE campuses SET name = ?, description = ? WHERE id = ? AND org_id = ?').run(name, description ?? null, req.params.id, orgId)
  res.json(db.prepare(CAMPUS_ONE).get(req.params.id, orgId))
})
router.delete('/campuses/:id', (req, res) => {
  const orgId = req.session.orgId
  db.prepare('DELETE FROM campuses WHERE id = ? AND org_id = ?').run(req.params.id, orgId)
  res.json({ ok: true })
})

// --- Service Types ---
router.get('/service-types', (req, res) => {
  const orgId = req.session.orgId
  const { campus_id } = req.query
  if (campus_id) {
    res.json(db.prepare(
      'SELECT * FROM service_types WHERE campus_id = ? AND campus_id IN (SELECT id FROM campuses WHERE org_id = ?) ORDER BY name'
    ).all(campus_id, orgId))
  } else {
    res.json(db.prepare(
      'SELECT * FROM service_types WHERE campus_id IN (SELECT id FROM campuses WHERE org_id = ?) ORDER BY name'
    ).all(orgId))
  }
})
router.post('/service-types', (req, res) => {
  const orgId = req.session.orgId
  const { name, campus_id, pco_service_type_id, mode } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  if (campus_id) {
    const campus = db.prepare('SELECT id FROM campuses WHERE id = ? AND org_id = ?').get(campus_id, orgId)
    if (!campus) return res.status(400).json({ error: 'Invalid campus' })
  }
  const r = db.prepare('INSERT INTO service_types (name, campus_id, pco_service_type_id, mode) VALUES (?, ?, ?, ?)').run(name, campus_id ?? null, pco_service_type_id ?? null, mode ?? 'pco')
  res.json(db.prepare('SELECT * FROM service_types WHERE id = ?').get(r.lastInsertRowid))
})
router.put('/service-types/:id', (req, res) => {
  const orgId = req.session.orgId
  const { name, campus_id, pco_service_type_id, mode } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  if (campus_id) {
    const campus = db.prepare('SELECT id FROM campuses WHERE id = ? AND org_id = ?').get(campus_id, orgId)
    if (!campus) return res.status(400).json({ error: 'Invalid campus' })
  }
  db.prepare('UPDATE service_types SET name = ?, campus_id = ?, pco_service_type_id = ?, mode = ? WHERE id = ?').run(name, campus_id ?? null, pco_service_type_id ?? null, mode ?? 'pco', req.params.id)
  res.json(db.prepare('SELECT * FROM service_types WHERE id = ?').get(req.params.id))
})
router.delete('/service-types/:id', (req, res) => {
  db.prepare('DELETE FROM service_types WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// --- Manual assignments ---
const MANUAL_JOIN = `
  SELECT ma.*,
         COALESCE(p.name_override, p.name) AS person_name,
         COALESCE(p.photo_override, p.photo_url) AS person_photo
  FROM manual_assignments ma
  LEFT JOIN people p ON ma.person_id = p.id
`
router.get('/service-types/:id/manual-assignments', requireAuth, (req, res) => {
  res.json(db.prepare(MANUAL_JOIN + 'WHERE ma.service_type_id = ? ORDER BY ma.slot').all(req.params.id))
})
router.post('/service-types/:id/manual-assignments', requireAuth, (req, res) => {
  const { person_id, position } = req.body
  const maxRow = db.prepare('SELECT MAX(slot) AS m FROM manual_assignments WHERE service_type_id = ?').get(req.params.id)
  const slot = (maxRow?.m ?? -1) + 1
  const r = db.prepare(
    'INSERT INTO manual_assignments (service_type_id, person_id, slot, position) VALUES (?, ?, ?, ?)'
  ).run(req.params.id, person_id ?? null, slot, position ?? null)
  res.json(db.prepare(MANUAL_JOIN + 'WHERE ma.id = ?').get(r.lastInsertRowid))
})
router.put('/service-types/:id/manual-assignments/:aid', requireAuth, (req, res) => {
  const { position, slot } = req.body
  db.prepare(
    'UPDATE manual_assignments SET position = ?, slot = ? WHERE id = ? AND service_type_id = ?'
  ).run(position ?? null, slot, req.params.aid, req.params.id)
  res.json({ ok: true })
})
router.delete('/service-types/:id/manual-assignments/:aid', requireAuth, (req, res) => {
  db.prepare('DELETE FROM manual_assignments WHERE id = ? AND service_type_id = ?').run(req.params.aid, req.params.id)
  res.json({ ok: true })
})

// --- Position types ---
router.get('/position-types', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM position_types WHERE org_id = ? ORDER BY sort_order, name').all(req.session.orgId))
})
router.post('/position-types', requireAuth, (req, res) => {
  const { name } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'name required' })
  const maxRow = db.prepare('SELECT MAX(sort_order) AS m FROM position_types WHERE org_id = ?').get(req.session.orgId)
  const sort_order = (maxRow?.m ?? -1) + 1
  const r = db.prepare('INSERT INTO position_types (org_id, name, sort_order) VALUES (?, ?, ?)').run(req.session.orgId, name.trim(), sort_order)
  res.json(db.prepare('SELECT * FROM position_types WHERE id = ?').get(r.lastInsertRowid))
})
router.put('/position-types/:id', requireAuth, (req, res) => {
  const { name } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'name required' })
  db.prepare('UPDATE position_types SET name = ? WHERE id = ? AND org_id = ?').run(name.trim(), req.params.id, req.session.orgId)
  res.json(db.prepare('SELECT * FROM position_types WHERE id = ?').get(req.params.id))
})
router.delete('/position-types/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM position_types WHERE id = ? AND org_id = ?').run(req.params.id, req.session.orgId)
  res.json({ ok: true })
})

// --- Photo upload ---
router.post('/photos/upload', photoUpload.fields([
  { name: 'square',   maxCount: 1 },
  { name: 'portrait', maxCount: 1 },
]), (req, res) => {
  const sq = req.files?.square?.[0]
  const pt = req.files?.portrait?.[0]
  if (!sq || !pt) return res.status(400).json({ error: 'Both square and portrait files are required' })
  res.json({
    square:   `/uploads/photos/${sq.filename}`,
    portrait: `/uploads/photos/${pt.filename}`,
  })
})

// Delete an uploaded photo file (cleanup when replacing)
router.delete('/photos/file', (req, res) => {
  const { url } = req.body
  if (!url || !url.startsWith('/uploads/photos/')) return res.json({ ok: true })
  const filename = path.basename(url)
  const filepath = path.join(UPLOADS_DIR, filename)
  fs.unlink(filepath, () => res.json({ ok: true }))
})

// --- People ---
router.get('/people', (req, res) => {
  const orgId = req.session.orgId
  res.json(db.prepare('SELECT * FROM people WHERE org_id = ? ORDER BY name').all(orgId))
})
function serializeCategory(cat) {
  if (!cat) return JSON.stringify(['Other'])
  if (Array.isArray(cat)) return JSON.stringify(cat.length ? cat : ['Other'])
  if (typeof cat === 'string' && cat.startsWith('[')) return cat
  return JSON.stringify([cat])
}

router.post('/people', (req, res) => {
  const orgId = req.session.orgId
  const { name, pco_person_id, photo_url, photo_url_portrait, category, email, position } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  const r = db.prepare(
    'INSERT INTO people (org_id, name, pco_person_id, photo_url, photo_url_portrait, category, email, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(orgId, name, pco_person_id ?? null, photo_url ?? null, photo_url_portrait ?? null, serializeCategory(category), email ?? null, position ?? null)
  res.json(db.prepare('SELECT * FROM people WHERE id = ?').get(r.lastInsertRowid))
})
router.put('/people/:id', (req, res) => {
  const orgId = req.session.orgId
  const { name, photo_url, photo_url_portrait, category, email, pco_person_id, position } = req.body
  const existing = db.prepare('SELECT * FROM people WHERE id = ? AND org_id = ?').get(req.params.id, orgId)
  if (!existing) return res.status(404).json({ error: 'Person not found' })

  if (existing.pco_person_id) {
    db.prepare(
      'UPDATE people SET name_override = ?, photo_override = ?, photo_override_portrait = ?, email_override = ?, category_override = ?, position_override = ? WHERE id = ? AND org_id = ?'
    ).run(name ?? null, photo_url ?? null, photo_url_portrait ?? null, email ?? null, serializeCategory(category), position ?? null, req.params.id, orgId)
  } else {
    db.prepare(
      'UPDATE people SET name = ?, photo_url = ?, photo_url_portrait = ?, category = ?, email = ?, pco_person_id = ?, position = ? WHERE id = ? AND org_id = ?'
    ).run(name, photo_url ?? null, photo_url_portrait ?? null, serializeCategory(category), email ?? null, pco_person_id ?? null, position ?? null, req.params.id, orgId)
  }

  res.json(db.prepare('SELECT * FROM people WHERE id = ?').get(req.params.id))
})
router.delete('/people/:id', (req, res) => {
  const orgId = req.session.orgId
  const existing = db.prepare('SELECT * FROM people WHERE id = ? AND org_id = ?').get(req.params.id, orgId)
  if (!existing) return res.status(404).json({ error: 'Person not found' })
  if (existing.pco_person_id) {
    return res.status(400).json({ error: 'Cannot delete a person synced from Planning Center' })
  }
  db.prepare('DELETE FROM people WHERE id = ? AND org_id = ?').run(req.params.id, orgId)
  res.json({ ok: true })
})

// --- Labels ---
router.get('/labels', (req, res) => {
  const orgId = req.session.orgId
  res.json(db.prepare('SELECT * FROM labels WHERE org_id = ? ORDER BY type, sort_order, name').all(orgId))
})
router.post('/labels', (req, res) => {
  const orgId = req.session.orgId
  const { name, type, group_name, sort_order } = req.body
  if (!name || !type) return res.status(400).json({ error: 'name and type required' })
  const r = db.prepare('INSERT INTO labels (org_id, name, type, group_name, sort_order) VALUES (?, ?, ?, ?, ?)').run(orgId, name, type, group_name ?? null, sort_order ?? 0)
  res.json(db.prepare('SELECT * FROM labels WHERE id = ?').get(r.lastInsertRowid))
})
router.put('/labels/reorder', (req, res) => {
  const { ids } = req.body
  const update = db.prepare('UPDATE labels SET sort_order = ? WHERE id = ?')
  db.transaction(() => ids.forEach((id, i) => update.run(i, id)))()
  res.json({ ok: true })
})
router.put('/labels/:id', (req, res) => {
  const orgId = req.session.orgId
  const { name, type, group_name, sort_order } = req.body
  db.prepare('UPDATE labels SET name = ?, type = ?, group_name = ?, sort_order = ? WHERE id = ? AND org_id = ?').run(name, type, group_name ?? null, sort_order ?? 0, req.params.id, orgId)
  res.json(db.prepare('SELECT * FROM labels WHERE id = ?').get(req.params.id))
})
router.delete('/labels/:id', (req, res) => {
  const orgId = req.session.orgId
  db.prepare('DELETE FROM labels WHERE id = ? AND org_id = ?').run(req.params.id, orgId)
  res.json({ ok: true })
})

// --- Automation Rules ---
router.get('/automation-rules', (req, res) => {
  const orgId = req.session.orgId
  res.json(db.prepare('SELECT * FROM automation_rules WHERE org_id = ? ORDER BY priority').all(orgId))
})
router.post('/automation-rules', (req, res) => {
  const orgId = req.session.orgId
  const { priority, condition_field, condition_op, condition_value, action_type, action_value } = req.body
  const r = db.prepare('INSERT INTO automation_rules (org_id, priority, condition_field, condition_op, condition_value, action_type, action_value) VALUES (?, ?, ?, ?, ?, ?, ?)').run(orgId, priority, condition_field, condition_op, condition_value, action_type, action_value)
  res.json(db.prepare('SELECT * FROM automation_rules WHERE id = ?').get(r.lastInsertRowid))
})
router.put('/automation-rules/reorder', (req, res) => {
  const orgId = req.session.orgId
  const { ids } = req.body
  const update = db.prepare('UPDATE automation_rules SET priority = ? WHERE id = ? AND org_id = ?')
  ids.forEach((id, i) => update.run(i, id, orgId))
  res.json({ ok: true })
})
router.put('/automation-rules/:id', (req, res) => {
  const orgId = req.session.orgId
  const { priority, condition_field, condition_op, condition_value, action_type, action_value } = req.body
  db.prepare('UPDATE automation_rules SET priority=?, condition_field=?, condition_op=?, condition_value=?, action_type=?, action_value=? WHERE id=? AND org_id=?').run(priority, condition_field, condition_op, condition_value, action_type, action_value, req.params.id, orgId)
  res.json(db.prepare('SELECT * FROM automation_rules WHERE id = ?').get(req.params.id))
})
router.delete('/automation-rules/:id', (req, res) => {
  const orgId = req.session.orgId
  db.prepare('DELETE FROM automation_rules WHERE id = ? AND org_id = ?').run(req.params.id, orgId)
  res.json({ ok: true })
})

function resolveLabel(actionValue, type, labels, usedIds) {
  if (actionValue === 'next_available' || actionValue.startsWith('next_available:')) {
    const groupName = actionValue.startsWith('next_available:')
      ? actionValue.slice('next_available:'.length)
      : null
    const candidates = labels.filter(l => {
      if (l.type !== type) return false
      if (groupName && l.group_name !== groupName) return false
      return true
    })
    const label = candidates.find(l => !usedIds.has(l.id))
    if (label) {
      usedIds.add(label.id)
      return label
    }
    return null
  }
  // specific label id
  const label = labels.find(l => l.id === Number(actionValue) && l.type === type)
  return label ?? null
}

router.post('/run-automation', (req, res) => {
  const orgId = req.session.orgId

  const rules = db.prepare(
    'SELECT * FROM automation_rules WHERE org_id = ? ORDER BY priority'
  ).all(orgId)

  const labels = db.prepare(
    'SELECT * FROM labels WHERE org_id = ? ORDER BY type, sort_order'
  ).all(orgId)

  const screens = db.prepare(
    'SELECT * FROM screens WHERE org_id = ?'
  ).all(orgId)

  const updateAssignment = db.prepare(
    'UPDATE active_assignments SET mic_label = ?, iem_label = ? WHERE id = ?'
  )

  let totalCount = 0

  for (const screen of screens) {
    const assignments = db.prepare(
      'SELECT * FROM active_assignments WHERE screen_id = ? ORDER BY slot'
    ).all(screen.id)

    const usedMicIds = new Set()
    const usedIemIds = new Set()

    for (const assignment of assignments) {
      let mic = null
      let iem = null

      for (const rule of rules) {
        if (mic && iem) break

        const fieldValue = rule.condition_field === 'name'
          ? (assignment.person_name ?? '')
          : (assignment.position ?? '')

        const conditionValue = rule.condition_value ?? ''
        let matches = false
        if (rule.condition_op === 'is') {
          matches = fieldValue.toLowerCase() === conditionValue.toLowerCase()
        } else if (rule.condition_op === 'contains') {
          matches = fieldValue.toLowerCase().includes(conditionValue.toLowerCase())
        }

        if (!matches) continue

        if (rule.action_type === 'mic' && !mic) {
          mic = resolveLabel(rule.action_value, 'mic', labels, usedMicIds)
        } else if (rule.action_type === 'iem' && !iem) {
          iem = resolveLabel(rule.action_value, 'iem', labels, usedIemIds)
        }
      }

      updateAssignment.run(mic?.name ?? null, iem?.name ?? null, assignment.id)
      totalCount++
    }
  }

  res.json({ ok: true, updated: totalCount })
})

// --- Dashboard ---
router.get('/dashboard', (req, res) => {
  const orgId = req.session.orgId
  const screens = db.prepare(`${SCREENS_SELECT} WHERE s.org_id = ? ORDER BY s.name`).all(orgId)

  const screensWithData = screens.map(screen => {
    const sourceId = screen.mirror_screen_id ?? screen.id
    const assignments = db.prepare(
      'SELECT * FROM active_assignments WHERE screen_id = ? ORDER BY slot'
    ).all(sourceId)
    const first = assignments[0]
    return {
      id: screen.id,
      name: screen.name,
      token: screen.token,
      campus_name: screen.campus_name ?? null,
      is_active: !!screen.is_active,
      event_name: first?.event_name ?? null,
      event_date: first?.event_date ?? null,
      updated_at: first?.updated_at ?? null,
      musicians: assignments.map(a => ({
        id: a.id,
        name: a.person_name,
        position: a.position,
        photo: a.person_photo,
        mic: a.mic_label,
        iem: a.iem_label,
        slot: a.slot,
      })),
    }
  })

  const peopleCount = db.prepare('SELECT COUNT(*) as n FROM people WHERE org_id = ?').get(orgId)?.n ?? 0
  const pcoPeopleCount = db.prepare("SELECT COUNT(*) as n FROM people WHERE org_id = ? AND pco_person_id IS NOT NULL AND pco_person_id != ''").get(orgId)?.n ?? 0
  const peoplePreview = db.prepare(
    'SELECT id, name, position, photo_url, photo_override FROM people WHERE org_id = ? ORDER BY name LIMIT 6'
  ).all(orgId)

  const labelsAll = db.prepare('SELECT id, name, type, group_name FROM labels WHERE org_id = ? ORDER BY type, sort_order, name').all(orgId)
  const micLabelCount = labelsAll.filter(l => l.type === 'mic').length
  const iemLabelCount = labelsAll.filter(l => l.type === 'iem').length
  const positionTypes = db.prepare('SELECT id, name FROM position_types WHERE org_id = ? ORDER BY sort_order, name').all(orgId)

  // Preview: up to 2 mic, 2 IEM, 2 positions
  const previewItems = [
    ...labelsAll.filter(l => l.type === 'mic').slice(0, 2),
    ...labelsAll.filter(l => l.type === 'iem').slice(0, 2),
    ...positionTypes.slice(0, 2).map(p => ({ ...p, type: 'position' })),
  ]

  res.json({
    screens: screensWithData,
    people: { count: peopleCount, pcoCount: pcoPeopleCount, preview: peoplePreview },
    labels: {
      count: labelsAll.length,
      micCount: micLabelCount,
      iemCount: iemLabelCount,
      positionCount: positionTypes.length,
      items: previewItems,
      total: labelsAll.length + positionTypes.length,
    },
  })
})

router.patch('/assignments/:id', (req, res) => {
  const orgId = req.session.orgId
  const { mic_label, iem_label } = req.body
  const assignment = db.prepare(`
    SELECT aa.* FROM active_assignments aa
    JOIN screens s ON aa.screen_id = s.id
    WHERE aa.id = ? AND s.org_id = ?
  `).get(req.params.id, orgId)
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' })
  db.prepare('UPDATE active_assignments SET mic_label = ?, iem_label = ? WHERE id = ?').run(
    mic_label !== undefined ? (mic_label || null) : assignment.mic_label,
    iem_label !== undefined ? (iem_label || null) : assignment.iem_label,
    req.params.id
  )
  res.json({ ok: true })
})

// --- Screens ---
const SCREENS_SELECT = `
  SELECT s.*,
    c.name  AS campus_name,
    m.name  AS mirror_screen_name,
    m.token AS mirror_screen_token,
    CASE WHEN s.last_heartbeat > datetime('now', '-90 seconds') THEN 1 ELSE 0 END AS is_active
  FROM screens s
  LEFT JOIN campuses c ON s.campus_id = c.id
  LEFT JOIN screens  m ON s.mirror_screen_id = m.id
`
router.get('/screens', (req, res) => {
  const orgId = req.session.orgId
  res.json(db.prepare(`${SCREENS_SELECT} WHERE s.org_id = ? ORDER BY s.name`).all(orgId))
})
router.post('/screens', (req, res) => {
  const orgId = req.session.orgId
  const { name, campus_id, mirror_screen_id, description, layout } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  const token = uuidv4().replace(/-/g, '').slice(0, 12)
  const shareCode = Math.random().toString(36).slice(2, 8).toUpperCase()
  const r = db.prepare(
    'INSERT INTO screens (org_id, name, token, campus_id, share_code, mirror_screen_id, description, layout) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(orgId, name, token, campus_id ?? null, shareCode, mirror_screen_id ?? null, description ?? null, layout ?? 'grid-standard')
  res.json(db.prepare(`${SCREENS_SELECT} WHERE s.id = ?`).get(r.lastInsertRowid))
})
router.put('/screens/:id', (req, res) => {
  const orgId = req.session.orgId
  const { name, campus_id, mirror_screen_id, description, layout } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  db.prepare(
    'UPDATE screens SET name = ?, campus_id = ?, mirror_screen_id = ?, description = ?, layout = ? WHERE id = ? AND org_id = ?'
  ).run(name, campus_id ?? null, mirror_screen_id ?? null, description ?? null, layout ?? 'grid-standard', req.params.id, orgId)
  res.json(db.prepare(`${SCREENS_SELECT} WHERE s.id = ?`).get(req.params.id))
})
router.delete('/screens/:id', (req, res) => {
  const orgId = req.session.orgId
  db.prepare('DELETE FROM screens WHERE id = ? AND org_id = ?').run(req.params.id, orgId)
  res.json({ ok: true })
})

// --- Templates ---
router.get('/templates', (req, res) => {
  const orgId = req.session.orgId
  res.json(db.prepare('SELECT * FROM templates WHERE org_id = ? ORDER BY name').all(orgId))
})
router.post('/templates', (req, res) => {
  const orgId = req.session.orgId
  const { name, description, config } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  const r = db.prepare('INSERT INTO templates (org_id, name, description, config) VALUES (?, ?, ?, ?)').run(orgId, name, description ?? null, config ? JSON.stringify(config) : null)
  res.json(db.prepare('SELECT * FROM templates WHERE id = ?').get(r.lastInsertRowid))
})
router.put('/templates/:id', (req, res) => {
  const orgId = req.session.orgId
  const { name, description, config } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  db.prepare('UPDATE templates SET name = ?, description = ?, config = ? WHERE id = ? AND org_id = ?').run(name, description ?? null, config ? JSON.stringify(config) : null, req.params.id, orgId)
  res.json(db.prepare('SELECT * FROM templates WHERE id = ?').get(req.params.id))
})
router.delete('/templates/:id', (req, res) => {
  const orgId = req.session.orgId
  db.prepare('DELETE FROM templates WHERE id = ? AND org_id = ?').run(req.params.id, orgId)
  res.json({ ok: true })
})

// --- Schedules ---
router.get('/schedules', (req, res) => {
  const orgId = req.session.orgId
  res.json(db.prepare(`
    SELECT s.*, st.name as service_type_name
    FROM schedules s
    JOIN service_types st ON s.service_type_id = st.id
    WHERE st.campus_id IN (SELECT id FROM campuses WHERE org_id = ?)
    ORDER BY s.id
  `).all(orgId))
})
router.post('/schedules', (req, res) => {
  const { service_type_id, cron_expr, enabled, screen_ids } = req.body
  if (!service_type_id || !cron_expr) return res.status(400).json({ error: 'service_type_id and cron_expr required' })
  const screenIdsJson = Array.isArray(screen_ids) ? JSON.stringify(screen_ids) : (screen_ids ?? null)
  const r = db.prepare('INSERT INTO schedules (service_type_id, cron_expr, enabled, screen_ids) VALUES (?, ?, ?, ?)').run(service_type_id, cron_expr, enabled ?? 1, screenIdsJson)
  const schedule = db.prepare('SELECT s.*, st.name as service_type_name FROM schedules s LEFT JOIN service_types st ON s.service_type_id = st.id WHERE s.id = ?').get(r.lastInsertRowid)
  const { registerSchedule } = require('../scheduler')
  if (schedule.enabled) registerSchedule(schedule)
  res.json(schedule)
})
router.put('/schedules/:id', (req, res) => {
  const { cron_expr, enabled, screen_ids } = req.body
  const screenIdsJson = Array.isArray(screen_ids) ? JSON.stringify(screen_ids) : (screen_ids ?? null)
  db.prepare('UPDATE schedules SET cron_expr = ?, enabled = ?, screen_ids = ? WHERE id = ?').run(cron_expr, enabled, screenIdsJson, req.params.id)
  const schedule = db.prepare('SELECT s.*, st.name as service_type_name FROM schedules s LEFT JOIN service_types st ON s.service_type_id = st.id WHERE s.id = ?').get(req.params.id)
  const { registerSchedule, unregisterSchedule } = require('../scheduler')
  if (schedule.enabled) registerSchedule(schedule)
  else unregisterSchedule(schedule.id)
  res.json(schedule)
})
router.delete('/schedules/:id', (req, res) => {
  const { unregisterSchedule } = require('../scheduler')
  unregisterSchedule(parseInt(req.params.id))
  db.prepare('DELETE FROM schedules WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})
router.post('/schedules/:id/run', async (req, res) => {
  const { runSchedule } = require('../scheduler')
  await runSchedule(parseInt(req.params.id))
  res.json({ ok: true })
})

// --- Settings ---
router.get('/settings', (req, res) => {
  const rows = db.prepare('SELECT key, value FROM settings').all()
  res.json(Object.fromEntries(rows.map(r => [r.key, r.value])))
})
router.put('/settings/:key', (req, res) => {
  const { value } = req.body
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(req.params.key, value)
  res.json({ ok: true })
})

module.exports = router
