const db = require('../db')

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

async function getSmtpConfig() {
  // Env vars take full priority — if SMTP_HOST is set, skip the DB entirely
  if (process.env.SMTP_HOST) {
    return {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
      from: process.env.SMTP_FROM,
    }
  }
  // No env vars — fall back to DB (local dev / self-hosted)
  async function s(key) { return (await db.getOne('SELECT value FROM settings WHERE key = ?', [key]))?.value }
  const host = await s('smtp_host')
  if (!host) return null
  return {
    host,
    port: parseInt((await s('smtp_port')) || '587'),
    user: await s('smtp_user'),
    pass: await s('smtp_pass'),
    from: await s('smtp_from'),
  }
}

async function isSmtpConfigured() {
  const c = await getSmtpConfig()
  return !!(c?.host && c?.user && c?.pass)
}

// ---------------------------------------------------------------------------
// Sending — Resend HTTP API or nodemailer SMTP
// ---------------------------------------------------------------------------

async function sendEmail({ to, subject, text, html, replyTo }) {
  const c = await getSmtpConfig()
  if (!c?.host || !c?.pass) {
    console.log('[mailer] not configured — no host/pass')
    return { sent: false }
  }

  const from = c.from || c.user || 'noreply@beaconscreen.com'

  // Use Resend HTTP API when pointed at Resend — bypasses SMTP port blocking
  if (c.host === 'smtp.resend.com') {
    console.log(`[mailer] sending via Resend API to ${to}`)
    const { Resend } = require('resend')
    const resend = new Resend(c.pass)
    const payload = { from, to, subject, text, html }
    if (replyTo) payload.replyTo = replyTo
    const { data, error } = await resend.emails.send(payload)
    if (error) {
      console.error('[mailer] Resend API error:', error)
      throw new Error(error.message || JSON.stringify(error))
    }
    console.log('[mailer] Resend API sent, id:', data?.id)
    return { sent: true }
  }

  // Fallback: nodemailer SMTP (local dev / other providers)
  console.log(`[mailer] sending via SMTP ${c.host}:${c.port} to ${to}`)
  const nodemailer = require('nodemailer')
  const dns = require('dns')
  function lookupIPv4(hostname, _opts, callback) {
    dns.resolve4(hostname, (err, addresses) => {
      if (err) return callback(err)
      callback(null, addresses[0], 4)
    })
  }
  const t = nodemailer.createTransport({
    host: c.host,
    port: c.port,
    secure: c.port === 465,
    auth: { user: c.user, pass: c.pass },
    connectionTimeout: 30_000,
    greetingTimeout: 30_000,
    socketTimeout: 30_000,
    lookup: lookupIPv4,
  })
  await t.sendMail({ from, to, subject, text, html, replyTo })
  return { sent: true }
}

async function sendContactEmail({ name, email, message }) {
  const escaped = message.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>')
  const html = emailWrapper({
    preheader: `New contact form message from ${name}`,
    headerLabel: 'Contact Form',
    body: `
      <h1 style="margin:0 0 20px;font-size:20px;font-weight:700;color:#0f172a;">New message from the contact form</h1>
      <table cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:20px;">
        <tr><td style="padding:6px 0;font-size:14px;color:#64748b;width:80px;vertical-align:top;">Name</td>
            <td style="padding:6px 0;font-size:14px;color:#0f172a;font-weight:600;">${name}</td></tr>
        <tr><td style="padding:6px 0;font-size:14px;color:#64748b;vertical-align:top;">Reply to</td>
            <td style="padding:6px 0;font-size:14px;"><a href="mailto:${email}" style="color:#3b82f6;">${email}</a></td></tr>
      </table>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:18px;">
        <p style="margin:0;font-size:14px;color:#334155;line-height:1.7;">${escaped}</p>
      </div>
    `,
    footerText: 'Sent via the Beacon contact form at beaconscreen.com.',
  })
  return sendEmail({
    to: 'support@beaconscreen.com',
    subject: `Contact: ${name}`,
    text: `From: ${name} <${email}>\n\n${message}`,
    html,
    replyTo: `${name} <${email}>`,
  })
}

// ---------------------------------------------------------------------------
// HTML wrapper
// ---------------------------------------------------------------------------

