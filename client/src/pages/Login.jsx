import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PublicNav from '../components/PublicNav'
import styles from './Auth.module.css'

function getCookie(name) {
  const m = document.cookie.match('(?:^|;)\\s*' + name + '=([^;]*)')
  return m ? decodeURIComponent(m[1]) : null
}

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/setup/status')
      .then(r => r.json())
      .then(data => { if (!data.complete) navigate('/setup', { replace: true }) })
      .catch(() => {})

    if (!getCookie('beacon_org')) navigate('/org', { replace: true })
  }, [navigate])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const user = await login(email, password)
      navigate('/admin')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PublicNav />
      <div className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>Sign in</h1>

          {error && <div className={styles.errorBanner}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.label}>
              Email
              <input className={styles.input} type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" required />
            </label>
            <label className={styles.label}>
              Password
              <input className={styles.input} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
            </label>
            <button className={styles.submit} type="submit" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className={styles.footer}>
            <Link to="/forgot-password">Forgot password?</Link>
          </p>
          <p className={styles.footer}>
            Don't have an account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </>
  )
}
