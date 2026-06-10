const USER_SESSION_MAX_DAYS = 90

function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  // Auto-expire user portion after 90 days of inactivity
  if (req.session.userLoginAt) {
    const loginAt = new Date(req.session.userLoginAt).getTime()
    if (Date.now() - loginAt > USER_SESSION_MAX_DAYS * 24 * 60 * 60 * 1000) {
      delete req.session.userId
      delete req.session.role
      delete req.session.userLoginAt
      req.session.save(() => {})
      return res.status(401).json({ error: 'Session expired' })
    }
  }
  next()
}

function requireAdmin(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  if (req.session.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' })
  }
  next()
}

module.exports = { requireAuth, requireAdmin }
