const express = require('express')
const router = express.Router()
const { v4: uuidv4 } = require('uuid')
const { randomBytes } = require('node:crypto')
const path = require('path')
const fs = require('fs')
const multer = require('multer')
const db = require('../db')
const { requireAuth, requireAdmin } = require('../middleware/auth')
const { sendInviteEmail, sendPasswordResetEmail } = require('../utils/mailer')

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'photos')
fs.mkdirSync(UPLOADS_DIR, { recursive: true })

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
router.get('/users', requireAdmin, async (req, res) => {
  const orgId = req.session.orgId
  res.json(await db.getAll(
    'SELECT id, name, email, role, created_at FROM users WHERE org_id = ? ORDER BY created_at',
    [orgId]
  ))
})

router.put('/users/:id', requireAdmin, async (req, res) => {
  const orgId = req.session.orgId
  const userId = parseInt(req.params.id)
  const { name, email, role } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'Name is required' })
  if (!email?.trim()) return res.status(400).json({ error: 'Email is required' })
  if (role && !['admin', 'team_member'].includes(role)) return res.status(400).json({ error: 'Invalid role' })
  if (role && userId === req.session.userId && role !== 'admin') return res.status(400).json({ error: 'Cannot remove your own admin role' })
  if (role === 'team_member') {
    const adminCount = await db.getOne("SELECT COUNT(*) as n FROM users WHERE role = 'admin' AND org_id = ?", [orgId])
    const target = await db.getOne('SELECT role FROM users WHERE id = ? AND org_id = ?', [userId, orgId])
    if (target?.role === 'admin' && parseInt(adminCount.n) <= 1) return res.status(400).json({ error: 'Cannot remove the last admin account' })
  }
  const conflict = await db.getOne('SELECT id FROM users WHERE email = ? AND org_id = ? AND id != ?', [email.toLowerCase().trim(), orgId, userId])
  if (conflict) return res.status(400).json({ error: 'That email is already in use' })
  if (role) {
    await db.execute('UPDATE users SET name = ?, email = ?, role = ? WHERE id = ? AND org_id = ?', [name.trim(), email.toLowerCase().trim(), role, userId, orgId])
  } else {
    await db.execute('UPDATE users SET name = ?, email = ? WHERE id = ? AND org_id = ?', [name.trim(), email.toLowerCase().trim(), userId, orgId])
  }
  res.json(await db.getOne('SELECT id, name, email, role, created_at FROM users WHERE id = ? AND org_id = ?', [userId, orgId]))
})

router.put('/users/:id/role', requireAdmin, async (req, res) => {
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
    const adminCount = await db.getOne("SELECT COUNT(*) as n FROM users WHERE role = 'admin' AND org_id = ?", [orgId])
    const target = await db.getOne('SELECT role FROM users WHERE id = ? AND org_id = ?', [userId, orgId])
    if (target?.role === 'admin' && parseInt(adminCount.n) <= 1) {
      return res.status(400).json({ error: 'Cannot remove the last admin account' })
    }
  }
  await db.execute('UPDATE users SET role = ? WHERE id = ? AND org_id = ?', [role, userId, orgId])
  res.json(await db.getOne('SELECT id, name, email, role, created_at FROM users WHERE id = ? AND org_id = ?', [userId, orgId]))
})

router.delete('/users/:id', requireAdmin, async (req, res) => {
  const orgId = req.session.orgId
  const userId = parseInt(req.params.id)
  if (userId === req.session.userId) {
    return res.status(400).json({ error: 'Cannot delete your own account' })
  }
  const adminCount = await db.getOne("SELECT COUNT(*) as n FROM users WHERE role = 'admin' AND org_id = ?", [orgId])
  const target = await db.getOne('SELECT role FROM users WHERE id = ? AND org_id = ?', [userId, orgId])
  if (target?.role === 'admin' && parseInt(adminCount.n) <= 1) {
    return res.status(400).json({ error: 'Cannot delete the last admin account' })
  }
  await db.execute('DELETE FROM users WHERE id = ? AND org_id = ?', [userId, orgId])
  res.json({ ok: true })
})

router.post('/users/:id/send-reset-email', requireAdmin, async (req, res) => {
  const orgId = req.session.orgId
  const userId = parseInt(req.params.id)
  const user = await db.getOne('SELECT * FROM users WHERE id = ? AND org_id = ?', [userId, orgId])
  if (!user) return res.status(404).json({ error: 'User not found' })

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  await db.execute('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)', [user.id, token, expiresAt])

  const org = await db.getOne('SELECT name FROM organizations WHERE id = ?', [orgId])
  const origin = req.headers.origin || `http://localhost:${process.env.PORT || 3001}`
  const resetUrl = `${origin}/reset-password?token=${token}`

  try {
    const result = await sendPasswordResetEmail({ to: user.email, orgName: org?.name ?? 'Beacon', resetUrl })
    res.json({ ok: true, sent: result.sent, link: result.sent ? null : resetUrl, email: user.email })
  } catch (err) {
    res.status(500).json({ error: 'Failed to send email: ' + err.message })
  }
})

