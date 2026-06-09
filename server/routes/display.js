const express = require('express')
const router = express.Router()
const { randomBytes } = require('node:crypto')
const db = require('../db')

// ── Scan-to-login session store (in-memory, 10min TTL) ────────────────────────
const displaySessions = new Map()
setInterval(() => {
  const cutoff = Date.now() - 10 * 60 * 1000
  for (const [id, s] of displaySessions) {
    if (s.createdAt < cutoff) displaySessions.delete(id)
  }
}, 60_000)


// ── Public auth endpoints for cookie-based display login ──────────────────────

// POST /api/display/auth/org
// body: { slug, access_code }
router.post('/auth/org', (req, res) => {
  const { slug, access_code } = req.body
  if (!slug || !access_code) {
    return res.status(400).json({ error: 'slug and access_code are required' })
  }
  const org = db.prepare(
    'SELECT id, name, slug FROM organizations WHERE slug = ? AND access_code = ?'
  ).get(slug.toLowerCase().trim(), access_code.trim().toUpperCase())
  if (!org) {
    return res.status(401).json({ error: 'Invalid organization code or access code' })
  }
  res.json({ org })
})

// POST /api/display/auth/screen
// body: { org_id, screen_name }
router.post('/auth/screen', (req, res) => {
  const { org_id, screen_name } = req.body
  if (!org_id || !screen_name) {
    return res.status(400).json({ error: 'org_id and screen_name are required' })
  }
  const screen = db.prepare(
    'SELECT id, name, token FROM screens WHERE LOWER(name) = LOWER(?) AND org_id = ?'
  ).get(screen_name.trim(), org_id)
  if (!screen) {
    return res.status(404).json({ error: `No screen named "${screen_name}" found in this organization` })
  }
  res.json({ screen })
})

// GET /api/display/auth/screens?org_id=X — list all screens for an org
router.get('/auth/screens', (req, res) => {
  const { org_id } = req.query
  if (!org_id) return res.status(400).json({ error: 'org_id is required' })
  const screens = db.prepare(
    `SELECT id, name, token,
       CASE WHEN last_heartbeat > datetime('now', '-90 seconds') THEN 1 ELSE 0 END AS is_active
     FROM screens WHERE org_id = ? ORDER BY name`
  ).all(org_id)
  res.json({ screens })
})

// POST /api/display/auth/screen/create — create a new blank screen
router.post('/auth/screen/create', (req, res) => {
  const { org_id, screen_name } = req.body
  if (!org_id || !screen_name?.trim()) {
    return res.status(400).json({ error: 'org_id and screen_name are required' })
  }
  const org = db.prepare('SELECT id FROM organizations WHERE id = ?').get(org_id)
  if (!org) return res.status(404).json({ error: 'Organization not found' })
  const dupe = db.prepare('SELECT id FROM screens WHERE LOWER(name) = LOWER(?) AND org_id = ?').get(screen_name.trim(), org_id)
  if (dupe) return res.status(409).json({ error: `A screen named "${screen_name.trim()}" already exists` })
  const token = randomBytes(8).toString('hex')
  const shareCode = randomBytes(3).toString('hex').toUpperCase()
  const result = db.prepare(
    'INSERT INTO screens (org_id, name, token, share_code, layout) VALUES (?, ?, ?, ?, ?)'
  ).run(org_id, screen_name.trim(), token, shareCode, 'grid-standard')
  const screen = db.prepare('SELECT id, name, token FROM screens WHERE id = ?').get(result.lastInsertRowid)
  res.json({ screen })
})

// ── Scan-to-login session API ─────────────────────────────────────────────────

// POST /api/display/setup-init — TV calls this to get a session ID for the QR code
router.post('/setup-init', (req, res) => {
  const sessionId = randomBytes(16).toString('hex')
  displaySessions.set(sessionId, { ready: false, screenToken: null, createdAt: Date.now() })
  res.json({ sessionId })
})

// GET /api/display/setup-poll/:sessionId — TV polls for completion
router.get('/setup-poll/:sessionId', (req, res) => {
  const session = displaySessions.get(req.params.sessionId)
  if (!session) return res.status(404).json({ error: 'Session not found or expired' })
  if (session.ready) {
    displaySessions.delete(req.params.sessionId)
    return res.json({ ready: true, screenToken: session.screenToken })
  }
  res.json({ ready: false })
})

