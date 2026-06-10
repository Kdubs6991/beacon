const express = require('express')
const router = express.Router()
const db = require('../db')
const { hashPassword } = require('../utils/password')

router.get('/status', (req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'setup_complete'").get()
  res.json({ complete: row?.value === 'true' })
})

router.post('/', (req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'setup_complete'").get()
  if (row?.value === 'true') {
    return res.status(403).json({ error: 'Setup is already complete' })
  }

  const { orgName, orgSlug, addressStreet, addressCity, addressState, addressZip, website, phone, timezone, adminName, adminEmail, adminPassword } = req.body

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

  // Check slug uniqueness (in case it conflicts with a prior org name)
  const slugConflict = db.prepare('SELECT id FROM organizations WHERE slug = ?').get(slug)
  const defaultOrg = db.prepare('SELECT id FROM organizations LIMIT 1').get()
  if (slugConflict && slugConflict.id !== defaultOrg?.id) {
    return res.status(409).json({ error: 'That organization code is already in use' })
  }

  // Update the default org with the real details
  db.prepare(
    'UPDATE organizations SET name = ?, slug = ?, address_street = ?, address_city = ?, address_state = ?, address_zip = ?, website = ?, phone = ?, timezone = ? WHERE id = ?'
  ).run(
    orgName.trim(),
    slug,
    addressStreet?.trim() || null,
    addressCity?.trim() || null,
    addressState?.trim() || null,
    addressZip?.trim() || null,
    website?.trim() || null,
    phone?.trim() || null,
    timezone || 'America/Chicago',
    defaultOrg.id
  )

  // Create admin user (or promote an existing seeded user)
  const email = adminEmail.trim().toLowerCase()
  const existing = db.prepare('SELECT id, org_id FROM users WHERE email = ?').get(email)

  let user
  if (existing) {
    db.prepare('UPDATE users SET name = ?, password_hash = ?, role = ?, org_id = ? WHERE id = ?').run(
      adminName.trim(), hashPassword(adminPassword), 'admin', defaultOrg.id, existing.id
    )
    user = db.prepare('SELECT id, name, email, role, org_id FROM users WHERE id = ?').get(existing.id)
  } else {
    const r = db.prepare(
      'INSERT INTO users (org_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)'
    ).run(defaultOrg.id, adminName.trim(), email, hashPassword(adminPassword), 'admin')
    user = db.prepare('SELECT id, name, email, role, org_id FROM users WHERE id = ?').get(Number(r.lastInsertRowid))
  }

  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('setup_complete', 'true')").run()

  req.session.userId = user.id
  req.session.role = user.role
  req.session.orgId = user.org_id

  const org = db.prepare('SELECT id, name, slug FROM organizations WHERE id = ?').get(defaultOrg.id)
  res.json({ user, org })
})

module.exports = router
