import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import styles from './Landing.module.css'

function FeatureIcon({ type, color }) {
  const s = { width: 34, height: 34, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' }
  if (type === 'monitor') return (
    <svg {...s}><rect x="2" y="3" rx="2" width="20" height="14" /><polyline points="8 21 12 17 16 21" /></svg>
  )
  if (type === 'bolt') return (
    <svg {...s}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
  )
  if (type === 'sliders') return (
    <svg {...s}><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></svg>
  )
  if (type === 'calendar') return (
    <svg {...s}><rect x="3" y="4" rx="2" width="18" height="18" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
  )
  if (type === 'users') return (
    <svg {...s}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  )
  if (type === 'server') return (
    <svg {...s}><rect x="2" y="2" rx="2" width="20" height="8" /><rect x="2" y="14" rx="2" width="20" height="8" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></svg>
  )
  return null
}

const MOCK_MUSICIANS = [
  { name: 'Sarah M.', mic: 'Vox 1',   iem: 'IEM 2' },
  { name: 'James K.', mic: 'Vox 2',   iem: 'IEM 1' },
  { name: 'Drew A.',  mic: 'Keys DI', iem: 'IEM 4' },
  { name: 'Lily R.',  mic: 'Vox 3',   iem: 'IEM 3' },
]

const FEATURES = [
  {
    icon: 'monitor',
    gradient: 'rgba(59,130,246,0.18)',
    iconBg: 'rgba(59,130,246,0.16)',
    iconColor: '#60a5fa',
    title: 'Any screen, any device',
    desc: 'Each display is a permanent browser URL. Point a TV, tablet, or kiosk at it and it auto-refreshes every 30 seconds — no app installs, no logins on the display.',
  },
  {
    icon: 'bolt',
    gradient: 'rgba(168,85,247,0.16)',
    iconBg: 'rgba(168,85,247,0.15)',
    iconColor: '#c084fc',
    title: 'Smart automation',
    desc: 'Write rules once. Beacon auto-assigns mic and IEM labels based on each person\'s name or position — no manual work each service.',
  },
  {
    icon: 'sliders',
    gradient: 'rgba(251,146,60,0.16)',
    iconBg: 'rgba(251,146,60,0.14)',
    iconColor: '#fb923c',
    title: 'Templates & themes',
    desc: 'Custom grid layouts with per-slot modes, label pins, and 7 colour themes. Full control over what every screen shows and how it looks.',
  },
  {
    icon: 'calendar',
    gradient: 'rgba(52,211,153,0.14)',
    iconBg: 'rgba(52,211,153,0.13)',
    iconColor: '#34d399',
    title: 'Scheduled push',
    desc: 'Set a schedule and displays update themselves before you arrive. Saturday at 6 PM, Sunday morning — it just runs.',
  },
  {
    icon: 'users',
    gradient: 'rgba(251,191,36,0.14)',
    iconBg: 'rgba(251,191,36,0.13)',
    iconColor: '#fbbf24',
    title: 'Manual service teams',
    desc: 'Build your roster in Beacon and assign each person a position. No external integrations needed — everything runs from within the app.',
  },
  {
    icon: 'server',
    gradient: 'rgba(148,163,184,0.12)',
    iconBg: 'rgba(148,163,184,0.12)',
    iconColor: '#94a3b8',
    title: 'Self-hosted',
    desc: 'Your data stays on your server. Runs on any machine with Node.js. No subscription fees, no vendor lock-in.',
  },
]

const STEPS = [
  { n: '01', title: 'Set up your team',       desc: 'Add your people, define your mic and IEM inventory, and write automation rules. Do it once, use it every week.' },
  { n: '02', title: 'Create display screens', desc: 'Each screen gets a permanent URL. Point your TVs at it and assign a template to control the layout and content.' },
  { n: '03', title: 'Set a schedule',         desc: 'Pick a day and time. Beacon pushes assignments to your screens automatically — or hit Push any time for instant updates.' },
]

export default function Landing() {
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.user) setIsAdmin(true) })
      .catch(() => {})
  }, [])

  const signInHref  = isAdmin ? '/admin' : '/org'
  const signInLabel = isAdmin ? 'Go to dashboard' : 'Get started'

  return (
    <div className={styles.page}>

      {/* ── Nav ── */}
      <header className={styles.nav}>
        <Link to="/" className={styles.navBrand}>Beacon</Link>
        <div className={styles.navLinks}>
          <Link to="/docs"      className={styles.navLink}>Docs</Link>
          <Link to="/display"   className={styles.navLink}>Display</Link>
          <Link to={signInHref} className={styles.navCta}>{isAdmin ? 'Dashboard' : 'Sign in'} →</Link>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <div className={styles.heroBadge}>Worship Team Display</div>
          <h1 className={styles.heroHeadline}>
            The right mic,<br />on the right screen.
          </h1>
          <p className={styles.heroDesc}>
            Beacon auto-assigns mics and IEMs for your worship team and pushes
            them to any TV or kiosk in your venue — built manually or pulled
            from your service schedule automatically.
          </p>
          <div className={styles.heroCtas}>
            <Link to={signInHref} className={styles.ctaPrimary}>{signInLabel} →</Link>
            <Link to="/docs"      className={styles.ctaSecondary}>Read the docs</Link>
          </div>
        </div>

        <div className={styles.heroVisual}>
          <div className={styles.mockDisplay}>
            <div className={styles.mockHeader}>
              <span className={styles.mockBrand}>Beacon</span>
              <span className={styles.mockEvent}>Sunday Service</span>
              <span className={styles.mockClock}>10:45 AM</span>
            </div>
            <div className={styles.mockGrid}>
              {MOCK_MUSICIANS.map(p => (
                <div key={p.name} className={styles.mockCard}>
                  <div className={styles.mockPhoto}>
                    <span className={styles.mockInitial}>{p.name[0]}</span>
                  </div>
                  <div className={styles.mockName}>{p.name}</div>
                  <div className={styles.mockLabels}>
                    <span className={styles.mockMic}>{p.mic}</span>
                    <span className={styles.mockIem}>{p.iem}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className={styles.mockGlow} />
        </div>
      </section>

      {/* ── Features ── */}
      <section className={styles.features}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Everything your team needs on screen</h2>
          <p className={styles.sectionSub}>Built specifically for worship teams. No extra apps, no laminated paper lists.</p>
        </div>
        {FEATURES.map(f => (
          <div
            key={f.title}
            className={styles.featureStripe}
            style={{ background: `linear-gradient(to right, ${f.gradient} 0%, transparent 60%)` }}
          >
            <div className={styles.featureStripeInner}>
              <div className={styles.featureIconWrap} style={{ background: f.iconBg }}>
                <FeatureIcon type={f.icon} color={f.iconColor} />
              </div>
              <div className={styles.featureBody}>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ── How it works ── */}
      <section className={styles.howItWorks}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Up and running in minutes</h2>
          <p className={styles.sectionSub}>Three steps and your displays are live.</p>
          <div className={styles.steps}>
            {STEPS.map((step, i) => (
              <div key={step.n} className={`${styles.step}${i === 0 ? ' ' + styles.stepFirst : ''}`}>
                <div className={styles.stepNum}>{step.n}</div>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className={styles.ctaBanner}>
        <div className={styles.container}>
          <h2 className={styles.ctaBannerTitle}>Ready to get started?</h2>
          <p className={styles.ctaBannerDesc}>
            Open the admin panel to configure your org, or read the documentation first.
          </p>
          <div className={styles.ctaBannerActions}>
            <Link to={signInHref} className={styles.ctaPrimary}>{signInLabel} →</Link>
            <Link to="/docs"      className={styles.ctaSecondary}>Documentation</Link>
          </div>
        </div>
      </section>

      {/* ── Developer section (placeholder) ── */}
      <section className={styles.devSection} id="developer">
        <div className={styles.container}>
          <div className={styles.devBadge}>Built by</div>
          <h2 className={styles.devTitle}>Meet the Developer</h2>
          <div className={styles.devPlaceholder}>
            <p>Developer info coming soon.</p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <Link to="/" className={styles.footerBrand}>Beacon</Link>
          <div className={styles.footerLinks}>
            <Link to="/docs"      className={styles.footerLink}>Documentation</Link>
            <Link to="/display"   className={styles.footerLink}>Display login</Link>
            <Link to={signInHref} className={styles.footerLink}>Admin panel</Link>
            <Link to="/contact"   className={styles.footerLink}>Contact</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
