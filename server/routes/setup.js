const express = require('express')
const router = express.Router()
const db = require('../db')
const { hashPassword } = require('../utils/password')

router.get('/status', async (req, res) => {
  const row = await db.getOne("SELECT value FROM settings WHERE key = 'setup_complete'")
  res.json({ complete: row?.value === 'true' })
})

router.post('/', async (req, res) => {
  const row = await db.getOne("SELECT value FROM settings WHERE key = 'setup_complete'")
  if (row?.value === 'true') {
    return res.status(403).json({ error: 'Setup is already complete' })
  }

  const {
    orgName, orgSlug, addressStreet, addressCity, addressState, addressZip,
    website, phone, timezone, adminName, adminEmail, adminPassword,
  } = req.body

  if (!orgName?.trim() || !orgSlug?.trim()) {
    return res.status(400).json({ error: 'Organization name and code are required' })
  }
  if (!adminName?.trim() || !adminEmail?.trim() || !adminPassword) {
    return res.status(400).json({ error: 'Admin name, email, and password are required' })
  }
  if (adminPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }

  const slug = orgSlug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '')
  if (!slug) return res.status(400).json({ error: 'Invalid organization code — use letters, numbers, and hyphens only' })

  const defaultOrg = await db.getOne('SELECT id FROM organizations LIMIT 1')
  const slugConflict = await db.getOne('SELECT id FROM organizations WHERE slug = ?', [slug])
  if (slugConflict && slugConflict.id !== defaultOrg?.id) {
    return res.status(409).json({ error: 'That organization code is already in use' })
  }

  await db.execute(
    `UPDATE organizations
     SET name = ?, slug = ?, address_street = ?, address_city = ?, address_state = ?,
         address_zip = ?, website = ?, phone = ?, timezone = ?
     WHERE id = ?`,
    [
      orgName.trim(), slug,
      addressStreet?.trim() || null, addressCity?.trim() || null,
      addressState?.trim() || null, addressZip?.trim() || null,
      website?.trim() || null, phone?.trim() || null,
      timezone || 'America/Chicago',
      defaultOrg.id,
    ]
  )

  const email = adminEmail.trim().toLowerCase()
  const existing = await db.getOne('SELECT id, org_id FROM users WHERE email = ?', [email])

  let user
  if (existing) {
    await db.execute(
      'UPDATE users SET name = ?, password_hash = ?, role = ?, org_id = ? WHERE id = ?',
      [adminName.trim(), hashPassword(adminPassword), 'admin', defaultOrg.id, existing.id]
    )
    user = await db.getOne('SELECT id, name, email, role, org_id FROM users WHERE id = ?', [existing.id])
  } else {
    const r = await db.execute(
      'INSERT INTO users (org_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?) RETURNING id',
      [defaultOrg.id, adminName.trim(), email, hashPassword(adminPassword), 'admin']
    )
    user = await db.getOne('SELECT id, name, email, role, org_id FROM users WHERE id = ?', [r.lastInsertId])
  }

  await db.execute(
    "INSERT INTO settings (key, value) VALUES ('setup_complete', 'true') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value"
  )

  req.session.userId = user.id
  req.session.role = user.role
  req.session.orgId = user.org_id
  req.session.userLoginAt = new Date().toISOString()

  const org = await db.getOne('SELECT id, name, slug FROM organizations WHERE id = ?', [defaultOrg.id])
  res.json({ user, org })
})

module.exports = router
