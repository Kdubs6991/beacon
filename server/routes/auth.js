const express = require('express')
const router = express.Router()
const { randomBytes } = require('node:crypto')
const db = require('../db')
const { hashPassword, verifyPassword } = require('../utils/password')
const { requireAuth, requireAdmin } = require('../middleware/auth')
const { sendPasswordResetEmail } = require('../utils/mailer')

// ── User auth ─────────────────────────────────────────────────────────────────

router.post('/register', (req, res) => {
  const { name, email, password, inviteToken } = req.body
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase())
  if (existing) {
    return res.status(409).json({ error: 'An account with that email already exists' })
  }

  let org, role = 'team_member'
  if (inviteToken) {
    const invite = db.prepare(
      `SELECT * FROM invite_tokens WHERE token = ? AND used = 0 AND expires_at > datetime('now')`
    ).get(inviteToken)
    if (!invite) return res.status(400).json({ error: 'Invalid or expired invite link' })
    org = db.prepare('SELECT id FROM organizations WHERE id = ?').get(invite.org_id)
    role = invite.role
    db.prepare('UPDATE invite_tokens SET used = 1 WHERE token = ?').run(inviteToken)
  } else {
    org = db.prepare('SELECT id FROM organizations LIMIT 1').get()
  }

  const hash = hashPassword(password)
  const r = db.prepare(
    'INSERT INTO users (org_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)'
  ).run(org.id, name.trim(), email.toLowerCase(), hash, role)
  const user = db.prepare('SELECT id, name, email, role, org_id, created_at FROM users WHERE id = ?').get(Number(r.lastInsertRowid))
  req.session.userId = user.id
  req.session.role = user.role
  req.session.orgId = user.org_id
  res.status(201).json({ user })
})

router.post('/login', (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' })
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase())
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }
  req.session.userId = user.id
  req.session.role = user.role
  req.session.orgId = user.org_id
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } })
})

router.post('/logout', (req, res) => {
  req.session.destroy()
  res.json({ ok: true })
})

router.get('/me', (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: 'Not authenticated' })
  const user = db.prepare('SELECT id, name, email, role, org_id, created_at FROM users WHERE id = ?').get(req.session.userId)
  if (!user) {
    req.session.destroy()
    return res.status(401).json({ error: 'Not authenticated' })
  }
  if (!req.session.orgId) {
    req.session.orgId = user.org_id
  }
  res.json({ user })
})

// ── Profile management ────────────────────────────────────────────────────────

router.put('/profile', requireAuth, (req, res) => {
  const { name, email } = req.body
  if (!name || !email) return res.status(400).json({ error: 'name and email are required' })
  const emailLower = email.trim().toLowerCase()
  const conflict = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(emailLower, req.session.userId)
  if (conflict) return res.status(409).json({ error: 'That email is already in use' })
  db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(name.trim(), emailLower, req.session.userId)
  const user = db.prepare('SELECT id, name, email, role, org_id, created_at FROM users WHERE id = ?').get(req.session.userId)
  res.json({ user })
})

router.put('/password', requireAuth, (req, res) => {
  const { current, next } = req.body
  if (!current || !next) return res.status(400).json({ error: 'current and next passwords are required' })
  if (next.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' })
  const row = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.session.userId)
  if (!verifyPassword(current, row.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' })
  }
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(next), req.session.userId)
  res.json({ ok: true })
})

// ── Dashboard config (per-user) ───────────────────────────────────────────────

router.get('/dashboard-config', requireAuth, (req, res) => {
  const row = db.prepare('SELECT dashboard_config FROM users WHERE id = ?').get(req.session.userId)
  const config = row?.dashboard_config ? JSON.parse(row.dashboard_config) : null
  res.json({ config })
})

router.put('/dashboard-config', requireAuth, (req, res) => {
  const { config } = req.body
  if (!Array.isArray(config)) return res.status(400).json({ error: 'config must be an array' })
  db.prepare('UPDATE users SET dashboard_config = ? WHERE id = ?').run(JSON.stringify(config), req.session.userId)
  res.json({ ok: true })
})

