import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './SiteAdminLogin.module.css'

export default function SiteAdminLogin({ onAuth }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/site-admin/login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Login failed')
      onAuth()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoWrap}>
          <div className={styles.logoIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <div>
            <div className={styles.logoTitle}>Beacon</div>
            <div className={styles.logoSub}>Site Admin</div>
          </div>
        </div>

        <p className={styles.desc}>
          This area controls public website content — documentation, landing page, and custom pages.
          It's separate from Beacon Studio and requires its own password.
        </p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            Site admin password
            <input
              className={styles.input}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              required
              placeholder="••••••••••••"
            />
          </label>
          <button className={styles.submit} type="submit" disabled={loading || !password}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className={styles.footer}>
          <button className={styles.backBtn} onClick={() => navigate('/')}>← Back to site</button>
          <a href="/studio" className={styles.studioLink}>Go to Studio instead →</a>
        </div>
      </div>
    </div>
  )
}