function emailWrapper({ preheader, headerLabel, body, footerText }) {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${headerLabel}</title>
  <style>:root { color-scheme: light only; }</style>
</head>
<body style="margin:0;padding:0;background:#e8edf3;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;" bgcolor="#e8edf3">
  <span style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</span>
  <table width="100%" cellpadding="0" cellspacing="0" bgcolor="#e8edf3" style="background:#e8edf3;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr>
          <td bgcolor="#1e2433" style="background:#1e2433;border-radius:10px 10px 0 0;padding:24px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">Beacon</span>
                  <span style="font-size:11px;font-weight:600;color:#8899b4;margin-left:10px;text-transform:uppercase;letter-spacing:0.08em;">Worship Display</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td bgcolor="#ffffff" style="background:#ffffff;padding:32px;border-left:1px solid #d1d9e0;border-right:1px solid #d1d9e0;">
            ${body}
          </td>
        </tr>
        <tr>
          <td bgcolor="#f0f4f8" style="background:#f0f4f8;border:1px solid #d1d9e0;border-top:none;border-radius:0 0 10px 10px;padding:16px 32px;">
            <p style="margin:0;font-size:12px;color:#8899b4;line-height:1.6;">${footerText}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Public send functions
// ---------------------------------------------------------------------------

async function sendInviteEmail({ to, orgName, role, inviteUrl }) {
  const roleLabel = role === 'admin' ? 'Admin' : 'Team Member'
  const c = await getSmtpConfig()
  if (!c?.host || !c?.pass) {
    console.log(`[invite] not configured — link: ${inviteUrl}`)
    return { sent: false, link: inviteUrl }
  }

  const html = emailWrapper({
    preheader: `You've been invited to join ${orgName} on Beacon as a ${roleLabel}.`,
    headerLabel: 'Team Invitation',
    body: `
      <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">You're invited to join</h1>
      <p style="margin:0 0 24px;font-size:24px;font-weight:800;color:#3b82f6;">${orgName}</p>
      <p style="margin:0 0 6px;font-size:15px;color:#334155;line-height:1.6;">
        You've been added as a <strong style="color:#0f172a;">${roleLabel}</strong> on Beacon, the worship team display app used by <strong style="color:#0f172a;">${orgName}</strong>.
      </p>
      <p style="margin:0 0 28px;font-size:15px;color:#334155;line-height:1.6;">
        Click the button below to create your account and get started.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
        <tr>
          <td style="background:#3b82f6;border-radius:8px;">
            <a href="${inviteUrl}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:-0.1px;">
              Create your account →
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:0;font-size:13px;color:#64748b;line-height:1.5;">
        Or copy this link into your browser:<br />
        <span style="color:#3b82f6;word-break:break-all;">${inviteUrl}</span>
      </p>
    `,
    footerText: `This invite link expires in <strong>7 days</strong>. If you weren't expecting this email, you can safely ignore it — no account will be created unless you click the link above.`,
  })

  await sendEmail({
    to,
    subject: `You've been invited to join ${orgName} on Beacon`,
    text: [
      `You've been invited to join ${orgName} on Beacon as a ${roleLabel}.`,
      '', 'Click the link below to create your account:', inviteUrl,
      '', "This link expires in 7 days. If you weren't expecting this, you can ignore it.",
    ].join('\n'),
    html,
  })
  return { sent: true }
}

async function sendPasswordResetEmail({ to, orgName, resetUrl }) {
  const c = await getSmtpConfig()
  if (!c?.host || !c?.pass) {
    console.log(`[reset] not configured — link: ${resetUrl}`)
    return { sent: false, link: resetUrl }
  }

  const html = emailWrapper({
    preheader: `Reset your Beacon password for ${orgName}. This link expires in 1 hour.`,
    headerLabel: 'Password Reset',
    body: `
      <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#0f172a;line-height:1.3;">Reset your password</h1>
      <p style="margin:0 0 24px;font-size:15px;color:#334155;line-height:1.6;">
        We received a request to reset the password for your Beacon account at <strong style="color:#0f172a;">${orgName}</strong>.
        Click the button below to choose a new password.
      </p>
      <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
        <tr>
          <td style="background:#3b82f6;border-radius:8px;">
            <a href="${resetUrl}" style="display:inline-block;padding:13px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:-0.1px;">
              Set new password →
            </a>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 16px;font-size:13px;color:#64748b;line-height:1.5;">
        Or copy this link into your browser:<br />
        <span style="color:#3b82f6;word-break:break-all;">${resetUrl}</span>
      </p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="background:#fef9ec;border:1px solid #fde68a;border-radius:6px;padding:12px 14px;">
            <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;">
              <strong>Didn't request this?</strong> Your password has not been changed. You can safely ignore this email.
            </p>
          </td>
        </tr>
      </table>
    `,
    footerText: `This link expires in <strong>1 hour</strong>. For security, never share this link with anyone.`,
  })

  await sendEmail({
    to,
    subject: `Reset your Beacon password`,
    text: [
      `You requested a password reset for your Beacon account at ${orgName}.`,
      '', 'Click the link below to set a new password:', resetUrl,
      '', 'This link expires in 1 hour. If you did not request a reset, you can safely ignore this email.',
    ].join('\n'),
    html,
  })
  return { sent: true }
}

module.exports = { sendInviteEmail, sendPasswordResetEmail, sendContactEmail, isSmtpConfigured }
