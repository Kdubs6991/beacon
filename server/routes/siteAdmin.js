const express = require('express')
const router = express.Router()
const multer = require('multer')
const db = require('../db')
const { USE_CLOUDINARY, uploadToCloudinary } = require('../storage')

const siteUpload = multer({ storage: multer.memoryStorage() })

const SITE_ADMIN_PASSWORD = process.env.SITE_ADMIN_PASSWORD

// Slugs that can never be created or deleted as custom pages
const RESERVED_SLUGS = new Set(['landing', 'docs', 'org', 'studio', 'admin', 'display', 'contact', 'setup', 'login', 'register', 'forgot-password', 'reset-password', 'no-access'])

function requireSiteAdmin(req, res, next) {
  if (!req.session.siteAdmin) return res.status(401).json({ error: 'Not authenticated' })
  next()
}

function slugify(title) {
  return title.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

function validateSlug(slug) {
  if (!slug) return 'Slug is required'
  if (!/^[a-z0-9-]+$/.test(slug)) return 'Slug must be lowercase letters, numbers, and hyphens only'
  if (RESERVED_SLUGS.has(slug)) return `"${slug}" is a reserved path`
  return null
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

// POST /api/site-admin/upload — image upload to Cloudinary
router.post('/upload', requireSiteAdmin, siteUpload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file provided' })
  if (!USE_CLOUDINARY) return res.status(503).json({ error: 'Cloudinary not configured' })
  try {
    const result = await uploadToCloudinary(req.file.buffer, { folder: 'beacon/site/landing', resource_type: 'image' })
    res.json({ url: result.secure_url })
  } catch (err) {
    console.error('[site-admin] upload error:', err)
    res.status(500).json({ error: 'Upload failed' })
  }
})

// GET /api/site-admin/nav-links — public, returns custom pages for nav/footer rendering
router.get('/nav-links', async (req, res) => {
  try {
    const pages = await db.getAll(
      "SELECT slug, title, show_in_nav, show_in_footer FROM site_pages WHERE slug NOT IN ('landing', 'docs') ORDER BY sort_order ASC, id ASC"
    )
    res.json({ pages })
  } catch (err) {
    console.error('[site-admin] GET nav-links error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// GET /api/site-admin/pages — admin, list all custom pages
router.get('/pages', requireSiteAdmin, async (req, res) => {
  try {
    const pages = await db.getAll(
      "SELECT id, slug, title, show_in_nav, show_in_footer, updated_at FROM site_pages WHERE slug NOT IN ('landing', 'docs') ORDER BY sort_order ASC, id ASC"
    )
    res.json({ pages })
  } catch (err) {
    console.error('[site-admin] GET pages error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// POST /api/site-admin/pages — create a new custom page
router.post('/pages', requireSiteAdmin, async (req, res) => {
  try {
    const { title, slug, show_in_nav = true, show_in_footer = true } = req.body
    if (!title || !title.trim()) return res.status(400).json({ error: 'Title is required' })

    const finalSlug = slug?.trim() || slugify(title)
    const slugErr = validateSlug(finalSlug)
    if (slugErr) return res.status(400).json({ error: slugErr })

    const existing = await db.getOne('SELECT id FROM site_pages WHERE slug = ?', [finalSlug])
    if (existing) return res.status(409).json({ error: 'A page with that slug already exists' })

    const page = await db.getOne(
      'INSERT INTO site_pages (slug, title, show_in_nav, show_in_footer) VALUES (?, ?, ?, ?) RETURNING id',
      [finalSlug, title.trim(), show_in_nav, show_in_footer]
    )

    // Seed with one empty section so the editor isn't blank
    await db.execute(
      "INSERT INTO site_blocks (page_id, sort_order, type, data) VALUES (?, 0, 'section', ?)",
      [page.id, JSON.stringify({ label: 'Section 1', bgColor: '', padding: 'lg', columns: 1, elements: [] })]
    )

    res.json({ ok: true, slug: finalSlug, id: page.id })
  } catch (err) {
    console.error('[site-admin] POST pages error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// PATCH /api/site-admin/pages/:slug/settings — update title, slug, nav flags
router.patch('/pages/:slug/settings', requireSiteAdmin, async (req, res) => {
  try {
    const page = await db.getOne('SELECT id, slug FROM site_pages WHERE slug = ?', [req.params.slug])
    if (!page) return res.status(404).json({ error: 'Page not found' })
    if (RESERVED_SLUGS.has(req.params.slug)) return res.status(403).json({ error: 'Cannot edit system page settings' })

    const { title, slug: newSlug, show_in_nav, show_in_footer } = req.body

    let finalSlug = page.slug
    if (newSlug && newSlug.trim() !== page.slug) {
      const trimmed = newSlug.trim()
      const slugErr = validateSlug(trimmed)
      if (slugErr) return res.status(400).json({ error: slugErr })
      const conflict = await db.getOne('SELECT id FROM site_pages WHERE slug = ? AND id != ?', [trimmed, page.id])
      if (conflict) return res.status(409).json({ error: 'That slug is already taken' })
      finalSlug = trimmed
    }

    await db.execute(
      'UPDATE site_pages SET title = ?, slug = ?, show_in_nav = ?, show_in_footer = ?, updated_at = NOW() WHERE id = ?',
      [title?.trim() || page.slug, finalSlug, show_in_nav ?? true, show_in_footer ?? true, page.id]
    )

    res.json({ ok: true, slug: finalSlug })
  } catch (err) {
    console.error('[site-admin] PATCH page settings error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

// DELETE /api/site-admin/pages/:slug — delete a custom page
router.delete('/pages/:slug', requireSiteAdmin, async (req, res) => {
  try {
    const { slug } = req.params
    if (RESERVED_SLUGS.has(slug)) return res.status(403).json({ error: 'Cannot delete system pages' })

    const page = await db.getOne('SELECT id FROM site_pages WHERE slug = ?', [slug])
    if (!page) return res.status(404).json({ error: 'Page not found' })

    await db.execute('DELETE FROM site_pages WHERE id = ?', [page.id])
    res.json({ ok: true })
  } catch (err) {
    console.error('[site-admin] DELETE page error:', err)
    res.status(500).json({ error: 'Server error' })
  }
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
    res.json({ title: page.title, blocks, show_in_nav: page.show_in_nav, show_in_footer: page.show_in_footer })
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

    await db.execute('DELETE FROM site_blocks WHERE page_id = ?', [page.id])
    for (let i = 0; i < blocks.length; i++) {
      const { type, data } = blocks[i]
      await db.execute(
        'INSERT INTO site_blocks (page_id, sort_order, type, data) VALUES (?, ?, ?, ?)',
        [page.id, i, type, JSON.stringify(data)]
      )
    }

    await db.execute("UPDATE site_pages SET updated_at = NOW() WHERE id = ?", [page.id])
    res.json({ ok: true, count: blocks.length })
  } catch (err) {
    console.error('[site-admin] PUT blocks error:', err)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router
module.exports.requireSiteAdmin = requireSiteAdmin
