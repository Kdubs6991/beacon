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

function SocialIcon({ type }) {
  const s = { width: 18, height: 18, 'aria-hidden': true }
  if (type === 'github') return (
    <svg {...s} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.6.113.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  )
  if (type === 'linkedin') return (
    <svg {...s} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  )
  if (type === 'email') return (
    <svg {...s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" rx="2" width="20" height="16" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
  return null
}

function formatTime(d) {
  let h = d.getHours()
  const m = d.getMinutes().toString().padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'
  h = h % 12 || 12
  return `${h}:${m} ${ampm}`
}

const MOCK_MUSICIANS = [
  { name: 'Sarah M.', mic: 'Vox 1',   iem: 'IEM 2', photo: '/mock-1.jpg' },
  { name: 'James K.', mic: 'Vox 2',   iem: 'IEM 1', photo: '/mock-2.jpg' },
  { name: 'Drew A.',  mic: 'Keys DI', iem: 'IEM 4', photo: '/mock-3.jpg' },
  { name: 'Lily R.',  mic: 'Vox 3',   iem: 'IEM 3', photo: '/mock-4.jpg' },
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
  const [time, setTime] = useState(() => formatTime(new Date()))

  useEffect(() => {
    const tick = setInterval(() => setTime(formatTime(new Date())), 1000)
    return () => clearInterval(tick)
  }, [])

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
              <span className={styles.mockClock}>{time}</span>
            </div>
            <div className={styles.mockGrid}>
              {MOCK_MUSICIANS.map(p => (
                <div key={p.name} className={styles.mockCard}>
                  <div className={styles.mockPhoto}>
                    <span className={styles.mockInitial}>{p.name[0]}</span>
                    <img src={p.photo} alt="" className={styles.mockPhotoImg} onError={e => { e.target.style.display = 'none' }} />
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

      {/* ── Local hosting ── */}
      <section className={styles.localSection}>
        <div className={styles.container}>
          <div className={styles.localCard}>
            <div className={styles.localIcon}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" rx="2" width="20" height="8" />
                <rect x="2" y="14" rx="2" width="20" height="8" />
                <line x1="6" y1="6" x2="6.01" y2="6" />
                <line x1="6" y1="18" x2="6.01" y2="18" />
              </svg>
            </div>
            <div className={styles.localBody}>
              <h2 className={styles.localTitle}>Designed for local hosting</h2>
              <p className={styles.localDesc}>
                Beacon runs on your own hardware — a laptop, a Raspberry Pi, a VPS, or any machine with Node.js installed.
                There's no cloud service, no account required, and your data never leaves your network unless you choose to expose it.
              </p>
              <p className={styles.localDesc}>
                Updates are distributed through the GitHub repository. When a new version is available, pull the latest code
                and restart the server — no auto-updates, no breaking changes pushed without your knowledge.
                We recommend checking for updates <strong>once a month</strong>, or clicking <strong>Watch → Custom → Releases</strong> on GitHub to get an email whenever a new version is out.
              </p>
              <a href="https://github.com/Kdubs6991/beacon" target="_blank" rel="noopener noreferrer" className={styles.localRepoLink}>
                View repository on GitHub →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── Joke pricing ── */}
      <section className={styles.pricingSection}>
        <div className={styles.container}>
          <h2 className={styles.sectionTitle}>Simple, transparent pricing</h2>
          <p className={styles.sectionSub}>We spent a long time on this.</p>
          <div className={styles.pricingCard}>
            <div className={styles.pricingTier}>Free</div>
            <div className={styles.pricingAmount}>$0<span className={styles.pricingPer}> / forever</span></div>
            <p className={styles.pricingTagline}>No catch. No credit card. No subscription. No upsell email at 3am.</p>
            <ul className={styles.pricingFeatures}>
              {['Every feature', 'Unlimited screens', 'Unlimited team members', 'Unlimited automations', 'Hosted on your own hardware', 'You own your data'].map(f => (
                <li key={f} className={styles.pricingFeature}><span className={styles.pricingCheck}>✓</span>{f}</li>
              ))}
            </ul>
            <Link to={signInHref} className={styles.ctaPrimary} style={{ display: 'block', textAlign: 'center', marginTop: '24px' }}>
              {signInLabel} →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Developer section ── */}
      <section className={styles.devSection} id="developer">
        <div className={styles.container}>
          <div className={styles.devBadge}>Developer</div>
          <h2 className={styles.devSectionTitle}>Meet the Developer</h2>
          <div className={styles.devCard}>
            <div className={styles.devPhotoWrap}>
              <div className={styles.devPhotoFallback}>KW</div>
              <img
                src="/kaleb.jpg"
                alt="Kaleb Wrigley"
                className={styles.devPhoto}
                onError={e => { e.target.style.display = 'none' }}
              />
            </div>
            <div className={styles.devInfo}>
              <h3 className={styles.devName}>Kaleb Wrigley</h3>
              <div className={styles.devMeta}>
                <span>Software Engineering · Iowa State University</span>
                <span className={styles.devMetaDot}>·</span>
                <span>Ames, IA</span>
              </div>
              <p className={styles.devBio}>
                I'm a student at Iowa State University majoring in Software Engineering
                with a minor in Artificial Intelligence. Beacon is a project to sharpen
                my development and deployment skills — and to give other churches a free,
                polished tool to simplify their workflow.
              </p>
              <div className={styles.devLinks}>
                <a href="https://github.com/Kdubs6991" target="_blank" rel="noopener noreferrer" className={styles.devLink}>
                  <SocialIcon type="github" /> GitHub
                </a>
                <a href="https://www.linkedin.com/in/kaloob/" target="_blank" rel="noopener noreferrer" className={styles.devLink}>
                  <SocialIcon type="linkedin" /> LinkedIn
                </a>
                <a href="mailto:kjwrigley08@gmail.com" className={styles.devLink}>
                  <SocialIcon type="email" /> kjwrigley08@gmail.com
                </a>
              </div>
              <div className={styles.devSupport}>
                <p className={styles.devSupportText}>
                  Beacon is completely free to use and always will be. I built it to grow as a developer and to give churches
                  a tool that actually helps. If you'd like to help cover hosting costs, it's genuinely appreciated — but
                  there's absolutely no obligation.
                </p>
                <div className={styles.devSupportLinks}>
                  <a href="https://venmo.com/u/kdubs6991"            target="_blank" rel="noopener noreferrer" className={styles.devSupportLink} style={{ '--support-color': '#008CFF' }}>Venmo</a>
                  <a href="https://www.paypal.com/paypalme/Kdubs6991" target="_blank" rel="noopener noreferrer" className={styles.devSupportLink} style={{ '--support-color': '#009CDE' }}>PayPal</a>
                  <a href="https://cash.app/$boolak"                  target="_blank" rel="noopener noreferrer" className={styles.devSupportLink} style={{ '--support-color': '#00C244' }}>Cash App</a>
                </div>
              </div>
            </div>
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
