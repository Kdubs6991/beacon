import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import styles from './SiteAdmin.module.css'

function TopBar() {
  const { user } = useAuth()
  return (
    <header className={styles.topBar}>
      <div className={styles.brand}>
        <span className={styles.brandName}>Beacon</span>
        <span className={styles.brandSep} />
        <span className={styles.brandSub}>Site Admin</span>
      </div>
      <div className={styles.topBarRight}>
        {user && <span className={styles.userBadge}>{user.name}</span>}
        <Link to="/studio" className={styles.backLink}>← Back to Studio</Link>
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

export default function SiteAdmin() {
  return (
    <div className={styles.page}>
      <TopBar />
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

// ── Stub pages for sub-routes ─────────────────────────────────────────────────
function StubPage({ title, desc }) {
  return (
    <div className={styles.page}>
      <TopBar />
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
  return <StubPage title="Documentation Editor" desc="Edit the documentation sections, add new content, and manage the sidebar navigation." />
}

export function SiteAdminLanding() {
  return <StubPage title="Landing Page Editor" desc="Edit the hero text, feature cards, how-it-works steps, and other homepage content." />
}

export function SiteAdminPages() {
  return <StubPage title="Pages" desc="Create, edit, and delete custom site pages. Pages will appear in site navigation automatically." />
}
