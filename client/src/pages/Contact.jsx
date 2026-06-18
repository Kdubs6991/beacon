import { useState } from 'react'
import { Link } from 'react-router-dom'
import PublicNav from '../components/PublicNav'
import styles from './Contact.module.css'

function GitHubIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.113.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
}

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
          Have a question about Beacon, found a bug, or just want to say hi?
          Fill out the form below or reach out through one of the links.
        </p>
      </div>

      <div className={styles.main}>
        {/* Left column — social links + mailto */}
        <div className={styles.sidebar}>
          <a href="https://github.com/Kdubs6991" className={styles.linkCard} target="_blank" rel="noopener noreferrer">
            <div className={styles.linkIcon} style={{ background: 'rgba(148,163,184,0.1)', color: '#94a3b8' }}>
              <GitHubIcon />
            </div>
            <div className={styles.linkBody}>
              <div className={styles.linkLabel}>GitHub</div>
              <div className={styles.linkValue}>github.com/Kdubs6991</div>
            </div>
          </a>

          <a href="https://www.linkedin.com/in/kaloob/" className={styles.linkCard} target="_blank" rel="noopener noreferrer">
            <div className={styles.linkIcon} style={{ background: 'rgba(59,130,246,0.1)', color: '#60a5fa' }}>
              <LinkedInIcon />
            </div>
            <div className={styles.linkBody}>
              <div className={styles.linkLabel}>LinkedIn</div>
              <div className={styles.linkValue}>linkedin.com/in/kaloob</div>
            </div>
          </a>

          <div className={styles.directEmail}>
            <p className={styles.directEmailLabel}>Or email us directly</p>
            <a href="mailto:support@beaconscreen.com" className={styles.directEmailLink}>
              support@beaconscreen.com
            </a>
          </div>
        </div>

        {/* Right column — contact form */}
        <div className={styles.formCard}>
          <h2 className={styles.formTitle}>Send a message</h2>
          {status === 'sent' ? (
            <div className={styles.successBox}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
              Message sent! We'll get back to you soon.
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
                <div className={styles.charCount}>{message.length}/2000</div>
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
