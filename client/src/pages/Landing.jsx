import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import styles from './Landing.module.css'

// ── Mock display (animated, hero visual) ──────────────────────────────────────

const DEFAULT_MOCK_MUSICIANS = [
  { name: 'Sarah M.', mic: 'Vox 1',   iem: 'IEM 2', photoUrl: '' },
  { name: 'James K.', mic: 'Vox 2',   iem: 'IEM 1', photoUrl: '' },
  { name: 'Drew A.',  mic: 'Keys DI', iem: 'IEM 4', photoUrl: '' },
  { name: 'Lily R.',  mic: 'Vox 3',   iem: 'IEM 3', photoUrl: '' },
]
function formatTime(d) {
  let h = d.getHours(); const m = d.getMinutes().toString().padStart(2, '0')
  const ampm = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12; return `${h}:${m} ${ampm}`
}
function MockDisplay({ people: peopleProp, eventName: eventNameProp }) {
  const [time, setTime] = useState(() => formatTime(new Date()))
  useEffect(() => {
    const t = setInterval(() => setTime(formatTime(new Date())), 1000)
    return () => clearInterval(t)
  }, [])
  const musicians = peopleProp
    ? peopleProp.map(p => ({ name: p.name, mic: p.micLabel || '', iem: p.iemLabel || '', photoUrl: p.photoUrl || '' }))
    : DEFAULT_MOCK_MUSICIANS
  const eventName = eventNameProp || 'Sunday Service'
  return (
    <div className={styles.mockDisplay}>
      <div className={styles.mockHeader}>
        <span className={styles.mockBrand}>Beacon</span>
        <span className={styles.mockEvent}>{eventName}</span>
        <span className={styles.mockClock}>{time}</span>
      </div>
      <div className={styles.mockGrid}>
        {musicians.map((p, i) => (
          <div key={i} className={styles.mockCard}>
            <div className={styles.mockPhoto}>
              {p.photoUrl
                ? <img src={p.photoUrl} alt={p.name} className={styles.mockPhotoImg} />
                : <span className={styles.mockInitial}>{p.name[0]}</span>
              }
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
  )
}

// ── Social icon (for profile section) ─────────────────────────────────────────

function SocialIcon({ type }) {
  const s = { width: 16, height: 16, 'aria-hidden': true }
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
  return null
}

// ── Element renderers ─────────────────────────────────────────────────────────

const ALIGN_MAP = { left: 'flex-start', center: 'center', right: 'flex-end' }

function renderElement(el, signInHref, signInLabel) {
  switch (el.type) {
    case 'heading': {
      const Tag = el.data.level === 1 ? 'h1' : el.data.level === 3 ? 'h3' : 'h2'
      const cls = el.data.level === 1 ? styles.elH1 : el.data.level === 3 ? styles.elH3 : styles.elH2
      return (
        <Tag className={cls} style={{ textAlign: el.data.align || 'left' }}>
          {(el.data.text || '').split('\n').map((line, i, arr) => (
            <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
          ))}
        </Tag>
      )
    }
    case 'text':
      return <div className={styles.elText} style={{ textAlign: el.data.align || 'left' }} dangerouslySetInnerHTML={{ __html: el.data.html || '' }} />
    case 'image': {
      if (!el.data.url) return null
      const radiusMap = { none: '0', sm: '4px', md: '8px', lg: '16px', full: '50%' }
      const maxWidthMap = { full: '100%', lg: '640px', md: '400px', sm: '240px' }
      return (
        <img
          src={el.data.url}
          alt={el.data.alt || ''}
          className={styles.elImage}
          style={{
            borderRadius: radiusMap[el.data.radius] ?? '8px',
            maxWidth: maxWidthMap[el.data.maxWidth] || '100%',
          }}
        />
      )
    }
    case 'button': {
      const href = el.data.href === '/org' ? signInHref : el.data.href
      const label = el.data.href === '/org' ? signInLabel : el.data.label
      const isExt = href?.startsWith('http')
      const justify = ALIGN_MAP[el.data.align] || 'flex-start'
      const btn = isExt
        ? <a href={href} target="_blank" rel="noopener noreferrer" className={el.data.variant === 'secondary' ? styles.ctaSecondary : styles.ctaPrimary}>{label}</a>
        : <Link to={href || '/'} className={el.data.variant === 'secondary' ? styles.ctaSecondary : styles.ctaPrimary}>{label}</Link>
      return <div style={{ display: 'flex', justifyContent: justify }}>{btn}</div>
    }
    case 'badge':
      return (
        <div style={{ display: 'flex', justifyContent: ALIGN_MAP[el.data.align] || 'flex-start' }}>
          <div className={styles.elBadge} style={{ '--badge-color': el.data.color || '#60a5fa' }}>
            {el.data.text}
          </div>
        </div>
      )
    case 'spacer':
      return <div style={{ height: el.data.height || 40 }} />
    case 'divider': {
      const thickMap = { thin: '1px', md: '2px', thick: '4px' }
      const spanMap = { full: '100%', half: '50%', quarter: '25%' }
      return (
        <hr className={styles.elDivider} style={{
          borderTopWidth: thickMap[el.data?.thickness || 'md'] || '2px',
          borderTopColor: el.data?.color || undefined,
          width: spanMap[el.data?.span || 'full'] || '100%',
        }} />
      )
    }
    case 'card':
      return (
        <div
          className={styles.elCard}
          style={{
            background: el.data.bgColor || undefined,
            borderTopColor: el.data.accentColor || 'rgba(255,255,255,0.06)',
            textAlign: el.data.align || 'left',
          }}
        >
          {el.data.icon && <div className={styles.elCardIcon}>{el.data.icon}</div>}
          {el.data.title && <div className={styles.elCardTitle}>{el.data.title}</div>}
          {el.data.body && <div className={styles.elCardBody}>{el.data.body}</div>}
          {el.data.badgeText && (
            <div style={{ display: 'flex', justifyContent: ALIGN_MAP[el.data.align] || 'flex-start', marginTop: 4 }}>
              <div className={styles.elBadge} style={{ '--badge-color': el.data.badgeColor || '#60a5fa' }}>
                {el.data.badgeText}
              </div>
            </div>
          )}
        </div>
      )
    case 'mock_display': {
      const sizeMap = { sm: '340px', md: '480px', lg: '620px', xl: '820px' }
      const mockMaxWidth = sizeMap[el.data?.size] || sizeMap.lg
      const mockJustify = ALIGN_MAP[el.data?.align] || 'flex-start'
      return (
        <div className={styles.elMockWrap} style={{ justifyContent: mockJustify }}>
          <div style={{ width: '100%', maxWidth: mockMaxWidth, position: 'relative' }}>
            <MockDisplay people={el.data.people} eventName={el.data.eventName} />
            <div className={styles.mockGlow} />
          </div>
        </div>
      )
    }
    default:
      return null
  }
}

// ── Section renderer ──────────────────────────────────────────────────────────

const PADDING_MAP = { none: '0', sm: '32px 0', md: '48px 0', lg: '72px 0', xl: '96px 0' }

function renderSection(section, signInHref, signInLabel) {
  const d = section.data || {}
  const elements = d.elements || []
  const cols = d.columns || 3
  const padding = PADDING_MAP[d.padding] || PADDING_MAP.lg
  const bd = d.bottomDivider
  const bdPxMap = { thin: 1, md: 2, thick: 4 }
  const bdPx = bdPxMap[bd?.thickness] || 2

  return (
    <section
      key={section._id || section.id}
      className={styles.dynSection}
      style={{ background: d.bgColor || '', padding, position: 'relative', borderTop: d.accentTop ? `2px solid ${d.accentTop}` : undefined }}
    >
      <div className={styles.container}>
        <div className={styles.dynGrid} style={{ '--cols': cols }}>
          {elements.map(el => {
            const rendered = renderElement(el, signInHref, signInLabel)
            if (!rendered) return null
            return (
              <div
                key={el._id}
                className={styles.dynCell}
                style={{ gridColumn: el.data.fullWidth ? '1 / -1' : 'span 1' }}
              >
                {rendered}
              </div>
            )
          })}
        </div>
      </div>
      {bd?.enabled && (
        <div style={{
          position: 'absolute',
          bottom: -(bdPx / 2),
          left: 0,
          right: 0,
          height: bdPx,
          background: bd.color || 'rgba(255,255,255,0.15)',
          zIndex: 10,
          pointerEvents: 'none',
        }} />
      )}
    </section>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Landing() {
  const [isAdmin, setIsAdmin]   = useState(false)
  const [sections, setSections] = useState([])
  const [loading, setLoading]   = useState(true)
  const [navPages, setNavPages] = useState([])

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

  useEffect(() => {
    fetch('/api/site-admin/nav-links')
      .then(r => r.json())
      .then(d => setNavPages(d.pages || []))
      .catch(() => {})
  }, [])

  const signInHref  = isAdmin ? '/studio' : '/org'
  const signInLabel = isAdmin ? 'Go to dashboard' : 'Get started'

  const navLinks    = navPages.filter(p => p.show_in_nav)
  const footerLinks = navPages.filter(p => p.show_in_footer)

  // Only render element-based sections (type='section')
  const validSections = sections
    .filter(s => s.type === 'section')
    .map(s => ({ ...s, _id: s.id ? String(s.id) : String(Math.random()) }))

  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <Link to="/" className={styles.navBrand}>Beacon</Link>
        <div className={styles.navLinks}>
          {navLinks.map(p => (
            <Link key={p.slug} to={`/${p.slug}`} className={styles.navLink}>{p.title}</Link>
          ))}
          <Link to="/docs"    className={styles.navLink}>Docs</Link>
          <Link to="/display" className={styles.navLink}>Display</Link>
          <Link to={signInHref} className={styles.navCta}>{isAdmin ? 'Dashboard' : 'Sign in'} →</Link>
        </div>
      </header>

      {!loading && validSections.map(s => renderSection(s, signInHref, signInLabel))}

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
        {footerLinks.length > 0 && (
          <div className={styles.footerCustomRow}>
            {footerLinks.map(p => (
              <Link key={p.slug} to={`/${p.slug}`} className={styles.footerLink}>{p.title}</Link>
            ))}
          </div>
        )}
        <div className={styles.footerMeta}>
          <Link to="/admin" className={styles.footerMetaLink}>Site admin</Link>
        </div>
      </footer>
    </div>
  )
}
