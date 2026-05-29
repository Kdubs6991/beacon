import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PublicNav from '../components/PublicNav'
import styles from './Auth.module.css'

export default function Register() {
  const { setUser } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const inviteToken = searchParams.get('invite')

  const [invite, setInvite] = useState(null)
  const [inviteError, setInviteError] = useState(null)
  const [inviteLoading, setInviteLoading] = useState(!!inviteToken)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  useEffect(() => {
    if (invite?.email) setEmail(invite.email)
  }, [invite])
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!inviteToken) return
    fetch(`/api/auth/invite/${inviteToken}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setInviteError(data.error); return }
        setInvite(data.invite)
      })
      .catch(() => setInviteError('Could not validate invite link'))
      .finally(() => setInviteLoading(false))
  }, [inviteToken])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name, email, password, inviteToken: inviteToken || undefined }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Registration failed')
      setUser(data.user)
      navigate('/admin')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (inviteLoading) {
    return (
      <>
        <PublicNav />
        <div className={styles.page}>
          <div className={styles.card}>
            <p className={styles.subtitle}>Validating invite link…</p>
          </div>
        </div>
      </>
    )
  }

  if (inviteError) {
    return (
      <>
        <PublicNav />
        <div className={styles.page}>
          <div className={styles.card}>
            <div className={styles.errorBanner}>{inviteError}</div>
            <p className={styles.footer}><Link to="/login">Back to sign in</Link></p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <PublicNav />
      <div className={styles.page}>
        <div className={styles.card}>
          <h1 className={styles.title}>Create account</h1>
          {invite ? (
            <p className={styles.subtitle}>
              You've been invited to join <strong>{invite.org.name}</strong> as a <strong>{invite.role === 'admin' ? 'Admin' : 'Team Member'}</strong>.
            </p>
          ) : (
            <p className={styles.subtitle}>New accounts start with team member access. An admin can promote you.</p>
          )}

          {error && <div className={styles.errorBanner}>{error}</div>}

          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.label}>
              Name
              <input className={styles.input} type="text" value={name} onChange={e => setName(e.target.value)} autoComplete="name" autoFocus required />
            </label>
            <label className={styles.label}>
              Email
              <input
                className={styles.input}
                type="email"
                value={email}
                onChange={e => !invite?.email && setEmail(e.target.value)}
                readOnly={!!invite?.email}
                autoComplete="email"
                required
              />
            </label>
            <label className={styles.label}>
              Password <span className={styles.hint}>(min 8 characters)</span>
              <input className={styles.input} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="new-password" minLength={8} required />
            </label>
            <button className={styles.submit} type="submit" disabled={loading}>
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className={styles.footer}>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </>
  )
}
