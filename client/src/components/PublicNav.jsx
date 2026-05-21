import { useState } from 'react'
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
      return raw ? JSON.parse(raw)?.name : null
    } catch { return null }
  })

  function handleSignOutOrg() {
    clearCookie('beacon_org')
    clearCookie('beacon_screen')
    navigate('/org')
  }

  return (
    <nav className={styles.nav}>
      <Link to="/login" className={styles.brand}>Beacon</Link>
      <div className={styles.links}>
        <Link to="/login" className={styles.link}>Sign in</Link>
        <Link to="/display" className={styles.link}>Display Login</Link>
        <Link to="/docs" className={styles.link}>Docs</Link>
        {orgName && (
          <button className={styles.orgBtn} type="button" onClick={handleSignOutOrg}>
            Sign out of {orgName}
          </button>
        )}
      </div>
    </nav>
  )
}
