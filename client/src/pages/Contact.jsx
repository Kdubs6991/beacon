import { useState } from 'react'
import { Link } from 'react-router-dom'
import PublicNav from '../components/PublicNav'
import styles from './Contact.module.css'

export default function Contact() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState(null) // null | 'sending' | 'sent' | 'error'
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !message.trim()) return
    setStatus('sending')
    setErrorMsg('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), message: message.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setStatus('error'); setErrorMsg(data.error || 'Failed to send.'); return }
      setStatus('sent')
      setName(''); setEmail(''); setMessage('')
    } catch {
      setStatus('error')
      setErrorMsg('Connection error. Please try again or email us directly.')
    }
  }

  return (
    <div className={styles.page}>
      <PublicNav />

      <div className={styles.backRow}>
        <Link to="/" className={styles.backLink}>← Back to home</Link>
      </div>

      <div className={styles.hero}>
        <div className={styles.heroBadge}>Contact</div>
        <h1 className={styles.heroTitle}>Get in touch</h1>
        <p className={styles.heroDesc}>
          Have a question about Beacon, found a bug, or want to request a feature?
          Send us a message and we'll get back to you.
        </p>
      </div>

      <div className={styles.content}>
        <div className={styles.formCard}>
          {status === 'sent' ? (
            <div className={styles.successState}>
              <div className={styles.successIcon}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="m9 12 2 2 4-4"/>
                </svg>
              </div>
              <h2 className={styles.successTitle}>Message sent!</h2>
              <p className={styles.successDesc}>Thanks for reaching out. We'll get back to you at your email address.</p>
              <button className={styles.resetBtn} onClick={() => setStatus(null)}>Send another message</button>
            </div>
          ) : (
            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.row}>
                <div className={styles.field}>
                  <label className={styles.label}>Name</label>
                  <input
                    className={styles.input}
                    type="text"
                    placeholder="Your name"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    maxLength={100}
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Email</label>
                  <input
                    className={styles.input}
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className={styles.field}>
                <label className={styles.label}>Message</label>
                <textarea
                  className={styles.textarea}
                  placeholder="What's on your mind?"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  required
                  maxLength={2000}
                  rows={6}
                />
                <div className={styles.charCount}>{message.length} / 2000</div>
              </div>
              {status === 'error' && (
                <p className={styles.errorMsg}>{errorMsg}</p>
              )}
              <button className={styles.submitBtn} type="submit" disabled={status === 'sending'}>
                {status === 'sending' ? 'Sending…' : 'Send message'}
              </button>
            </form>
          )}
        </div>

        <p className={styles.directEmail}>
          Or email us directly at{' '}
          <a href="mailto:support@beaconscreen.com" className={styles.directEmailLink}>
            support@beaconscreen.com
          </a>
        </p>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <Link to="/" className={styles.footerBrand}>Beacon</Link>
          <div className={styles.footerLinks}>
            <Link to="/docs"    className={styles.footerLink}>Documentation</Link>
            <Link to="/display" className={styles.footerLink}>Display login</Link>
            <Link to="/org"     className={styles.footerLink}>Admin panel</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
