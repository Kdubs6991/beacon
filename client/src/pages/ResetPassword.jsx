import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import PublicNav from '../components/PublicNav'
import styles from './Auth.module.css'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!token) navigate('/forgot-password', { replace: true })
  }, [token, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    if (password !== confirm) { setError('Passwords do not match'); return }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Reset failed'); return }
      setDone(true)
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

          {done ? (
            <>
              <h1 className={styles.title}>Password updated</h1>
              <p className={styles.subtitle}>Your password has been reset. You can now sign in with your new password.</p>
              <Link to="/login" className={styles.submit} style={{ display: 'block', textAlign: 'center', marginTop: 20, textDecoration: 'none' }}>
                Sign in
              </Link>
            </>
          ) : (
            <>
              <h1 className={styles.title}>Set new password</h1>
              <p className={styles.subtitle}>Choose a new password for your account.</p>

              {error && <div className={styles.errorBanner}>{error}</div>}

              <form onSubmit={handleSubmit} className={styles.form}>
                <label className={styles.label}>
                  New password
                  <span className={styles.hint}>Minimum 8 characters</span>
                  <input
                    className={styles.input}
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="new-password"
                    autoFocus
                    required
                    minLength={8}
                  />
                </label>
                <label className={styles.label}>
                  Confirm password
                  <input
                    className={styles.input}
                    type="password"
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </label>
                <button className={styles.submit} type="submit" disabled={loading}>
                  {loading ? 'Saving…' : 'Set new password'}
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
