import { useState } from 'react'
import { Link } from 'react-router-dom'
import PublicNav from '../components/PublicNav'
import styles from './Auth.module.css'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Something went wrong'); return }
      setSent(true)
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PublicNav />
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.brand}>Beacon</div>

          {sent ? (
            <>
              <h1 className={styles.title}>Check your email</h1>
              <p className={styles.subtitle}>
                If an account exists for <strong>{email}</strong>, we sent a password reset link.
                Check your inbox and follow the link to set a new password.
              </p>
              <p className={styles.subtitle} style={{ marginTop: 12 }}>
                Didn't get it? Check your spam folder, or{' '}
                <button
                  style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', padding: 0, font: 'inherit', fontSize: '0.8rem' }}
                  onClick={() => setSent(false)}
                >
                  try again
                </button>.
              </p>
            </>
          ) : (
            <>
              <h1 className={styles.title}>Forgot password?</h1>
              <p className={styles.subtitle}>Enter your email and we'll send you a reset link.</p>

              {error && <div className={styles.errorBanner}>{error}</div>}

              <form onSubmit={handleSubmit} className={styles.form}>
                <label className={styles.label}>
                  Email
                  <input
                    className={styles.input}
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                    autoFocus
                    required
                  />
                </label>
                <button className={styles.submit} type="submit" disabled={loading}>
                  {loading ? 'Sending…' : 'Send reset link'}
                </button>
              </form>
            </>
          )}

          <div className={styles.footer}>
            <Link to="/login">Back to sign in</Link>
          </div>
        </div>
      </div>
    </>
  )
}
