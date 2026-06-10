require('dotenv').config()
const db = require('./db')

const PCO_BASE = 'https://api.planningcenteronline.com'

async function getStoredToken() {
  return db.getOne('SELECT * FROM pco_tokens ORDER BY id DESC LIMIT 1')
}

async function refreshToken(token) {
  const res = await fetch(`${PCO_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'refresh_token',
      refresh_token: token.refresh_token,
      client_id: process.env.PCO_CLIENT_ID,
      client_secret: process.env.PCO_CLIENT_SECRET,
    }),
  })
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`)
  const data = await res.json()
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString()
  await db.execute(
    'UPDATE pco_tokens SET access_token = ?, refresh_token = ?, expires_at = ? WHERE id = ?',
    [data.access_token, data.refresh_token, expiresAt, token.id]
  )
  return { ...token, access_token: data.access_token, expires_at: expiresAt }
}

async function getAccessToken() {
  let token = await getStoredToken()
  if (!token) throw new Error('Not authenticated with Planning Center')
  if (new Date(token.expires_at) < new Date(Date.now() + 60_000)) {
    token = await refreshToken(token)
  }
  return token.access_token
}

async function pcoGet(path) {
  if (process.env.USE_MOCK_DATA === 'true') {
    throw new Error('Mock mode — PCO calls disabled')
  }
  const accessToken = await getAccessToken()
  const res = await fetch(`${PCO_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) throw new Error(`PCO request failed: ${res.status} ${path}`)
  return res.json()
}

module.exports = { pcoGet, getAccessToken }
