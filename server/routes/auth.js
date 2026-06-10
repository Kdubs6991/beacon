const express = require('express')
const router = express.Router()
const { randomBytes } = require('node:crypto')
const db = require('../db')
const { hashPassword, verifyPassword } = require('../utils/password')
const { requireAuth, requireAdmin } = require('../middleware/auth')
const { sendPasswordResetEmail } = require('../utils/mailer')

// ── User auth ─────────────────────────────────────────────────────────────────

router.post('/register', async (req, res) => {
  const { name, email, password, inviteToken } = req.body
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email, and password are required' })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }
  const existing = await db.getOne('SELECT id FROM users WHERE email = ?', [email.toLowerCase()])
  if (existing) {
    return res.status(409).json({ error: 'An account with that email already exists' })
  }

  let org, role = 'team_member'
  if (inviteToken) {
    const invite = await db.getOne(
      'SELECT * FROM invite_tokens WHERE token = ? AND used = 0 AND expires_at > NOW()',
      [inviteToken]
    )
    if (!invite) return res.status(400).json({ error: 'Invalid or expired invite link' })
    org = await db.getOne('SELECT id FROM organizations WHERE id = ?', [invite.org_id])
    role = invite.role
    await db.execute('UPDATE invite_tokens SET used = 1 WHERE token = ?', [inviteToken])
  } else {
    org = await db.getOne('SELECT id FROM organizations LIMIT 1')
  }

  const hash = hashPassword(password)
  const r = await db.execute(
    'INSERT INTO users (org_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?) RETURNING id',
    [org.id, name.trim(), email.toLowerCase(), hash, role]
  )
  const user = await db.getOne(
    'SELECT id, name, email, role, org_id, created_at FROM users WHERE id = ?',
    [r.lastInsertId]
  )
  req.session.userId = user.id
  req.session.role = user.role
  req.session.orgId = user.org_id
  req.session.userLoginAt = new Date().toISOString()
  res.status(201).json({ user })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' })
  }
  const user = await db.getOne('SELECT * FROM users WHERE email = ?', [email.toLowerCase()])
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }
  req.session.userId = user.id
  req.session.role = user.role
  req.session.orgId = user.org_id
  req.session.userLoginAt = new Date().toISOString()
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } })
})

// Clears user login but preserves org session so the user lands on /login not /org
router.post('/logout', (req, res) => {
  delete req.session.userId
  delete req.session.role
  delete req.session.userLoginAt
  req.session.save(() => res.json({ ok: true }))
})

// Clears everything including org — use when the user explicitly signs out of the org
router.post('/logout-org', (req, res) => {
  req.session.destroy()
  res.clearCookie('beacon_org')
  res.json({ ok: true })
})

router.get('/me', async (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: 'Not authenticated' })
  const user = await db.getOne(
    'SELECT id, name, email, role, org_id, created_at FROM users WHERE id = ?',
    [req.session.userId]
  )
  if (!user) {
    req.session.destroy()
    return res.status(401).json({ error: 'Not authenticated' })
  }
  if (!req.session.orgId) {
    req.session.orgId = user.org_id
  }
  res.json({ user })
})

// Returns org from session even when user is not logged in (for persisted org sessions)
router.get('/session-org', async (req, res) => {
  if (!req.session?.orgId) return res.json({ org: null })
  const org = await db.getOne('SELECT id, name, slug FROM organizations WHERE id = ?', [req.session.orgId])
  res.json({ org: org ?? null })
})

// ── Profile management ────────────────────────────────────────────────────────

router.put('/profile', requireAuth, async (req, res) => {
  const { name, email } = req.body
  if (!name || !email) return res.status(400).json({ error: 'name and email are required' })
  const emailLower = email.trim().toLowerCase()
  const conflict = await db.getOne(
    'SELECT id FROM users WHERE email = ? AND id != ?',
    [emailLower, req.session.userId]
  )
  if (conflict) return res.status(409).json({ error: 'That email is already in use' })
  await db.execute('UPDATE users SET name = ?, email = ? WHERE id = ?', [name.trim(), emailLower, req.session.userId])
  const user = await db.getOne(
    'SELECT id, name, email, role, org_id, created_at FROM users WHERE id = ?',
    [req.session.userId]
  )
  res.json({ user })
})

router.put('/password', requireAuth, async (req, res) => {
  const { current, next } = req.body
  if (!current || !next) return res.status(400).json({ error: 'current and next passwords are required' })
  if (next.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' })
  const row = await db.getOne('SELECT password_hash FROM users WHERE id = ?', [req.session.userId])
  if (!verifyPassword(current, row.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' })
  }
  await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(next), req.session.userId])
  res.json({ ok: true })
})

