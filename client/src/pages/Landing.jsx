import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import styles from './Landing.module.css'

const MOCK_MUSICIANS = [
  { name: 'Sarah M.', mic: 'Vox 1',   iem: 'IEM 2' },
  { name: 'James K.', mic: 'Vox 2',   iem: 'IEM 1' },
  { name: 'Drew A.',  mic: 'Keys DI', iem: 'IEM 4' },
  { name: 'Lily R.',  mic: 'Vox 3',   iem: 'IEM 3' },
]

const FEATURES = [
  { icon: '📺', title: 'Any screen, any device',   desc: 'Each display is just a browser URL. Point a TV, tablet, or kiosk at it and it auto-refreshes every 30 seconds — no app installs, no logins on the display.' },
  { icon: '⚡', title: 'Smart automation',          desc: 'Write rules once. Beacon auto-assigns mic and IEM labels based on name or position, every service, without any manual work.' },
  { icon: '🔗', title: 'Planning Center sync',      desc: 'Connect PCO and Beacon pulls your team roster automatically. Manual mode works great too — no integration required.' },
  { icon: '🎨', title: 'Templates & themes',        desc: 'Custom grid layouts with per-slot modes, label pins, and 7 colour themes. You control what every screen shows and how it looks.' },
  { icon: '🗓️', title: 'Scheduled push',           desc: 'Set a schedule and displays update themselves before you arrive. Saturday night, Sunday morning — it just runs.' },
  { icon: '🔒', title: 'Self-hosted',               desc: 'Your data stays on your server. Runs on a Raspberry Pi, a laptop, or a VPS. No subscription fees, no vendor lock-in.' },
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

  const signInHref = isAdmin ? '/admin' : '/org'
  const signInLabel = isAdmin ? 'Go to dashboard' : 'Get started'

  return (
    <div className={styles.page}>

      {/* ── Nav ── */}
      <header className={styles.nav}>
        <span className={styles.navBrand}>Beacon</span>
        <div className={styles.navLinks}>
          <Link to="/docs"    className={styles.navLink}>Docs</Link>
          <Link to="/display" className={styles.navLink}>Display</Link>
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
            them to any TV or kiosk in your venue — synced from Planning Center
            or managed manually.
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
                  <div className={styles.mockAvatar}>{p.name[0]}</div>
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

      {/* ── Trust bar ── */}
      <div className={styles.trustBar}>
        <span className={styles.trustText}>Integrates with <strong>Planning Center Online</strong></span>
        <span className={styles.trustDot} />
        <span className={styles.trustText}>Works fully without it too</span>
        <span className={styles.trustDot} />
        <span className={styles.trustText}>Runs on a Raspberry Pi</span>
      </div>

      {/* ── Features ── */}
      <section className={styles.features}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Everything your team needs on screen</h2>
          <p className={styles.sectionSub}>Built specifically for worship teams. No extra apps, no laminated paper lists.</p>
          <div className={styles.featureGrid}>
            {FEATURES.map(f => (
              <div key={f.title} className={styles.featureCard}>
                <span className={styles.featureIcon}>{f.icon}</span>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
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
          {/* Add your bio, photo, and links here */}
          <div className={styles.devPlaceholder}>
            <p>Developer info coming soon.</p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <span className={styles.footerBrand}>Beacon</span>
          <div className={styles.footerLinks}>
            <Link to="/docs"      className={styles.footerLink}>Documentation</Link>
            <Link to="/display"   className={styles.footerLink}>Display login</Link>
            <Link to={signInHref} className={styles.footerLink}>Admin panel</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
