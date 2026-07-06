import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import styles from './Landing.module.css'

// ── Static mock display (hero visual) ────────────────────────────────────────

const MOCK_MUSICIANS = [
  { name: 'Sarah M.', mic: 'Vox 1',   iem: 'IEM 2' },
  { name: 'James K.', mic: 'Vox 2',   iem: 'IEM 1' },
  { name: 'Drew A.',  mic: 'Keys DI', iem: 'IEM 4' },
  { name: 'Lily R.',  mic: 'Vox 3',   iem: 'IEM 3' },
]

function formatTime(d) {
  let h = d.getHours(); const m = d.getMinutes().toString().padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${m} ${ampm}`
}

function MockDisplay() {
  const [time, setTime] = useState(() => formatTime(new Date()))
  useEffect(() => {
    const t = setInterval(() => setTime(formatTime(new Date())), 1000)
    return () => clearInterval(t)
  }, [])
  return (
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
              <div className={styles.mockPhoto}><span className={styles.mockInitial}>{p.name[0]}</span></div>
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
  )
}

// ── Social icons ──────────────────────────────────────────────────────────────

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
      <rect x="2" y="4" rx="2" width="20" height="16" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
  return <span>{type}</span>
}

// ── Section renderers ─────────────────────────────────────────────────────────

function nl2br(text) {
  if (!text) return ''
  return (text + '').split('\n\n').map((para, i) =>
    `<p>${para.replace(/\n/g, '<br>')}</p>`
  ).join('')
}

function renderHero(section, signInHref, signInLabel) {
  const d = section.data || {}
  const align = d.align || 'left'
  const primaryHref = d.primaryBtn?.href === '/org' ? signInHref : (d.primaryBtn?.href || signInHref)
  const primaryLabel = d.primaryBtn?.href === '/org' ? signInLabel : (d.primaryBtn?.label || signInLabel)
  return (
    <section key={section._id} className={`${styles.hero}${align === 'center' ? ' ' + styles.heroCenter : ''}`}>
      <div className={styles.heroText}>
        {d.badge && <div className={styles.heroBadge}>{d.badge}</div>}
        <h1 className={styles.heroHeadline}>
          {(d.headline || '').split('\n').map((line, i, arr) => (
            <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
          ))}
        </h1>
        {d.subtext && <p className={styles.heroDesc}>{d.subtext}</p>}
        <div className={styles.heroCtas}>
          {d.primaryBtn?.label && (
            <Link to={primaryHref} className={styles.ctaPrimary}>{primaryLabel} →</Link>
          )}
          {d.secondaryBtn?.label && (
            <Link to={d.secondaryBtn.href || '/docs'} className={styles.ctaSecondary}>{d.secondaryBtn.label}</Link>
          )}
        </div>
      </div>
      {d.showMockDisplay && <MockDisplay />}
    </section>
  )
}

function renderFeatureGrid(section) {
  const d = section.data || {}
  const cols = d.columns || 3
  const cells = d.cells || []
  return (
    <section key={section._id} className={styles.features}>
      {(d.heading || d.subtext) && (
        <div className={styles.container}>
          {d.heading && <h2 className={styles.sectionTitle}>{d.heading}</h2>}
          {d.subtext && <p className={styles.sectionSub}>{d.subtext}</p>}
        </div>
      )}
      <div className={styles.container}>
        <div className={styles.featureGrid} style={{ '--grid-cols': cols }}>
          {cells.map((cell, i) => {
            const color = cell.accentColor || '#60a5fa'
            const gradient = color + '22'
            return (
              <div key={i} className={styles.featureCard} style={{ background: `linear-gradient(135deg, ${gradient} 0%, transparent 70%)` }}>
                <div className={styles.featureCardAccent} style={{ background: color }} />
                <h3 className={styles.featureCardTitle} style={{ color }}>{cell.heading}</h3>
                <p className={styles.featureCardText}>{cell.text}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function renderSteps(section) {
  const d = section.data || {}
  const steps = d.steps || []
  return (
    <section key={section._id} className={styles.howItWorks}>
      <div className={styles.container}>
        {d.heading && <h2 className={styles.sectionTitle}>{d.heading}</h2>}
        {d.subtext && <p className={styles.sectionSub}>{d.subtext}</p>}
        <div className={styles.steps}>
          {steps.map((step, i) => (
            <div key={i} className={`${styles.step}${i === 0 ? ' ' + styles.stepFirst : ''}`}>
              <div className={styles.stepNum}>{step.number}</div>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepDesc}>{step.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function renderContentRow(section) {
  const d = section.data || {}
  const imgLeft = (d.imagePosition || 'left') === 'left'
  const bodyHtml = nl2br(d.text)
  return (
    <section key={section._id} className={styles.localSection} style={d.bgColor ? { background: d.bgColor } : {}}>
      <div className={styles.container}>
        <div className={`${styles.contentRowCard} ${imgLeft ? '' : styles.contentRowReverse}`}>
          {d.imageUrl && (
            <div className={styles.contentRowImg}>
              <img src={d.imageUrl} alt={d.imageAlt || ''} />
            </div>
          )}
          <div className={styles.contentRowBody}>
            {d.heading && <h2 className={styles.localTitle}>{d.heading}</h2>}
            {bodyHtml && <div className={styles.localDesc} dangerouslySetInnerHTML={{ __html: bodyHtml }} />}
            {d.btn?.label && (
              <a href={d.btn.href} target={d.btn.href?.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className={styles.localRepoLink}>
                {d.btn.label} →
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function renderCtaBanner(section) {
  const d = section.data || {}
  const align = d.align || 'center'
  return (
    <section key={section._id} className={`${styles.ctaBanner}${align === 'left' ? ' ' + styles.ctaBannerLeft : ''}`}
      style={d.bgColor ? { background: d.bgColor } : {}}>
      <div className={styles.container}>
        {d.heading && <h2 className={styles.ctaBannerTitle}>{d.heading}</h2>}
        {d.subtext && <p className={styles.ctaBannerSub}>{d.subtext}</p>}
        <div className={styles.heroCtas}>
          {d.primaryBtn?.label && <a href={d.primaryBtn.href} className={styles.ctaPrimary}>{d.primaryBtn.label} →</a>}
          {d.secondaryBtn?.label && <a href={d.secondaryBtn.href} className={styles.ctaSecondary}>{d.secondaryBtn.label}</a>}
        </div>
      </div>
    </section>
  )
}

function renderCustomGrid(section) {
  const d = section.data || {}
  const cols = d.columns || 3
  const cells = d.cells || []
  return (
    <section key={section._id} className={styles.customGridSection}>
      <div className={styles.container}>
        <div className={styles.customGrid} style={{ '--grid-cols': cols }}>
          {cells.map((cell, i) => (
            <div key={i} className={styles.customGridCell}>
              {cell.imageUrl && <img src={cell.imageUrl} alt={cell.imageAlt || ''} className={styles.customGridImg} />}
              {cell.heading && <h3 className={styles.customGridHeading}>{cell.heading}</h3>}
              {cell.text && <p className={styles.customGridText}>{cell.text}</p>}
              {cell.btnLabel && (
                <a href={cell.btnHref || '#'} className={styles.ctaPrimary} style={{ marginTop: 12, display: 'inline-block' }}>{cell.btnLabel}</a>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function renderPricing(section, signInHref, signInLabel) {
  const d = section.data || {}
  const features = d.features || []
  const primaryHref = d.primaryBtn?.href === '/org' ? signInHref : (d.primaryBtn?.href || signInHref)
  const primaryLabel = d.primaryBtn?.href === '/org' ? signInLabel : (d.primaryBtn?.label || signInLabel)
  return (
    <section key={section._id} className={styles.pricingSection}>
      <div className={styles.container}>
        {d.heading && <h2 className={styles.sectionTitle}>{d.heading}</h2>}
        {d.subtext && <p className={styles.sectionSub}>{d.subtext}</p>}
        <div className={styles.pricingCard}>
          <div className={styles.pricingTier}>{d.tier}</div>
          <div className={styles.pricingAmount}>{d.amount}<span className={styles.pricingPer}> {d.per}</span></div>
          {d.tagline && <p className={styles.pricingTagline}>{d.tagline}</p>}
          <ul className={styles.pricingFeatures}>
            {features.map((f, i) => (
              <li key={i} className={styles.pricingFeature}><span className={styles.pricingCheck}>✓</span>{f}</li>
            ))}
          </ul>
          {d.primaryBtn?.label && (
            <Link to={primaryHref} className={styles.ctaPrimary} style={{ display: 'block', textAlign: 'center', marginTop: '24px' }}>
              {primaryLabel} →
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}

function renderProfile(section) {
  const d = section.data || {}
  const links = d.links || []
  const supportLinks = d.supportLinks || []
  return (
    <section key={section._id} className={styles.devSection} id="developer">
      <div className={styles.container}>
        {d.badge && <div className={styles.devBadge}>{d.badge}</div>}
        {d.heading && <h2 className={styles.devSectionTitle}>{d.heading}</h2>}
        <div className={styles.devCard}>
          <div className={styles.devPhotoWrap}>
            {d.photoFallback && <div className={styles.devPhotoFallback}>{d.photoFallback}</div>}
            {d.photoUrl && (
              <img src={d.photoUrl} alt={d.name || ''} className={styles.devPhoto}
                onError={e => { e.target.style.display = 'none' }} />
            )}
          </div>
          <div className={styles.devInfo}>
            {d.name && <h3 className={styles.devName}>{d.name}</h3>}
            {d.meta && (
              <div className={styles.devMeta}>
                {d.meta.split('·').map((part, i, arr) => (
                  <span key={i}>{part.trim()}{i < arr.length - 1 && <span className={styles.devMetaDot}> · </span>}</span>
                ))}
              </div>
            )}
            {d.bio && <p className={styles.devBio}>{d.bio}</p>}
            {links.length > 0 && (
              <div className={styles.devLinks}>
                {links.map((link, i) => (
                  <a key={i} href={link.href} target={link.type !== 'email' ? '_blank' : undefined} rel="noopener noreferrer" className={styles.devLink}>
                    <SocialIcon type={link.type} /> {link.label}
                  </a>
                ))}
              </div>
            )}
            {(d.supportText || supportLinks.length > 0) && (
              <div className={styles.devSupport}>
                {d.supportText && <p className={styles.devSupportText}>{d.supportText}</p>}
                {supportLinks.length > 0 && (
                  <div className={styles.devSupportLinks}>
                    {supportLinks.map((sl, i) => (
                      <a key={i} href={sl.href} target="_blank" rel="noopener noreferrer"
                        className={styles.devSupportLink} style={{ '--support-color': sl.color || '#60a5fa' }}>
                        {sl.label}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function renderSection(section, signInHref, signInLabel) {
  switch (section.type) {
    case 'hero':         return renderHero(section, signInHref, signInLabel)
    case 'feature_grid': return renderFeatureGrid(section)
    case 'steps':        return renderSteps(section)
    case 'content_row':  return renderContentRow(section)
    case 'cta_banner':   return renderCtaBanner(section)
    case 'custom_grid':  return renderCustomGrid(section)
    case 'pricing':      return renderPricing(section, signInHref, signInLabel)
    case 'profile':      return renderProfile(section)
    default:             return null
  }
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Landing() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.user) setIsAdmin(true) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/site-admin/pages/landing/public')
      .then(r => r.json())
      .then(d => { setSections(d.blocks || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const signInHref  = isAdmin ? '/studio' : '/org'
  const signInLabel = isAdmin ? 'Go to dashboard' : 'Get started'

  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <Link to="/" className={styles.navBrand}>Beacon</Link>
        <div className={styles.navLinks}>
          <Link to="/docs"      className={styles.navLink}>Docs</Link>
          <Link to="/display"   className={styles.navLink}>Display</Link>
          <Link to={signInHref} className={styles.navCta}>{isAdmin ? 'Dashboard' : 'Sign in'} →</Link>
        </div>
      </header>

      {!loading && sections.map(s => ({ ...s, _id: s.id ? String(s.id) : String(Math.random()) }))
        .map(section => renderSection(section, signInHref, signInLabel))}

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <Link to="/" className={styles.footerBrand}>Beacon</Link>
          <div className={styles.footerLinks}>
            <Link to="/docs"      className={styles.footerLink}>Documentation</Link>
            <Link to="/display"   className={styles.footerLink}>Display login</Link>
            <Link to={signInHref} className={styles.footerLink}>Studio</Link>
            <Link to="/contact"   className={styles.footerLink}>Contact</Link>
          </div>
        </div>
        <div className={styles.footerMeta}>
          <Link to="/admin" className={styles.footerMetaLink}>Site admin</Link>
        </div>
      </footer>
    </div>
  )
}
