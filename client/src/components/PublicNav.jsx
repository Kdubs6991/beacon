import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import styles from './PublicNav.module.css'

function getCookie(name) {
  const m = document.cookie.match('(?:^|;)\\s*' + name + '=([^;]*)')
  return m ? decodeURIComponent(m[1]) : null
}

function clearCookie(name) {
  document.cookie = name + '=; path=/; max-age=0'
}

export default function PublicNav() {
  const navigate = useNavigate()

  const [orgName] = useState(() => {
    try {
      const raw = getCookie('beacon_org')
      const org = raw ? JSON.parse(raw) : null
      return org ? (org.short_name || org.name) : null
    } catch { return null }
  })

  const [adminUser, setAdminUser] = useState(null)

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.user) setAdminUser(data.user) })
      .catch(() => {})
  }, [])

  async function handleSignOutOrg() {
    try { await fetch('/api/auth/logout-org', { method: 'POST', credentials: 'include' }) } catch {}
    clearCookie('beacon_org')
    clearCookie('beacon_screen')
    navigate('/org')
  }

  return (
    <nav className={styles.nav}>
      <Link to="/" className={styles.brand}>Beacon</Link>
      <div className={styles.links}>
        {adminUser ? (
          <Link to="/admin" className={styles.link}>Dashboard</Link>
        ) : (
          <Link to={orgName ? '/login' : '/org'} className={styles.link}>
            {orgName ? 'Sign in' : 'Org login'}
          </Link>
        )}
        <Link to="/display?setup=1" className={styles.link}>Display</Link>
        <Link to="/docs" className={`${styles.link} ${styles.linkDocs}`}>Docs</Link>
        {orgName && (
          <button className={styles.orgBtn} type="button" onClick={handleSignOutOrg}>
            {orgName} · sign out
          </button>
        )}
      </div>
    </nav>
  )
}