// --- Invite tokens (admin only) ---
router.post('/users/invite', requireAdmin, async (req, res) => {
  const orgId = req.session.orgId
  const { email, role = 'team_member' } = req.body
  if (!email) return res.status(400).json({ error: 'email is required' })
  if (!['admin', 'team_member'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' })
  }

  const existing = await db.getOne('SELECT id FROM users WHERE email = ? AND org_id = ?', [email.toLowerCase(), orgId])
  if (existing) return res.status(409).json({ error: 'A user with that email already exists' })

  const token = randomBytes(24).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  await db.execute(
    'INSERT INTO invite_tokens (org_id, token, role, email, expires_at) VALUES (?, ?, ?, ?, ?)',
    [orgId, token, role, email.toLowerCase(), expiresAt]
  )

  const org = await db.getOne('SELECT name FROM organizations WHERE id = ?', [orgId])
  const origin = req.headers.origin || `http://localhost:${process.env.PORT || 3001}`
  const inviteUrl = `${origin}/register?invite=${token}`

  try {
    const result = await sendInviteEmail({ to: email, orgName: org.name, role, inviteUrl })
    res.json({ token, expiresAt, email, sent: result.sent, link: result.sent ? undefined : inviteUrl })
  } catch (err) {
    res.json({ token, expiresAt, email, sent: false, link: inviteUrl, error: err.message })
  }
})

router.get('/users/invites', requireAdmin, async (req, res) => {
  const orgId = req.session.orgId
  res.json(await db.getAll(
    'SELECT * FROM invite_tokens WHERE org_id = ? AND used = 0 AND expires_at > NOW() ORDER BY created_at DESC',
    [orgId]
  ))
})

router.delete('/users/invites/:id', requireAdmin, async (req, res) => {
  const orgId = req.session.orgId
  await db.execute('DELETE FROM invite_tokens WHERE id = ? AND org_id = ?', [req.params.id, orgId])
  res.json({ ok: true })
})

// --- Campuses ---
const CAMPUS_ONE = `
  SELECT c.*,
    (SELECT COUNT(*) FROM screens       WHERE campus_id = c.id) AS screen_count,
    (SELECT COUNT(*) FROM service_types WHERE campus_id = c.id) AS service_type_count
  FROM campuses c WHERE c.id = ? AND c.org_id = ?
`
router.get('/campuses', async (req, res) => {
  const orgId = req.session.orgId
  res.json(await db.getAll(`
    SELECT c.*,
      (SELECT COUNT(*) FROM screens       WHERE campus_id = c.id) AS screen_count,
      (SELECT COUNT(*) FROM service_types WHERE campus_id = c.id) AS service_type_count
    FROM campuses c WHERE c.org_id = ? ORDER BY c.name
  `, [orgId]))
})
router.post('/campuses', async (req, res) => {
  const orgId = req.session.orgId
  const { name, description } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  const r = await db.execute(
    'INSERT INTO campuses (org_id, name, description) VALUES (?, ?, ?) RETURNING id',
    [orgId, name, description ?? null]
  )
  res.json(await db.getOne(CAMPUS_ONE, [r.lastInsertId, orgId]))
})
router.put('/campuses/:id', async (req, res) => {
  const orgId = req.session.orgId
  const { name, description } = req.body
  await db.execute('UPDATE campuses SET name = ?, description = ? WHERE id = ? AND org_id = ?', [name, description ?? null, req.params.id, orgId])
  res.json(await db.getOne(CAMPUS_ONE, [req.params.id, orgId]))
})
router.delete('/campuses/:id', async (req, res) => {
  const orgId = req.session.orgId
  await db.execute('DELETE FROM campuses WHERE id = ? AND org_id = ?', [req.params.id, orgId])
  res.json({ ok: true })
})

// --- Service Types ---
router.get('/service-types', async (req, res) => {
  const orgId = req.session.orgId
  const { campus_id } = req.query
  if (campus_id) {
    res.json(await db.getAll(
      'SELECT * FROM service_types WHERE campus_id = ? AND campus_id IN (SELECT id FROM campuses WHERE org_id = ?) ORDER BY name',
      [campus_id, orgId]
    ))
  } else {
    res.json(await db.getAll(
      'SELECT * FROM service_types WHERE campus_id IN (SELECT id FROM campuses WHERE org_id = ?) ORDER BY name',
      [orgId]
    ))
  }
})
router.post('/service-types', async (req, res) => {
  const orgId = req.session.orgId
  const { name, campus_id, pco_service_type_id, mode } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  if (campus_id) {
    const campus = await db.getOne('SELECT id FROM campuses WHERE id = ? AND org_id = ?', [campus_id, orgId])
    if (!campus) return res.status(400).json({ error: 'Invalid campus' })
  }
  const r = await db.execute(
    'INSERT INTO service_types (name, campus_id, pco_service_type_id, mode) VALUES (?, ?, ?, ?) RETURNING id',
    [name, campus_id ?? null, pco_service_type_id ?? null, mode ?? 'pco']
  )
  res.json(await db.getOne('SELECT * FROM service_types WHERE id = ?', [r.lastInsertId]))
})
router.put('/service-types/:id', async (req, res) => {
  const orgId = req.session.orgId
  const { name, campus_id, pco_service_type_id, mode } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  if (campus_id) {
    const campus = await db.getOne('SELECT id FROM campuses WHERE id = ? AND org_id = ?', [campus_id, orgId])
    if (!campus) return res.status(400).json({ error: 'Invalid campus' })
  }
  await db.execute(
    'UPDATE service_types SET name = ?, campus_id = ?, pco_service_type_id = ?, mode = ? WHERE id = ?',
    [name, campus_id ?? null, pco_service_type_id ?? null, mode ?? 'pco', req.params.id]
  )
  res.json(await db.getOne('SELECT * FROM service_types WHERE id = ?', [req.params.id]))
})
router.delete('/service-types/:id', async (req, res) => {
  await db.execute('DELETE FROM service_types WHERE id = ?', [req.params.id])
  res.json({ ok: true })
})
router.post('/service-types/:id/push', requireAuth, async (req, res) => {
  const orgId = req.session.orgId
  const { screen_ids } = req.body
  if (!Array.isArray(screen_ids) || screen_ids.length === 0) {
    return res.status(400).json({ error: 'screen_ids array required' })
  }
  const serviceType = await db.getOne(`
    SELECT st.id FROM service_types st
    JOIN campuses c ON st.campus_id = c.id
    WHERE st.id = ? AND c.org_id = ?
  `, [req.params.id, orgId])
  if (!serviceType) return res.status(404).json({ error: 'Service type not found' })

  const placeholders = screen_ids.map(() => '?').join(',')
  const validScreens = await db.getAll(
    `SELECT id FROM screens WHERE id IN (${placeholders}) AND org_id = ?`,
    [...screen_ids, orgId]
  )
  const validIds = validScreens.map(s => s.id)
  if (validIds.length === 0) return res.status(400).json({ error: 'No valid screens' })

  try {
    const { pushToScreens } = require('../scheduler')
    const result = await pushToScreens(req.params.id, validIds)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// --- Manual assignments ---
const MANUAL_JOIN = `
  SELECT ma.*,
         COALESCE(p.name_override, p.name) AS person_name,
         COALESCE(p.photo_override, p.photo_url) AS person_photo
  FROM manual_assignments ma
  LEFT JOIN people p ON ma.person_id = p.id
`
router.get('/service-types/:id/manual-assignments', requireAuth, async (req, res) => {
  res.json(await db.getAll(MANUAL_JOIN + 'WHERE ma.service_type_id = ? ORDER BY ma.slot', [req.params.id]))
})
router.post('/service-types/:id/manual-assignments', requireAuth, async (req, res) => {
  const { person_id, position } = req.body
  const maxRow = await db.getOne('SELECT MAX(slot) AS m FROM manual_assignments WHERE service_type_id = ?', [req.params.id])
  const slot = (maxRow?.m ?? -1) + 1
  const r = await db.execute(
    'INSERT INTO manual_assignments (service_type_id, person_id, slot, position) VALUES (?, ?, ?, ?) RETURNING id',
    [req.params.id, person_id ?? null, slot, position ?? null]
  )
  res.json(await db.getOne(MANUAL_JOIN + 'WHERE ma.id = ?', [r.lastInsertId]))
})
router.put('/service-types/:id/manual-assignments/:aid', requireAuth, async (req, res) => {
  const { position, slot } = req.body
  await db.execute(
    'UPDATE manual_assignments SET position = ?, slot = ? WHERE id = ? AND service_type_id = ?',
    [position ?? null, slot, req.params.aid, req.params.id]
  )
  res.json({ ok: true })
})
router.delete('/service-types/:id/manual-assignments/:aid', requireAuth, async (req, res) => {
  await db.execute('DELETE FROM manual_assignments WHERE id = ? AND service_type_id = ?', [req.params.aid, req.params.id])
  res.json({ ok: true })
})

// --- Position types ---
router.get('/position-types', requireAuth, async (req, res) => {
  res.json(await db.getAll('SELECT * FROM position_types WHERE org_id = ? ORDER BY sort_order, name', [req.session.orgId]))
})
router.post('/position-types', requireAuth, async (req, res) => {
  const { name } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'name required' })
  const maxRow = await db.getOne('SELECT MAX(sort_order) AS m FROM position_types WHERE org_id = ?', [req.session.orgId])
  const sort_order = (maxRow?.m ?? -1) + 1
  const r = await db.execute(
    'INSERT INTO position_types (org_id, name, sort_order) VALUES (?, ?, ?) RETURNING id',
    [req.session.orgId, name.trim(), sort_order]
  )
  res.json(await db.getOne('SELECT * FROM position_types WHERE id = ?', [r.lastInsertId]))
})
router.put('/position-types/:id', requireAuth, async (req, res) => {
  const { name } = req.body
  if (!name?.trim()) return res.status(400).json({ error: 'name required' })
  await db.execute('UPDATE position_types SET name = ? WHERE id = ? AND org_id = ?', [name.trim(), req.params.id, req.session.orgId])
  res.json(await db.getOne('SELECT * FROM position_types WHERE id = ?', [req.params.id]))
})
router.delete('/position-types/:id', requireAuth, async (req, res) => {
  await db.execute('DELETE FROM position_types WHERE id = ? AND org_id = ?', [req.params.id, req.session.orgId])
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

router.delete('/photos/file', async (req, res) => {
  const { url } = req.body
  if (!url || !url.startsWith('/uploads/photos/')) return res.json({ ok: true })
  const filename = path.basename(url)
  const filepath = path.join(UPLOADS_DIR, filename)
  fs.unlink(filepath, () => res.json({ ok: true }))
})

// --- People ---
router.get('/people', async (req, res) => {
  const orgId = req.session.orgId
  res.json(await db.getAll('SELECT * FROM people WHERE org_id = ? ORDER BY name', [orgId]))
})
function serializeCategory(cat) {
  if (!cat) return JSON.stringify(['Other'])
  if (Array.isArray(cat)) return JSON.stringify(cat.length ? cat : ['Other'])
  if (typeof cat === 'string' && cat.startsWith('[')) return cat
  return JSON.stringify([cat])
}
router.post('/people', async (req, res) => {
  const orgId = req.session.orgId
  const { name, pco_person_id, photo_url, photo_url_portrait, category, email, position } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  const r = await db.execute(
    'INSERT INTO people (org_id, name, pco_person_id, photo_url, photo_url_portrait, category, email, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id',
    [orgId, name, pco_person_id ?? null, photo_url ?? null, photo_url_portrait ?? null, serializeCategory(category), email ?? null, position ?? null]
  )
  res.json(await db.getOne('SELECT * FROM people WHERE id = ?', [r.lastInsertId]))
})
router.put('/people/:id', async (req, res) => {
  const orgId = req.session.orgId
  const { name, photo_url, photo_url_portrait, category, email, pco_person_id, position } = req.body
  const existing = await db.getOne('SELECT * FROM people WHERE id = ? AND org_id = ?', [req.params.id, orgId])
  if (!existing) return res.status(404).json({ error: 'Person not found' })

  if (existing.pco_person_id) {
    await db.execute(
      'UPDATE people SET name_override = ?, photo_override = ?, photo_override_portrait = ?, email_override = ?, category_override = ?, position_override = ? WHERE id = ? AND org_id = ?',
      [name ?? null, photo_url ?? null, photo_url_portrait ?? null, email ?? null, serializeCategory(category), position ?? null, req.params.id, orgId]
    )
  } else {
    await db.execute(
      'UPDATE people SET name = ?, photo_url = ?, photo_url_portrait = ?, category = ?, email = ?, pco_person_id = ?, position = ? WHERE id = ? AND org_id = ?',
      [name, photo_url ?? null, photo_url_portrait ?? null, serializeCategory(category), email ?? null, pco_person_id ?? null, position ?? null, req.params.id, orgId]
    )
  }
  res.json(await db.getOne('SELECT * FROM people WHERE id = ?', [req.params.id]))
})
router.delete('/people/:id', async (req, res) => {
  const orgId = req.session.orgId
  const existing = await db.getOne('SELECT * FROM people WHERE id = ? AND org_id = ?', [req.params.id, orgId])
  if (!existing) return res.status(404).json({ error: 'Person not found' })
  if (existing.pco_person_id) {
    return res.status(400).json({ error: 'Cannot delete a person synced from Planning Center' })
  }
  await db.execute('DELETE FROM people WHERE id = ? AND org_id = ?', [req.params.id, orgId])
  res.json({ ok: true })
})

// --- Email / SMTP config ---
async function getEmailConfigResponse() {
  async function s(key) { return (await db.getOne('SELECT value FROM settings WHERE key = ?', [key]))?.value || '' }
  const pass = await s('smtp_pass') || process.env.SMTP_PASS || ''
  return {
    host: await s('smtp_host') || process.env.SMTP_HOST || '',
    port: await s('smtp_port') || process.env.SMTP_PORT || '587',
    user: await s('smtp_user') || process.env.SMTP_USER || '',
    from: await s('smtp_from') || process.env.SMTP_FROM || '',
    passSet: !!pass,
    passHint: pass.length >= 4 ? pass.slice(-4) : (pass ? '****' : ''),
  }
}

router.get('/email-config', requireAdmin, async (req, res) => {
  res.json(await getEmailConfigResponse())
})

router.put('/email-config', requireAdmin, async (req, res) => {
  const { host, port, user, pass, from } = req.body
  async function upsert(key, value) {
    if (value === null || value === undefined) return
    if (value === '') {
      await db.execute('DELETE FROM settings WHERE key = ?', [key])
    } else {
      await db.execute(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
        [key, value]
      )
    }
  }
  await upsert('smtp_host', host?.trim() ?? null)
  await upsert('smtp_port', port?.toString() ?? null)
  await upsert('smtp_user', user?.trim() ?? null)
  await upsert('smtp_from', from?.trim() ?? null)
  if (pass && pass.trim()) await upsert('smtp_pass', pass.trim())
  res.json(await getEmailConfigResponse())
})

router.post('/email-config/test', requireAdmin, async (req, res) => {
  const user = await db.getOne('SELECT email, name FROM users WHERE id = ?', [req.session.userId])
  const org = await db.getOne('SELECT name FROM organizations WHERE id = ?', [req.session.orgId])
  try {
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    await db.execute('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)', [req.session.userId, token, expiresAt])
    const origin = req.headers.origin || `http://localhost:${process.env.PORT || 3001}`
    const resetUrl = `${origin}/reset-password?token=${token}`
    const result = await sendPasswordResetEmail({ to: user.email, orgName: org?.name ?? 'Beacon', resetUrl })
    if (!result.sent) return res.status(503).json({ error: 'SMTP is not configured. Add your settings and save first.' })
    res.json({ ok: true, to: user.email })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// --- Labels ---
router.get('/labels', async (req, res) => {
  const orgId = req.session.orgId
  res.json(await db.getAll('SELECT * FROM labels WHERE org_id = ? ORDER BY type, sort_order, name', [orgId]))
})
router.post('/labels', async (req, res) => {
  const orgId = req.session.orgId
  const { name, type, group_name, sort_order } = req.body
  if (!name || !type) return res.status(400).json({ error: 'name and type required' })
  const r = await db.execute(
    'INSERT INTO labels (org_id, name, type, group_name, sort_order) VALUES (?, ?, ?, ?, ?) RETURNING id',
    [orgId, name, type, group_name ?? null, sort_order ?? 0]
  )
  res.json(await db.getOne('SELECT * FROM labels WHERE id = ?', [r.lastInsertId]))
})
router.put('/labels/reorder', async (req, res) => {
  const { ids } = req.body
  await db.withTransaction(async (tx) => {
    for (let i = 0; i < ids.length; i++) {
      await tx.execute('UPDATE labels SET sort_order = ? WHERE id = ?', [i, ids[i]])
    }
  })
  res.json({ ok: true })
})
router.put('/labels/:id', async (req, res) => {
  const orgId = req.session.orgId
  const { name, type, group_name, sort_order } = req.body
  await db.execute(
    'UPDATE labels SET name = ?, type = ?, group_name = ?, sort_order = ? WHERE id = ? AND org_id = ?',
    [name, type, group_name ?? null, sort_order ?? 0, req.params.id, orgId]
  )
  res.json(await db.getOne('SELECT * FROM labels WHERE id = ?', [req.params.id]))
})
router.delete('/labels/:id', async (req, res) => {
  const orgId = req.session.orgId
  await db.execute('DELETE FROM labels WHERE id = ? AND org_id = ?', [req.params.id, orgId])
  res.json({ ok: true })
})

// --- Automation Rules ---
router.get('/automation-rules', async (req, res) => {
  const orgId = req.session.orgId
  res.json(await db.getAll('SELECT * FROM automation_rules WHERE org_id = ? ORDER BY priority', [orgId]))
})
router.post('/automation-rules', async (req, res) => {
  const orgId = req.session.orgId
  const { priority, condition_field, condition_op, condition_value, action_type, action_value } = req.body
  const r = await db.execute(
    'INSERT INTO automation_rules (org_id, priority, condition_field, condition_op, condition_value, action_type, action_value) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id',
    [orgId, priority, condition_field, condition_op, condition_value, action_type, action_value]
  )
  res.json(await db.getOne('SELECT * FROM automation_rules WHERE id = ?', [r.lastInsertId]))
})
router.put('/automation-rules/reorder', async (req, res) => {
  const orgId = req.session.orgId
  const { ids } = req.body
  for (let i = 0; i < ids.length; i++) {
    await db.execute('UPDATE automation_rules SET priority = ? WHERE id = ? AND org_id = ?', [i, ids[i], orgId])
  }
  res.json({ ok: true })
})
router.put('/automation-rules/:id', async (req, res) => {
  const orgId = req.session.orgId
  const { priority, condition_field, condition_op, condition_value, action_type, action_value } = req.body
  await db.execute(
    'UPDATE automation_rules SET priority=?, condition_field=?, condition_op=?, condition_value=?, action_type=?, action_value=? WHERE id=? AND org_id=?',
    [priority, condition_field, condition_op, condition_value, action_type, action_value, req.params.id, orgId]
  )
  res.json(await db.getOne('SELECT * FROM automation_rules WHERE id = ?', [req.params.id]))
})
router.delete('/automation-rules/:id', async (req, res) => {
  const orgId = req.session.orgId
  await db.execute('DELETE FROM automation_rules WHERE id = ? AND org_id = ?', [req.params.id, orgId])
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
  const label = labels.find(l => l.id === Number(actionValue) && l.type === type)
  return label ?? null
}

router.post('/run-automation', async (req, res) => {
  const orgId = req.session.orgId

  const rules = await db.getAll('SELECT * FROM automation_rules WHERE org_id = ? ORDER BY priority', [orgId])
  const labels = await db.getAll('SELECT * FROM labels WHERE org_id = ? ORDER BY type, sort_order', [orgId])
  const screens = await db.getAll('SELECT * FROM screens WHERE org_id = ?', [orgId])

  let totalCount = 0

  for (const screen of screens) {
    const assignments = await db.getAll(
      'SELECT * FROM active_assignments WHERE screen_id = ? ORDER BY slot',
      [screen.id]
    )

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

      await db.execute(
        'UPDATE active_assignments SET mic_label = ?, iem_label = ? WHERE id = ?',
        [mic?.name ?? null, iem?.name ?? null, assignment.id]
      )
      totalCount++
    }
  }

  res.json({ ok: true, updated: totalCount })
})

// --- Dashboard ---
const SCREENS_SELECT = `
  SELECT s.*,
    c.name  AS campus_name,
    m.name  AS mirror_screen_name,
    m.token AS mirror_screen_token,
    CASE WHEN s.last_heartbeat > NOW() - INTERVAL '90 seconds' THEN 1 ELSE 0 END AS is_active
  FROM screens s
  LEFT JOIN campuses c ON s.campus_id = c.id
  LEFT JOIN screens  m ON s.mirror_screen_id = m.id
`
router.get('/dashboard', async (req, res) => {
  const orgId = req.session.orgId
  const screens = await db.getAll(`${SCREENS_SELECT} WHERE s.org_id = ? ORDER BY s.name`, [orgId])

  const screensWithData = await Promise.all(screens.map(async screen => {
    const sourceId = screen.mirror_screen_id ?? screen.id
    const assignments = await db.getAll(
      'SELECT * FROM active_assignments WHERE screen_id = ? ORDER BY slot',
      [sourceId]
    )
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
  }))

  const peopleCountRow = await db.getOne('SELECT COUNT(*) as n FROM people WHERE org_id = ?', [orgId])
  const peopleCount = parseInt(peopleCountRow?.n ?? 0)
  const pcoPeopleCountRow = await db.getOne(
    "SELECT COUNT(*) as n FROM people WHERE org_id = ? AND pco_person_id IS NOT NULL AND pco_person_id != ''",
    [orgId]
  )
  const pcoPeopleCount = parseInt(pcoPeopleCountRow?.n ?? 0)
  const peoplePreview = await db.getAll(
    'SELECT id, name, position, photo_url, photo_override FROM people WHERE org_id = ? ORDER BY name LIMIT 6',
    [orgId]
  )

  const labelsAll = await db.getAll(
    'SELECT id, name, type, group_name FROM labels WHERE org_id = ? ORDER BY type, sort_order, name',
    [orgId]
  )
  const micLabelCount = labelsAll.filter(l => l.type === 'mic').length
  const iemLabelCount = labelsAll.filter(l => l.type === 'iem').length
  const positionTypes = await db.getAll(
    'SELECT id, name FROM position_types WHERE org_id = ? ORDER BY sort_order, name',
    [orgId]
  )

  const previewItems = [
    ...labelsAll.filter(l => l.type === 'mic').slice(0, 2),
    ...labelsAll.filter(l => l.type === 'iem').slice(0, 2),
    ...positionTypes.slice(0, 2).map(p => ({ ...p, type: 'position' })),
  ]

  const schedulesData = await db.getAll(`
    SELECT sc.id, sc.cron_expr, sc.enabled, sc.last_run,
      st.name AS service_type_name, st.mode AS service_type_mode
    FROM schedules sc
    JOIN service_types st ON sc.service_type_id = st.id
    JOIN campuses c ON st.campus_id = c.id
    WHERE c.org_id = ?
    ORDER BY sc.enabled DESC, st.name
  `, [orgId])

  const templatesData = await db.getAll(`
    SELECT t.id, t.name,
      (SELECT COUNT(*) FROM screens s2 WHERE s2.org_id = t.org_id AND s2.layout = 'template:' || CAST(t.id AS TEXT)) AS screen_count
    FROM templates t
    WHERE t.org_id = ?
    ORDER BY t.name
  `, [orgId])

  const serviceTypesData = await db.getAll(`
    SELECT st.id, st.name, st.mode,
      (SELECT screen_ids FROM schedules WHERE service_type_id = st.id AND enabled = 1 ORDER BY id DESC LIMIT 1) AS schedule_screen_ids
    FROM service_types st
    JOIN campuses c ON st.campus_id = c.id
    WHERE c.org_id = ?
    ORDER BY st.name
  `, [orgId])

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
    schedules: schedulesData,
    templates: templatesData,
    serviceTypes: serviceTypesData,
  })
})

router.patch('/assignments/:id', async (req, res) => {
  const orgId = req.session.orgId
  const { mic_label, iem_label } = req.body
  const assignment = await db.getOne(`
    SELECT aa.* FROM active_assignments aa
    JOIN screens s ON aa.screen_id = s.id
    WHERE aa.id = ? AND s.org_id = ?
  `, [req.params.id, orgId])
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' })
  await db.execute(
    'UPDATE active_assignments SET mic_label = ?, iem_label = ? WHERE id = ?',
    [
      mic_label !== undefined ? (mic_label || null) : assignment.mic_label,
      iem_label !== undefined ? (iem_label || null) : assignment.iem_label,
      req.params.id,
    ]
  )
  res.json({ ok: true })
})

// --- Screens ---
router.get('/screens', async (req, res) => {
  const orgId = req.session.orgId
  res.json(await db.getAll(`${SCREENS_SELECT} WHERE s.org_id = ? ORDER BY s.name`, [orgId]))
})
router.post('/screens', async (req, res) => {
  const orgId = req.session.orgId
  const { name, campus_id, mirror_screen_id, description, layout } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  const token = uuidv4().replace(/-/g, '').slice(0, 12)
  const shareCode = Math.random().toString(36).slice(2, 8).toUpperCase()
  const r = await db.execute(
    'INSERT INTO screens (org_id, name, token, campus_id, share_code, mirror_screen_id, description, layout) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id',
    [orgId, name, token, campus_id ?? null, shareCode, mirror_screen_id ?? null, description ?? null, layout ?? 'grid-standard']
  )
  res.json(await db.getOne(`${SCREENS_SELECT} WHERE s.id = ?`, [r.lastInsertId]))
})
router.put('/screens/:id', async (req, res) => {
  const orgId = req.session.orgId
  const { name, campus_id, mirror_screen_id, description, layout } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  await db.execute(
    'UPDATE screens SET name = ?, campus_id = ?, mirror_screen_id = ?, description = ?, layout = ? WHERE id = ? AND org_id = ?',
    [name, campus_id ?? null, mirror_screen_id ?? null, description ?? null, layout ?? 'grid-standard', req.params.id, orgId]
  )
  res.json(await db.getOne(`${SCREENS_SELECT} WHERE s.id = ?`, [req.params.id]))
})
router.delete('/screens/:id', async (req, res) => {
  const orgId = req.session.orgId
  await db.execute('DELETE FROM screens WHERE id = ? AND org_id = ?', [req.params.id, orgId])
  res.json({ ok: true })
})
router.get('/screens/:id/assignments', requireAuth, async (req, res) => {
  const orgId = req.session.orgId
  const screen = await db.getOne('SELECT id FROM screens WHERE id = ? AND org_id = ?', [req.params.id, orgId])
  if (!screen) return res.status(404).json({ error: 'Screen not found' })
  res.json(await db.getAll('SELECT * FROM active_assignments WHERE screen_id = ? ORDER BY slot', [req.params.id]))
})
router.delete('/screens/:id/assignments', requireAuth, async (req, res) => {
  const orgId = req.session.orgId
  const screen = await db.getOne('SELECT id FROM screens WHERE id = ? AND org_id = ?', [req.params.id, orgId])
  if (!screen) return res.status(404).json({ error: 'Screen not found' })
  await db.execute('DELETE FROM active_assignments WHERE screen_id = ?', [req.params.id])
  res.json({ ok: true })
})

// --- Templates ---
router.get('/templates', async (req, res) => {
  const orgId = req.session.orgId
  res.json(await db.getAll('SELECT * FROM templates WHERE org_id = ? ORDER BY name', [orgId]))
})
router.post('/templates', async (req, res) => {
  const orgId = req.session.orgId
  const { name, description, config } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  const r = await db.execute(
    'INSERT INTO templates (org_id, name, description, config) VALUES (?, ?, ?, ?) RETURNING id',
    [orgId, name, description ?? null, config ? JSON.stringify(config) : null]
  )
  res.json(await db.getOne('SELECT * FROM templates WHERE id = ?', [r.lastInsertId]))
})
router.put('/templates/:id', async (req, res) => {
  const orgId = req.session.orgId
  const { name, description, config } = req.body
  if (!name) return res.status(400).json({ error: 'name required' })
  await db.execute(
    'UPDATE templates SET name = ?, description = ?, config = ? WHERE id = ? AND org_id = ?',
    [name, description ?? null, config ? JSON.stringify(config) : null, req.params.id, orgId]
  )
  res.json(await db.getOne('SELECT * FROM templates WHERE id = ?', [req.params.id]))
})
router.delete('/templates/:id', async (req, res) => {
  const orgId = req.session.orgId
  await db.execute('DELETE FROM templates WHERE id = ? AND org_id = ?', [req.params.id, orgId])
  res.json({ ok: true })
})

// --- Schedules ---
router.get('/schedules', async (req, res) => {
  const orgId = req.session.orgId
  res.json(await db.getAll(`
    SELECT s.*, st.name as service_type_name
    FROM schedules s
    JOIN service_types st ON s.service_type_id = st.id
    WHERE st.campus_id IN (SELECT id FROM campuses WHERE org_id = ?)
    ORDER BY s.id
  `, [orgId]))
})
router.post('/schedules', async (req, res) => {
  const { service_type_id, cron_expr, enabled, screen_ids } = req.body
  if (!service_type_id || !cron_expr) return res.status(400).json({ error: 'service_type_id and cron_expr required' })
  const screenIdsJson = Array.isArray(screen_ids) ? JSON.stringify(screen_ids) : (screen_ids ?? null)
  const r = await db.execute(
    'INSERT INTO schedules (service_type_id, cron_expr, enabled, screen_ids) VALUES (?, ?, ?, ?) RETURNING id',
    [service_type_id, cron_expr, enabled ?? 1, screenIdsJson]
  )
  const schedule = await db.getOne(
    'SELECT s.*, st.name as service_type_name FROM schedules s LEFT JOIN service_types st ON s.service_type_id = st.id WHERE s.id = ?',
    [r.lastInsertId]
  )
  const { registerSchedule } = require('../scheduler')
  if (schedule.enabled) registerSchedule(schedule)
  res.json(schedule)
})
router.put('/schedules/:id', async (req, res) => {
  const { cron_expr, enabled, screen_ids } = req.body
  const screenIdsJson = Array.isArray(screen_ids) ? JSON.stringify(screen_ids) : (screen_ids ?? null)
  await db.execute(
    'UPDATE schedules SET cron_expr = ?, enabled = ?, screen_ids = ? WHERE id = ?',
    [cron_expr, enabled, screenIdsJson, req.params.id]
  )
  const schedule = await db.getOne(
    'SELECT s.*, st.name as service_type_name FROM schedules s LEFT JOIN service_types st ON s.service_type_id = st.id WHERE s.id = ?',
    [req.params.id]
  )
  const { registerSchedule, unregisterSchedule } = require('../scheduler')
  if (schedule.enabled) registerSchedule(schedule)
  else unregisterSchedule(schedule.id)
  res.json(schedule)
})
router.delete('/schedules/:id', async (req, res) => {
  const { unregisterSchedule } = require('../scheduler')
  unregisterSchedule(parseInt(req.params.id))
  await db.execute('DELETE FROM schedules WHERE id = ?', [req.params.id])
  res.json({ ok: true })
})
router.post('/schedules/:id/run', async (req, res) => {
  const { runSchedule } = require('../scheduler')
  await runSchedule(parseInt(req.params.id))
  res.json({ ok: true })
})

// --- Settings ---
router.get('/settings', async (req, res) => {
  const rows = await db.getAll('SELECT key, value FROM settings')
  res.json(Object.fromEntries(rows.map(r => [r.key, r.value])))
})
router.put('/settings/:key', async (req, res) => {
  const { value } = req.body
  await db.execute(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value',
    [req.params.key, value]
  )
  res.json({ ok: true })
})

module.exports = router
