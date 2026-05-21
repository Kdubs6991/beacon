const nodemailer = require('nodemailer')

let _transporter = null

function getTransporter() {
  if (_transporter) return _transporter
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null
  _transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587'),
    secure: SMTP_PORT === '465',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
  return _transporter
}

async function sendInviteEmail({ to, orgName, role, inviteUrl }) {
  const t = getTransporter()
  const roleLabel = role === 'admin' ? 'Admin' : 'Team Member'

  if (!t) {
    console.log(`[INVITE] SMTP not configured — invite link for ${to}: ${inviteUrl}`)
    return { sent: false, link: inviteUrl }
  }

  await t.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: `You've been invited to join ${orgName} on Beacon`,
    text: [
      `You've been invited to join ${orgName} on Beacon as a ${roleLabel}.`,
      '',
      'Click the link below to create your account:',
      inviteUrl,
      '',
      'This link expires in 7 days. If you didn\'t expect this invite, you can ignore it.',
    ].join('\n'),
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="margin-bottom:8px">You've been invited</h2>
        <p>You've been invited to join <strong>${orgName}</strong> on Beacon as a <strong>${roleLabel}</strong>.</p>
        <p style="margin:24px 0">
          <a href="${inviteUrl}" style="background:#3b82f6;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">
            Create your account
          </a>
        </p>
        <p style="color:#666;font-size:13px">This link expires in 7 days. If you didn't expect this invite, you can ignore it.</p>
      </div>
    `,
  })

  return { sent: true }
}

async function sendPasswordResetEmail({ to, orgName, resetUrl }) {
  const t = getTransporter()

  if (!t) {
    console.log(`[PASSWORD RESET] SMTP not configured — reset link for ${to}: ${resetUrl}`)
    return { sent: false, link: resetUrl }
  }

  await t.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject: `Reset your Beacon password`,
    text: [
      `You requested a password reset for your Beacon account at ${orgName}.`,
      '',
      'Click the link below to set a new password:',
      resetUrl,
      '',
      'This link expires in 1 hour. If you did not request a reset, you can ignore this email.',
    ].join('\n'),
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
        <h2 style="margin-bottom:8px">Reset your password</h2>
        <p>You requested a password reset for your Beacon account at <strong>${orgName}</strong>.</p>
        <p style="margin:24px 0">
          <a href="${resetUrl}" style="background:#3b82f6;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;display:inline-block">
            Set new password
          </a>
        </p>
        <p style="color:#666;font-size:13px">This link expires in 1 hour. If you didn't request a reset, you can ignore this email.</p>
      </div>
    `,
  })

  return { sent: true }
}

module.exports = { sendInviteEmail, sendPasswordResetEmail }
