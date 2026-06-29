const express = require('express')
const router = express.Router()

const SITE_ADMIN_PASSWORD = process.env.SITE_ADMIN_PASSWORD

function requireSiteAdmin(req, res, next) {
  if (!req.session.siteAdmin) return res.status(401).json({ error: 'Not authenticated' })
  next()
}

// POST /api/site-admin/login
router.post('/login', (req, res) => {
  const { password } = req.body
  if (!SITE_ADMIN_PASSWORD) {
    return res.status(503).json({ error: 'Site admin access is not configured. Set SITE_ADMIN_PASSWORD in environment variables.' })
  }
  if (password !== SITE_ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Incorrect password' })
  }
  req.session.siteAdmin = true
  res.json({ ok: true })
})

// POST /api/site-admin/logout
router.post('/logout', (req, res) => {
  req.session.siteAdmin = false
  res.json({ ok: true })
})

// GET /api/site-admin/me
router.get('/me', (req, res) => {
  res.json({ authenticated: !!req.session.siteAdmin })
})

module.exports = router
module.exports.requireSiteAdmin = requireSiteAdmin
