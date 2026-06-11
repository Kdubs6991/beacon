const express = require('express')
const router = express.Router()
const { randomBytes } = require('node:crypto')
const rateLimit = require('express-rate-limit')
const db = require('../db')

const orgAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait 15 minutes and try again.' },
})

// ── Scan-to-login session store (in-memory, 10min TTL) ────────────────────────
const displaySessions = new Map()
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000
  for (const [id, s] of displaySessions) {
    if (s.createdAt < cutoff) displaySessions.delete(id)
  }
}, 60_000)

// ── Public auth endpoints for cookie-based display login ──────────────────────

router.post('/auth/org', orgAuthLimiter, async (req, res) => {
  const { slug, access_code } = req.body
  if (!slug || !access_code) {
    return res.status(400).json({ error: 'slug and access_code are required' })
  }
  const org = await db.getOne(
    'SELECT id, name, short_name, slug FROM organizations WHERE slug = ? AND access_code = ?',
    [slug.toLowerCase().trim(), access_code.trim().toUpperCase()]
  )
  if (!org) {
    return res.status(401).json({ error: 'Invalid organization code or access code' })
  }
  res.json({ org })
})

router.post('/auth/screen', async (req, res) => {
  const { org_id, screen_name } = req.body
  if (!org_id || !screen_name) {
    return res.status(400).json({ error: 'org_id and screen_name are required' })
  }
  const screen = await db.getOne(
    'SELECT id, name, token FROM screens WHERE LOWER(name) = LOWER(?) AND org_id = ?',
    [screen_name.trim(), org_id]
  )
  if (!screen) {
    return res.status(404).json({ error: `No screen named "${screen_name}" found in this organization` })
  }
  res.json({ screen })
})

router.get('/auth/screens', async (req, res) => {
  const { org_id } = req.query
  if (!org_id) return res.status(400).json({ error: 'org_id is required' })
  const screens = await db.getAll(
    `SELECT id, name, token,
       CASE WHEN last_heartbeat > NOW() - INTERVAL '90 seconds' THEN 1 ELSE 0 END AS is_active
     FROM screens WHERE org_id = ? ORDER BY name`,
    [org_id]
  )
  res.json({ screens })
})

router.post('/auth/screen/create', async (req, res) => {
  const { org_id, screen_name } = req.body
  if (!org_id || !screen_name?.trim()) {
    return res.status(400).json({ error: 'org_id and screen_name are required' })
  }
  const org = await db.getOne('SELECT id FROM organizations WHERE id = ?', [org_id])
  if (!org) return res.status(404).json({ error: 'Organization not found' })
  const dupe = await db.getOne(
    'SELECT id FROM screens WHERE LOWER(name) = LOWER(?) AND org_id = ?',
    [screen_name.trim(), org_id]
  )
  if (dupe) return res.status(409).json({ error: `A screen named "${screen_name.trim()}" already exists` })
  const token = randomBytes(8).toString('hex')
  const shareCode = randomBytes(3).toString('hex').toUpperCase()
  const r = await db.execute(
    'INSERT INTO screens (org_id, name, token, share_code, layout) VALUES (?, ?, ?, ?, ?) RETURNING id',
    [org_id, screen_name.trim(), token, shareCode, 'grid-standard']
  )
  const screen = await db.getOne('SELECT id, name, token FROM screens WHERE id = ?', [r.lastInsertId])
  res.json({ screen })
})

// ── Scan-to-login session API ─────────────────────────────────────────────────

router.post('/setup-init', (req, res) => {
  const sessionId = randomBytes(16).toString('hex')
  displaySessions.set(sessionId, { ready: false, screenToken: null, createdAt: Date.now() })
  res.json({ sessionId })
})

router.get('/setup-poll/:sessionId', (req, res) => {
  const session = displaySessions.get(req.params.sessionId)
  if (!session) return res.status(404).json({ error: 'Session not found or expired' })
  if (session.ready) {
    displaySessions.delete(req.params.sessionId)
    return res.json({ ready: true, screenToken: session.screenToken })
  }
  res.json({ ready: false })
})

router.post('/setup-complete', (req, res) => {
  const { sessionId, screenToken } = req.body
  if (!sessionId || !screenToken) return res.status(400).json({ error: 'sessionId and screenToken are required' })
  const session = displaySessions.get(sessionId)
  if (!session) return res.status(404).json({ error: 'Session not found or expired' })
  displaySessions.set(sessionId, { ...session, ready: true, screenToken })
  res.json({ ok: true })
})

// ── Heartbeat ─────────────────────────────────────────────────────────────────

