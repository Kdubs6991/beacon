const express = require('express')
const router = express.Router()
const db = require('../db')

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

// GET /api/site-admin/pages/:slug/public — no auth, public read
router.get('/pages/:slug/public', async (req, res) => {
  try {
    const page = await db.getOne('SELECT * FROM site_pages WHERE slug = ?', [req.params.slug])
    if (!page) return res.status(404).json({ error: 'Page not found' })
    const blocks = await db.getAll('SELECT * FROM site_blocks WHERE page_id = ? ORDER BY sort_order ASC', [page.id])
    res.json({ title: page.title, blocks })
  } catch (err) {
    console.error('[site-admin] GET public page error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/site-admin/pages/:slug/blocks — admin only
router.get('/pages/:slug/blocks', requireSiteAdmin, async (req, res) => {
  try {
    const page = await db.getOne('SELECT * FROM site_pages WHERE slug = ?', [req.params.slug])
    if (!page) return res.status(404).json({ error: 'Page not found' })
    const blocks = await db.getAll('SELECT * FROM site_blocks WHERE page_id = ? ORDER BY sort_order ASC', [page.id])
    res.json({ title: page.title, blocks })
  } catch (err) {
    console.error('[site-admin] GET blocks error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PUT /api/site-admin/pages/:slug/blocks — admin only, replaces all blocks
router.put('/pages/:slug/blocks', requireSiteAdmin, async (req, res) => {
  try {
    const { blocks } = req.body
    if (!Array.isArray(blocks)) return res.status(400).json({ error: 'blocks must be an array' })

    const page = await db.getOne('SELECT * FROM site_pages WHERE slug = ?', [req.params.slug])
    if (!page) return res.status(404).json({ error: 'Page not found' })

    // Delete existing blocks and re-insert
    await db.execute('DELETE FROM site_blocks WHERE page_id = ?', [page.id])
    for (let i = 0; i < blocks.length; i++) {
      const { type, data } = blocks[i]
      await db.execute(
        'INSERT INTO site_blocks (page_id, sort_order, type, data) VALUES (?, ?, ?, ?)',
        [page.id, i, type, JSON.stringify(data)]
      )
    }

    // Update updated_at on the page
    await db.execute("UPDATE site_pages SET updated_at = NOW() WHERE id = ?", [page.id])

    res.json({ ok: true, count: blocks.length })
  } catch (err) {
    console.error('[site-admin] PUT blocks error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
module.exports.requireSiteAdmin = requireSiteAdmin
