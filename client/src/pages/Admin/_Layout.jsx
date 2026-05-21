import { useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import styles from './_Layout.module.css'

function getOrgFromCookie() {
  const m = document.cookie.match(/(^| )beacon_org=([^;]+)/)
  if (!m) return null
  try { return JSON.parse(decodeURIComponent(m[2])) } catch { return null }
}

function useTheme() {
  const [theme, setTheme] = useState(() => localStorage.getItem('beacon-theme') || 'dark')
  function toggle() {
    setTheme(prev => {
      const next = prev === 'dark' ? 'light' : 'dark'
      if (next === 'light') {
        document.documentElement.setAttribute('data-theme', 'light')
        localStorage.setItem('beacon-theme', 'light')
      } else {
        document.documentElement.removeAttribute('data-theme')
        localStorage.setItem('beacon-theme', 'dark')
      }
      return next
    })
  }
  return { theme, toggle }
}

const NAV_ITEMS = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/locations', label: 'Locations' },
  { to: '/admin/templates', label: 'Templates' },
  { to: '/admin/people', label: 'People' },
  { to: '/admin/labels', label: 'Labels' },
  { to: '/admin/automation', label: 'Automation' },
  { to: '/admin/screens', label: 'Screens' },
  { to: '/admin/schedules', label: 'Services' },
  null,
  { to: '/admin/organization', label: 'Organization', adminOnly: true },
  { to: '/admin/users', label: 'Users', adminOnly: true },
  { to: '/admin/integrations', label: 'Integrations', adminOnly: true },
]

export default function AdminLayout({ title, children }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const { theme, toggle: toggleTheme } = useTheme()
  const org = getOrgFromCookie()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  function closeSidebar() { setSidebarOpen(false) }

  return (
    <div className={styles.shell}>
      {sidebarOpen && <div className={styles.overlay} onClick={closeSidebar} />}

      <nav className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.brand}>Beacon</div>

        <ul className={styles.navList}>
          {NAV_ITEMS.map((item, i) => {
            if (item === null) return <li key={`sep-${i}`} className={styles.separator} />
            if (item.adminOnly && user?.role !== 'admin') return null
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) => `${styles.navLink} ${isActive ? styles.active : ''}`}
                  onClick={closeSidebar}
                >
                  {item.label}
                </NavLink>
              </li>
            )
          })}
        </ul>

        <div className={styles.userArea}>
          <NavLink to="/admin/profile" className={styles.userInfo} onClick={closeSidebar}>
            <span className={styles.userName}>{user?.name}</span>
            <span className={styles.userRole}>{user?.role}</span>
          </NavLink>
          <button className={styles.logoutBtn} onClick={handleLogout} title="Sign out">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </nav>

      <div className={styles.content}>
        <header className={styles.pageHeader}>
          <div className={styles.pageHeaderLeft}>
            <button
              className={styles.hamburger}
              onClick={() => setSidebarOpen(o => !o)}
              aria-label="Toggle menu"
            >
              <span /><span /><span />
            </button>
            <h1 className={styles.pageTitle}>{title}</h1>
          </div>
          <div className={styles.headerRight}>
            {org?.name && (
              <span className={styles.headerOrg}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                </svg>
                {org.name}
              </span>
            )}
            <Link to="/docs" className={styles.docsLink} title="Documentation">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
              Docs
            </Link>
            <button className={styles.themeToggle} onClick={toggleTheme} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
              {theme === 'dark' ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
          </div>
        </header>
        <main className={styles.pageBody}>
          {children}
        </main>
      </div>
    </div>
  )
}
