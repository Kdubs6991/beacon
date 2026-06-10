require('dotenv').config()
const express = require('express')
const session = require('express-session')
const pgSession = require('connect-pg-simple')(session)
const cors = require('cors')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

if (!process.env.SESSION_SECRET) {
  console.warn('[beacon] WARNING: SESSION_SECRET is not set. Sessions will not persist across restarts.')
  process.env.SESSION_SECRET = crypto.randomBytes(32).toString('hex')
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

app.set('trust proxy', 1)

const clientDist = path.join(__dirname, '../client/dist')
const hasBuiltClient = fs.existsSync(clientDist)

app.use(cors({
  origin: hasBuiltClient ? false : true,
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(session({
  store: new pgSession({
    pool: db.pool,
    tableName: 'sessions',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 90 * 24 * 60 * 60 * 1000,
    sameSite: 'lax',
  },
}))

app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.use('/api/auth', authRoutes)
app.use('/api/pco', pcoRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/display', displayRoutes)
app.use('/api/org', orgRoutes)
app.use('/api/setup', setupRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

if (hasBuiltClient) {
  app.use(express.static(clientDist))
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'))
  })
}

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  const name = process.env.ADMIN_NAME || 'Admin'
  if (!email || !password) return
  const existing = await db.getOne('SELECT id FROM users WHERE email = ?', [email.toLowerCase()])
  if (!existing) {
    const org = await db.getOne('SELECT id FROM organizations LIMIT 1')
    await db.execute(
      'INSERT INTO users (org_id, name, email, password_hash, role) VALUES (?, ?, ?, ?, ?)',
      [org.id, name, email.toLowerCase(), hashPassword(password), 'admin']
    )
    console.log(`Admin account seeded: ${email}`)
  }
}

db.init().then(async () => {
  await seedAdmin()
  startScheduler()

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
  })
}).catch(err => {
  console.error('[beacon] Failed to initialize database:', err.message)
  process.exit(1)
})