// ── Password reset ────────────────────────────────────────────────────────────

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'email is required' })

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase())
  // Always respond OK so we don't reveal whether an email is registered
  if (!user) return res.json({ ok: true })

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  db.prepare(
    'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)'
  ).run(user.id, token, expiresAt)

  const org = db.prepare('SELECT name FROM organizations WHERE id = ?').get(user.org_id)
  const origin = req.headers.origin || `http://localhost:${process.env.PORT || 3001}`
  const resetUrl = `${origin}/reset-password?token=${token}`

  try {
    await sendPasswordResetEmail({ to: user.email, orgName: org?.name ?? 'Beacon', resetUrl })
  } catch (err) {
    console.error('[PASSWORD RESET] Email error:', err.message)
  }

  res.json({ ok: true })
})

router.post('/reset-password', (req, res) => {
  const { token, password } = req.body
  if (!token || !password) return res.status(400).json({ error: 'token and password are required' })
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })

  const row = db.prepare(
    `SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > datetime('now')`
  ).get(token)
  if (!row) return res.status(400).json({ error: 'This reset link is invalid or has expired.' })

  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(password), row.user_id)
  db.prepare('UPDATE password_reset_tokens SET used = 1 WHERE id = ?').run(row.id)

  res.json({ ok: true })
})

// ── Access code recovery ──────────────────────────────────────────────────────

router.post('/recover-org', (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND role = ?').get(email.toLowerCase(), 'admin')
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }
  const org = db.prepare('SELECT id, name, slug, access_code FROM organizations WHERE id = ?').get(user.org_id)
  if (!org) return res.status(404).json({ error: 'Organization not found' })
  res.json({ slug: org.slug, access_code: org.access_code })
})

// ── Invite tokens (public) ────────────────────────────────────────────────────

router.get('/invite/:token', (req, res) => {
  const invite = db.prepare(
    `SELECT * FROM invite_tokens WHERE token = ? AND used = 0 AND expires_at > datetime('now')`
  ).get(req.params.token)
  if (!invite) return res.status(404).json({ error: 'Invalid or expired invite link' })
  const org = db.prepare('SELECT id, name, slug FROM organizations WHERE id = ?').get(invite.org_id)
  res.json({ invite: { token: invite.token, role: invite.role, email: invite.email, org, expires_at: invite.expires_at } })
})

// ── Planning Center OAuth (stub — wired up once credentials are set) ──────────

const PCO_AUTH_URL = 'https://api.planningcenteronline.com/oauth/authorize'
const PCO_TOKEN_URL = 'https://api.planningcenteronline.com/oauth/token'

router.get('/pco/connect', requireAdmin, (req, res) => {
  if (!process.env.PCO_CLIENT_ID || process.env.PCO_CLIENT_ID === 'YOUR_CLIENT_ID_HERE') {
    return res.status(503).json({ error: 'PCO OAuth not configured. Set PCO_CLIENT_ID in .env' })
  }
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.PCO_CLIENT_ID,
    redirect_uri: process.env.PCO_REDIRECT_URI,
    scope: 'services people',
  })
  res.redirect(`${PCO_AUTH_URL}?${params}`)
})

router.get('/pco/callback', async (req, res) => {
  const { code } = req.query
  if (!code) return res.status(400).json({ error: 'Missing code' })
  try {
    const tokenRes = await fetch(PCO_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        client_id: process.env.PCO_CLIENT_ID,
        client_secret: process.env.PCO_CLIENT_SECRET,
        redirect_uri: process.env.PCO_REDIRECT_URI,
      }),
    })
    const data = await tokenRes.json()
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()
    db.prepare('DELETE FROM pco_tokens').run()
    db.prepare(
      'INSERT INTO pco_tokens (access_token, refresh_token, expires_at) VALUES (?, ?, ?)'
    ).run(data.access_token, data.refresh_token, expiresAt)
    res.redirect('/admin/integrations?connected=1')
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/pco/status', (req, res) => {
  const token = db.prepare('SELECT id, expires_at FROM pco_tokens ORDER BY id DESC LIMIT 1').get()
  res.json({
    connected: !!token,
    expiresAt: token?.expires_at ?? null,
    mockMode: process.env.USE_MOCK_DATA === 'true',
    configured: !!(process.env.PCO_CLIENT_ID && process.env.PCO_CLIENT_ID !== 'YOUR_CLIENT_ID_HERE'),
  })
})

router.delete('/pco/disconnect', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM pco_tokens').run()
  res.json({ ok: true })
})

module.exports = router