// ── Dashboard config (per-user) ───────────────────────────────────────────────

router.get('/dashboard-config', requireAuth, async (req, res) => {
  const row = await db.getOne('SELECT dashboard_config FROM users WHERE id = ?', [req.session.userId])
  const config = row?.dashboard_config ? JSON.parse(row.dashboard_config) : null
  res.json({ config })
})

router.put('/dashboard-config', requireAuth, async (req, res) => {
  const { config } = req.body
  if (!Array.isArray(config)) return res.status(400).json({ error: 'config must be an array' })
  await db.execute('UPDATE users SET dashboard_config = ? WHERE id = ?', [JSON.stringify(config), req.session.userId])
  res.json({ ok: true })
})

// ── Password reset ────────────────────────────────────────────────────────────

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'email is required' })

  const user = await db.getOne('SELECT * FROM users WHERE email = ?', [email.toLowerCase()])
  if (!user) return res.json({ ok: true })

  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString()
  await db.execute(
    'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
    [user.id, token, expiresAt]
  )

  const org = await db.getOne('SELECT name FROM organizations WHERE id = ?', [user.org_id])
  const origin = req.headers.origin || `http://localhost:${process.env.PORT || 3001}`
  const resetUrl = `${origin}/reset-password?token=${token}`

  try {
    await sendPasswordResetEmail({ to: user.email, orgName: org?.name ?? 'Beacon', resetUrl })
  } catch (err) {
    console.error('[PASSWORD RESET] Email error:', err.message)
  }

  res.json({ ok: true })
})

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body
  if (!token || !password) return res.status(400).json({ error: 'token and password are required' })
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })

  const row = await db.getOne(
    'SELECT * FROM password_reset_tokens WHERE token = ? AND used = 0 AND expires_at > NOW()',
    [token]
  )
  if (!row) return res.status(400).json({ error: 'This reset link is invalid or has expired.' })

  await db.execute('UPDATE users SET password_hash = ? WHERE id = ?', [hashPassword(password), row.user_id])
  await db.execute('UPDATE password_reset_tokens SET used = 1 WHERE id = ?', [row.id])

  res.json({ ok: true })
})

// ── Access code recovery ──────────────────────────────────────────────────────

router.post('/recover-org', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }
  const user = await db.getOne(
    "SELECT * FROM users WHERE email = ? AND role = 'admin'",
    [email.toLowerCase()]
  )
  if (!user || !verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }
  const org = await db.getOne(
    'SELECT id, name, slug, access_code FROM organizations WHERE id = ?',
    [user.org_id]
  )
  if (!org) return res.status(404).json({ error: 'Organization not found' })
  res.json({ slug: org.slug, access_code: org.access_code })
})

// ── Invite tokens (public) ────────────────────────────────────────────────────

router.get('/invite/:token', async (req, res) => {
  const invite = await db.getOne(
    'SELECT * FROM invite_tokens WHERE token = ? AND used = 0 AND expires_at > NOW()',
    [req.params.token]
  )
  if (!invite) return res.status(404).json({ error: 'Invalid or expired invite link' })
  const org = await db.getOne('SELECT id, name, slug FROM organizations WHERE id = ?', [invite.org_id])
  res.json({ invite: { token: invite.token, role: invite.role, email: invite.email, org, expires_at: invite.expires_at } })
})

// ── Planning Center OAuth ─────────────────────────────────────────────────────

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
    await db.execute('DELETE FROM pco_tokens')
    await db.execute(
      'INSERT INTO pco_tokens (access_token, refresh_token, expires_at) VALUES (?, ?, ?)',
      [data.access_token, data.refresh_token, expiresAt]
    )
    res.redirect('/admin/integrations?connected=1')
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/pco/status', async (req, res) => {
  const token = await db.getOne('SELECT id, expires_at FROM pco_tokens ORDER BY id DESC LIMIT 1')
  res.json({
    connected: !!token,
    expiresAt: token?.expires_at ?? null,
    mockMode: process.env.USE_MOCK_DATA === 'true',
    configured: !!(process.env.PCO_CLIENT_ID && process.env.PCO_CLIENT_ID !== 'YOUR_CLIENT_ID_HERE'),
  })
})

router.delete('/pco/disconnect', requireAdmin, async (req, res) => {
  await db.execute('DELETE FROM pco_tokens')
  res.json({ ok: true })
})

module.exports = router