router.post('/:token/heartbeat', async (req, res) => {
  const r = await db.execute(
    'UPDATE screens SET last_heartbeat = NOW() WHERE token = ?',
    [req.params.token]
  )
  if (r.changes === 0) return res.status(404).json({ error: 'Screen not found' })
  res.json({ ok: true })
})

router.post('/:token/leave', async (req, res) => {
  await db.execute('UPDATE screens SET last_heartbeat = NULL WHERE token = ?', [req.params.token])
  res.json({ ok: true })
})

// ── Display data ──────────────────────────────────────────────────────────────

router.get('/:token', async (req, res) => {
  const screen = await db.getOne('SELECT * FROM screens WHERE token = ?', [req.params.token])
  if (!screen) return res.status(404).json({ error: 'Screen not found' })

  const sourceId = screen.mirror_screen_id ?? screen.id
  const assignments = await db.getAll(
    'SELECT * FROM active_assignments WHERE screen_id = ? ORDER BY slot',
    [sourceId]
  )

  const layout = screen.layout ?? 'grid-standard'
  const screenInfo = { id: screen.id, name: screen.name, layout }

  const orgRow = screen.org_id
    ? await db.getOne('SELECT name, short_name, logo_url FROM organizations WHERE id = ?', [screen.org_id])
    : null
  const orgInfo = orgRow ? { name: orgRow.short_name || orgRow.name, logo_url: orgRow.logo_url ?? null } : null

  let templateConfig = null
  if (layout.startsWith('template:')) {
    const tplId = layout.split(':')[1]
    const tplRow = await db.getOne('SELECT config FROM templates WHERE id = ?', [tplId])
    if (tplRow?.config) {
      try { templateConfig = JSON.parse(tplRow.config) } catch {}
    }
    if (templateConfig?.slots) {
      const allIds = [...new Set(
        Object.values(templateConfig.slots).flatMap(s => {
          if (s.labelIds?.length) return s.labelIds
          if (s.labelId) return [s.labelId]
          return []
        }).filter(Boolean)
      )]
      if (allIds.length > 0) {
        const placeholders = allIds.map(() => '?').join(',')
        const rows = await db.getAll(
          `SELECT id, name, type FROM labels WHERE id IN (${placeholders})`,
          allIds
        )
        const labelMap = Object.fromEntries(rows.map(l => [l.id, { name: l.name, type: l.type }]))
        for (const sn of Object.keys(templateConfig.slots)) {
          const slot = templateConfig.slots[sn]
          const ids = slot.labelIds?.length ? slot.labelIds : (slot.labelId ? [slot.labelId] : [])
          if (ids.length > 0) {
            const resolvedLabels = ids.map(id => labelMap[id]).filter(Boolean)
            templateConfig.slots[sn] = {
              ...slot,
              resolvedLabels,
              labelName: resolvedLabels[0]?.name ?? null,
            }
          }
        }
      }
    }
  }

  if (!assignments.length) {
    return res.json({ screen: screenInfo, org: orgInfo, event_name: null, event_date: null, musicians: [], template: templateConfig })
  }

  const first = assignments[0]
  res.json({
    screen: screenInfo,
    org: orgInfo,
    event_name: first.event_name,
    event_date: first.event_date,
    template: templateConfig,
    musicians: assignments.map(a => ({
      id: a.id,
      name: a.person_name,
      position: a.position,
      photo: a.person_photo,
      mic: a.mic_label,
      iem: a.iem_label,
      slot: a.slot,
    })),
  })
})

// ── Push assignments ──────────────────────────────────────────────────────────

router.post('/:token/assignments', async (req, res) => {
  const { share_code, musicians, event_name, event_date } = req.body
  const screen = await db.getOne('SELECT * FROM screens WHERE token = ?', [req.params.token])
  if (!screen) return res.status(404).json({ error: 'Screen not found' })

  if (share_code && screen.share_code !== share_code) {
    return res.status(403).json({ error: 'Invalid share code' })
  }

  await db.withTransaction(async (tx) => {
    await tx.execute('DELETE FROM active_assignments WHERE screen_id = ?', [screen.id])
    for (let i = 0; i < musicians.length; i++) {
      const m = musicians[i]
      await tx.execute(
        `INSERT INTO active_assignments (screen_id, person_name, person_photo, slot, position, mic_label, iem_label, event_name, event_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [screen.id, m.name, m.photo ?? null, i, m.position ?? null, m.mic ?? null, m.iem ?? null, event_name ?? null, event_date ?? null]
      )
    }
  })

  res.json({ ok: true })
})

module.exports = router
