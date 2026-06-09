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
      const org = raw ? JSON.parse(raw) : null
      return org ? (org.short_name || org.name) : null
    } catch { return null }
  })

  function handleSignOutOrg() {
    clearCookie('beacon_org')
    clearCookie('beacon_screen')
    navigate('/org')
  }

  return (
    <nav className={styles.nav}>
      <Link to={orgName ? '/login' : '/org'} className={styles.brand}>Beacon</Link>
      <div className={styles.links}>
        <Link to={orgName ? '/login' : '/org'} className={styles.link}>
          {orgName ? 'Sign in' : 'Org login'}
        </Link>
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
