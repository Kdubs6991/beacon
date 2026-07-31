import { useState, useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import SiteAdminLogin from './SiteAdminLogin'
import _SiteAdminDocs from './SiteAdminDocs'
import _SiteAdminLanding from './SiteAdminLanding'
import _SiteAdminPages from './SiteAdminPages'
import styles from './SiteAdmin.module.css'

async function siteApi(path, opts = {}) {
  const res = await fetch(`/api/site-admin${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Request failed')
  return data
}

function TopBar({ onLogout }) {
  async function handleLogout() {
    await siteApi('/logout', { method: 'POST' }).catch(() => {})
    onLogout()
  }

  return (
    <header className={styles.topBar}>
      <div className={styles.brand}>
        <span className={styles.brandName}>Beacon</span>
        <span className={styles.brandSep} />
        <span className={styles.brandSub}>Site Admin</span>
      </div>
      <div className={styles.topBarRight}>
        <Link to="/studio" className={styles.backLink}>Studio</Link>
        <button className={styles.logoutBtn} onClick={handleLogout}>Sign out</button>
      </div>
    </header>
  )
}

const CARDS = [
  {
    to: '/admin/docs',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    ),
    iconColor: '#60a5fa',
    iconBg: 'rgba(59,130,246,0.12)',
    title: 'Documentation',
    desc: 'Edit sections, update content, and manage the structure of the docs page.',
    cta: 'Open editor',
  },
  {
    to: '/admin/landing',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
    iconColor: '#a78bfa',
    iconBg: 'rgba(167,139,250,0.12)',
    title: 'Landing Page',
    desc: 'Edit the hero, features, how-it-works steps, and other homepage content.',
    cta: 'Open editor',
  },
  {
    to: '/admin/pages',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
    iconColor: '#34d399',
    iconBg: 'rgba(52,211,153,0.12)',
    title: 'Pages',
    desc: 'Create, edit, and delete custom site pages. New pages appear in site navigation automatically.',
    cta: 'Manage pages',
  },
]

function SiteAdminPanel({ onLogout }) {
  return (
    <div className={styles.page}>
      <TopBar onLogout={onLogout} />
      <main className={styles.main}>
        <div className={styles.pageHeader}>
          <h1 className={styles.title}>Website Management</h1>
          <p className={styles.subtitle}>Edit your public-facing content — docs, landing page, and custom pages.</p>
        </div>
        <div className={styles.grid}>
          {CARDS.map(card => (
            <Link key={card.to} to={card.to} className={styles.card}>
              <div className={styles.cardIconWrap} style={{ background: card.iconBg, color: card.iconColor }}>
                {card.icon}
              </div>
              <h2 className={styles.cardTitle}>{card.title}</h2>
              <p className={styles.cardDesc}>{card.desc}</p>
              <span className={styles.cardCta}>{card.cta} →</span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  )
}

// ── Auth wrapper ──────────────────────────────────────────────────────────────
export default function SiteAdmin() {
  const [authenticated, setAuthenticated] = useState(null) // null = loading

  useEffect(() => {
    siteApi('/me')
      .then(data => setAuthenticated(data.authenticated))
      .catch(() => setAuthenticated(false))
  }, [])

  if (authenticated === null) return null // loading — no flash

  if (!authenticated) {
    return <SiteAdminLogin onAuth={() => setAuthenticated(true)} />
  }

  return <SiteAdminPanel onLogout={() => setAuthenticated(false)} />
}

// ── Stub sub-pages ────────────────────────────────────────────────────────────
function StubPage({ title, desc }) {
  const [authenticated, setAuthenticated] = useState(null)

  useEffect(() => {
    siteApi('/me')
      .then(data => setAuthenticated(data.authenticated))
      .catch(() => setAuthenticated(false))
  }, [])

  if (authenticated === null) return null
  if (!authenticated) return <SiteAdminLogin onAuth={() => setAuthenticated(true)} />

  return (
    <div className={styles.page}>
      <TopBar onLogout={() => setAuthenticated(false)} />
      <main className={styles.main}>
        <div className={styles.stubWrap}>
          <Link to="/admin" className={styles.stubBack}>← Site Admin</Link>
          <h1 className={styles.stubTitle}>{title}</h1>
          <p className={styles.stubDesc}>{desc}</p>
          <div className={styles.stubBadge}>Coming soon</div>
        </div>
      </main>
    </div>
  )
}

export function SiteAdminDocs() {
  return <_SiteAdminDocs />
}

export function SiteAdminLanding() {
  return <_SiteAdminLanding />
}

export function SiteAdminPages() {
  return <_SiteAdminPages />
}

export function SiteAdminPageEditor() {
  const { slug } = useParams()
  return (
    <_SiteAdminLanding
      slug={slug}
      pageTitle="Page Editor"
      backPath="/admin/pages"
      previewPath={`/${slug}`}
    />
  )
}
