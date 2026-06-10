const { scryptSync, randomBytes, timingSafeEqual } = require('node:crypto')

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':')
  const hashBuf = Buffer.from(hash, 'hex')
  const candidate = scryptSync(password, salt, 64)
  return timingSafeEqual(hashBuf, candidate)
}

module.exports = { hashPassword, verifyPassword }