// POST /api/display/setup-complete — mobile calls this after completing auth
router.post('/setup-complete', (req, res) => {
  const { sessionId, screenToken } = req.body
  if (!sessionId || !screenToken) return res.status(400).json({ error: 'sessionId and screenToken are required' })
  const session = displaySessions.get(sessionId)
  if (!session) return res.status(404).json({ error: 'Session not found or expired' })
  displaySessions.set(sessionId, { ...session, ready: true, screenToken })
  res.json({ ok: true })
})

// POST /api/display/:token/heartbeat — display page pings this to mark screen as active
router.post('/:token/heartbeat', (req, res) => {
  const result = db.prepare(
    "UPDATE screens SET last_heartbeat = datetime('now') WHERE token = ?"
  ).run(req.params.token)
  if (result.changes === 0) return res.status(404).json({ error: 'Screen not found' })
  res.json({ ok: true })
})

// POST /api/display/:token/leave — clears heartbeat so screen shows inactive immediately
router.post('/:token/leave', (req, res) => {
  db.prepare('UPDATE screens SET last_heartbeat = NULL WHERE token = ?').run(req.params.token)
  res.json({ ok: true })
})

// ── Legacy / admin token-based route ─────────────────────────────────────────

router.get('/:token', (req, res) => {
  const screen = db.prepare('SELECT * FROM screens WHERE token = ?').get(req.params.token)
  if (!screen) return res.status(404).json({ error: 'Screen not found' })

  // Follow mirror chain (one level — mirrors-of-mirrors not supported)
  const sourceId = screen.mirror_screen_id ?? screen.id

  const assignments = db.prepare(
    'SELECT * FROM active_assignments WHERE screen_id = ? ORDER BY slot'
  ).all(sourceId)

  const layout = screen.layout ?? 'grid-standard'
  const screenInfo = { id: screen.id, name: screen.name, layout }

  const orgRow = screen.org_id
    ? db.prepare('SELECT name, logo_url FROM organizations WHERE id = ?').get(screen.org_id)
    : null
  const orgInfo = orgRow ? { name: orgRow.name, logo_url: orgRow.logo_url ?? null } : null

  // Resolve template config when layout is template:ID
  let templateConfig = null
  if (layout.startsWith('template:')) {
    const tplId = layout.split(':')[1]
    const tplRow = db.prepare('SELECT config FROM templates WHERE id = ?').get(tplId)
    if (tplRow?.config) {
      try { templateConfig = JSON.parse(tplRow.config) } catch {}
    }
    // Resolve labelIds (array) and legacy labelId (single) → resolvedLabels [{name,type}]
    if (templateConfig?.slots) {
      const allIds = [...new Set(
        Object.values(templateConfig.slots).flatMap(s => {
          if (s.labelIds?.length) return s.labelIds
          if (s.labelId) return [s.labelId]
          return []
        }).filter(Boolean)
      )]
      if (allIds.length > 0) {
        const rows = db.prepare(
          `SELECT id, name, type FROM labels WHERE id IN (${allIds.map(() => '?').join(',')})`
        ).all(...allIds)
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

// Push assignments to a screen (by share_code or admin)
router.post('/:token/assignments', (req, res) => {
  const { share_code, musicians, event_name, event_date } = req.body
  const screen = db.prepare('SELECT * FROM screens WHERE token = ?').get(req.params.token)
  if (!screen) return res.status(404).json({ error: 'Screen not found' })

  if (share_code && screen.share_code !== share_code) {
    return res.status(403).json({ error: 'Invalid share code' })
  }

  db.prepare('DELETE FROM active_assignments WHERE screen_id = ?').run(screen.id)
  const insert = db.prepare(`
    INSERT INTO active_assignments (screen_id, person_name, person_photo, slot, position, mic_label, iem_label, event_name, event_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
  db.transaction(() => {
    musicians.forEach((m, i) => insert.run(screen.id, m.name, m.photo ?? null, i, m.position ?? null, m.mic ?? null, m.iem ?? null, event_name ?? null, event_date ?? null))
  })()

  res.json({ ok: true })
})

module.exports = router
