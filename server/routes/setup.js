const express = require('express')
const router = express.Router()
const db = require('../db')
const { hashPassword } = require('../utils/password')

router.get('/status', (req, res) => {
  const row = db.prepare("SELECT value FROM settings WHERE key = 'setup_complete'").get()
  res.json({ complete: row?.value === 'true' })
})

router.post('/', (req, res) => {
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

  const email = adminEmail.trim().toLowerCase()
  const setupRow = db.prepare("SELECT value FROM settings WHERE key = 'setup_complete'").get()
  const isFirstSetup = setupRow?.value !== 'true'

  let orgId

  if (isFirstSetup) {
    const seedOrg = db.prepare('SELECT id FROM organizations LIMIT 1').get()
    const slugConflict = db.prepare('SELECT id FROM organizations WHERE slug = ? AND id != ?').get(slug, seedOrg.id)
    if (slugConflict) return res.status(409).json({ error: 'That organization code is already in use' })

    db.prepare(
      'UPDATE organizations SET name = ?, slug = ?, address_street = ?, address_city = ?, address_state = ?, address_zip = ?, website = ?, phone = ?, timezone = ? WHERE id = ?'
    ).run(orgName.trim(), slug, addressStreet?.trim()||null, addressCity?.trim()||null, addressState?.trim()||null, addressZip?.trim()||null, website?.trim()||null, phone?.trim()||null, timezone||'America/Chicago', seedOrg.id)
    orgId = seedOrg.id

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (existing) {
      db.prepare('UPDATE users SET name = ?, password_hash = ?, role = ?, org_id = ? WHERE id = ?').run(
        adminName.trim(), hashPassword(adminPassword), 'admin', orgId, existing.id
      )
    } else {
      db.prepare('INSERT INTO users (org_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)').run(
        orgId, adminName.trim(), email, hashPassword(adminPassword), 'admin'
      )
    }
  } else {
    const slugConflict = db.prepare('SELECT id FROM organizations WHERE slug = ?').get(slug)
    if (slugConflict) return res.status(409).json({ error: 'That organization code is already in use' })

    const emailTaken = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
    if (emailTaken) return res.status(409).json({ error: "That email is already registered. Use a different email for this organization's admin account." })

    const { generateAccessCode } = require('../db')
    const r = db.prepare(
      'INSERT INTO organizations (name, slug, access_code, address_street, address_city, address_state, address_zip, website, phone, timezone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(orgName.trim(), slug, generateAccessCode(), addressStreet?.trim()||null, addressCity?.trim()||null, addressState?.trim()||null, addressZip?.trim()||null, website?.trim()||null, phone?.trim()||null, timezone||'America/Chicago')
    orgId = Number(r.lastInsertRowid)

    db.prepare('INSERT INTO users (org_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)').run(
      orgId, adminName.trim(), email, hashPassword(adminPassword), 'admin'
    )
  }

  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('setup_complete', 'true')").run()

  const user = db.prepare('SELECT id, name, email, role, org_id FROM users WHERE email = ? AND org_id = ?').get(email, orgId)
  req.session.userId = user.id
  req.session.role = user.role
  req.session.orgId = orgId

  const org = db.prepare('SELECT id, name, slug FROM organizations WHERE id = ?').get(orgId)
  res.json({ user, org })
})

module.exports = router
