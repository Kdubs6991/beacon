const express = require('express')
const rateLimit = require('express-rate-limit')
const { sendContactEmail } = require('../utils/mailer')

const router = express.Router()

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many messages sent. Please try again in an hour.' },
})

router.post('/', limiter, async (req, res) => {
  const { name, email, message } = req.body
  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return res.status(400).json({ error: 'All fields are required.' })
  }
  if (message.trim().length > 2000) {
    return res.status(400).json({ error: 'Message must be under 2000 characters.' })
  }
  try {
    await sendContactEmail({ name: name.trim(), email: email.trim(), message: message.trim() })
    res.json({ ok: true })
  } catch (err) {
    console.error('[contact] send failed:', err.message)
    res.status(500).json({ error: 'Failed to send. Please try emailing support@beaconscreen.com directly.' })
  }
})

module.exports = router
