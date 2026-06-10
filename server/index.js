require('dotenv').config()
const express = require('express')
const cors = require('cors')
const session = require('express-session')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

// Auto-generate SESSION_SECRET on first run if not set
if (!process.env.SESSION_SECRET) {
  const generated = crypto.randomBytes(32).toString('hex')
  process.env.SESSION_SECRET = generated
  const envPath = path.join(__dirname, '.env')
  try {
    const existing = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : ''
    if (!existing.includes('SESSION_SECRET=')) {
      fs.appendFileSync(envPath, `\nSESSION_SECRET=${generated}\n`)
      console.log('[beacon] Generated SESSION_SECRET and saved to server/.env')
    }
  } catch (_) {
    // Read-only filesystem — secret is in memory only for this session
  }
}

const db = require('./db')
const { hashPassword } = require('./utils/password')
const { startScheduler } = require('./scheduler')

const authRoutes = require('./routes/auth')
const pcoRoutes = require('./routes/pco')
const adminRoutes = require('./routes/admin')
const displayRoutes = require('./routes/display')
const orgRoutes = require('./routes/org')
const setupRoutes = require('./routes/setup')

const app = express()
const PORT = process.env.PORT || 3001

// Serve the built client if it exists (production / local install)
// Otherwise fall through to dev CORS (Vite runs separately on :5173)
const clientDist = path.join(__dirname, '../client/dist')
const hasBuiltClient = fs.existsSync(clientDist)

app.use(cors({
  origin: hasBuiltClient ? false : true,
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 7 * 24 * 60 * 60 * 1000 }
}))

app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.use('/api/auth', authRoutes)
app.use('/api/pco', pcoRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/display', displayRoutes)
app.use('/api/org', orgRoutes)
app.use('/api/setup', setupRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mock: process.env.USE_MOCK_DATA === 'true' })
})

if (hasBuiltClient) {
  app.use(express.static(clientDist))
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'))
  })
}

function seedAdmin() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  const name = process.env.ADMIN_NAME || 'Admin'
  if (!email || !password) return
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase())
  if (!existing) {
    const org = db.prepare('SELECT id FROM organizations LIMIT 1').get()
    db.prepare('INSERT INTO users (org_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)').run(
      org.id, name, email.toLowerCase(), hashPassword(password), 'admin'
    )
    console.log(`Admin account seeded: ${email}`)
  }
}

app.listen(PORT, () => {
  const { networkInterfaces } = require('os')
  const nets = networkInterfaces()
  const networkIPs = []
  for (const iface of Object.values(nets)) {
    for (const net of iface) {
      if (net.family === 'IPv4' && !net.internal) networkIPs.push(net.address)
    }
  }
  console.log(`\nBeacon running on http://localhost:${PORT}`)
  networkIPs.forEach(ip => console.log(`  Network:   http://${ip}:${PORT}`))
  if (!hasBuiltClient) console.log(`  Dev mode:  frontend on http://localhost:5173`)
  console.log()
  seedAdmin()
  startScheduler()
})
