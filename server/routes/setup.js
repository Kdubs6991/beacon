const express = require('express')
const router = express.Router()
const db = require('../db')
const { hashPassword } = require('../utils/password')

router.get('/status', async (req, res) => {
  const row = await db.getOne("SELECT value FROM settings WHERE key = 'setup_complete'")
  res.json({ complete: row?.value === 'true' })
})

router.post('/', async (req, res) => {
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

  const email = adminEmail.trim().toLowerCase()
  const setupRow = await db.getOne("SELECT value FROM settings WHERE key = 'setup_complete'")
  const isFirstSetup = setupRow?.value !== 'true'

  let orgId

  if (isFirstSetup) {
    // First-time setup: configure the seed org
    const seedOrg = await db.getOne('SELECT id FROM organizations LIMIT 1')
    const slugConflict = await db.getOne('SELECT id FROM organizations WHERE slug = ? AND id != ?', [slug, seedOrg.id])
    if (slugConflict) return res.status(409).json({ error: 'That organization code is already in use' })

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
        timezone || 'America/Chicago', seedOrg.id,
      ]
    )
    orgId = seedOrg.id

    const existing = await db.getOne('SELECT id FROM users WHERE email = ?', [email])
    if (existing) {
      await db.execute(
        'UPDATE users SET name = ?, password_hash = ?, role = ?, org_id = ? WHERE id = ?',
        [adminName.trim(), hashPassword(adminPassword), 'admin', orgId, existing.id]
      )
    } else {
      await db.execute(
        'INSERT INTO users (org_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
        [orgId, adminName.trim(), email, hashPassword(adminPassword), 'admin']
      )
    }
  } else {
    // Additional org: create a brand new org
    const slugConflict = await db.getOne('SELECT id FROM organizations WHERE slug = ?', [slug])
    if (slugConflict) return res.status(409).json({ error: 'That organization code is already in use' })

    const emailTaken = await db.getOne('SELECT id FROM users WHERE email = ?', [email])
    if (emailTaken) return res.status(409).json({ error: 'That email is already registered. Use a different email for this organization\'s admin account.' })

    const { generateAccessCode } = require('../db')
    const r = await db.execute(
      `INSERT INTO organizations (name, slug, access_code, address_street, address_city, address_state,
       address_zip, website, phone, timezone) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
      [
        orgName.trim(), slug, generateAccessCode(),
        addressStreet?.trim() || null, addressCity?.trim() || null,
        addressState?.trim() || null, addressZip?.trim() || null,
        website?.trim() || null, phone?.trim() || null,
        timezone || 'America/Chicago',
      ]
    )
    orgId = r.lastInsertId

    await db.execute(
      'INSERT INTO users (org_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [orgId, adminName.trim(), email, hashPassword(adminPassword), 'admin']
    )
  }

  await db.execute(
    "INSERT INTO settings (key, value) VALUES ('setup_complete', 'true') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value"
  )

  const user = await db.getOne('SELECT id, name, email, role, org_id FROM users WHERE email = ? AND org_id = ?', [email, orgId])
  req.session.userId = user.id
  req.session.role = user.role
  req.session.orgId = orgId
  req.session.userLoginAt = new Date().toISOString()

  const org = await db.getOne('SELECT id, name, slug FROM organizations WHERE id = ?', [orgId])
  res.json({ user, org })
})

module.exports = router
