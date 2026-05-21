const express = require('express')
const router = express.Router()
const multer = require('multer')
const fs = require('fs')
const path = require('path')
const db = require('../db')
const { generateAccessCode } = require('../db')
const { requireAdmin } = require('../middleware/auth')

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

router.use(requireAdmin)

// GET /api/org — return the org for the current session
router.get('/', (req, res) => {
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.session.orgId)
  if (!org) return res.status(404).json({ error: 'Organization not found' })
  res.json(org)
})

// PUT /api/org — update name, address fields, website, phone, timezone (not slug or access_code)
router.put('/', (req, res) => {
  const { name, addressStreet, addressCity, addressState, addressZip, website, phone, timezone } = req.body
  if (!name) return res.status(400).json({ error: 'name is required' })
  db.prepare(
    'UPDATE organizations SET name = ?, address_street = ?, address_city = ?, address_state = ?, address_zip = ?, website = ?, phone = ?, timezone = ? WHERE id = ?'
  ).run(
    name.trim(),
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
    'SELECT id, name, token, campus_id, description, created_at FROM screens WHERE org_id = ?'
  ).all(orgId)
  const users = db.prepare(
    'SELECT id, name, email, role, created_at FROM users WHERE org_id = ?'
  ).all(orgId)

  const { access_code, ...orgPublic } = org
  res.json({
    exported_at: new Date().toISOString(),
    organization: orgPublic,
    campuses,
    service_types: serviceTypes,
    people,
    labels,
    automation_rules: automationRules,
    screens,
    users,
  })
})

// POST /api/org/regenerate-code — generate a new access_code
router.post('/regenerate-code', (req, res) => {
  const newCode = generateAccessCode()
  db.prepare('UPDATE organizations SET access_code = ? WHERE id = ?').run(newCode, req.session.orgId)
  const org = db.prepare('SELECT * FROM organizations WHERE id = ?').get(req.session.orgId)
  res.json(org)
})

module.exports = router
