import { useState, useEffect } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import landingStyles from './Landing.module.css'
import styles from './SitePage.module.css'

// ── Mock display (same as Landing.jsx) ────────────────────────────────────────

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
    <div className={landingStyles.mockDisplay}>
      <div className={landingStyles.mockHeader}>
        <span className={landingStyles.mockBrand}>Beacon</span>
        <span className={landingStyles.mockEvent}>{eventName}</span>
        <span className={landingStyles.mockClock}>{time}</span>
      </div>
      <div className={landingStyles.mockGrid}>
        {musicians.map((p, i) => (
          <div key={i} className={landingStyles.mockCard}>
            <div className={landingStyles.mockPhoto}>
              {p.photoUrl
                ? <img src={p.photoUrl} alt={p.name} className={landingStyles.mockPhotoImg} />
                : <span className={landingStyles.mockInitial}>{p.name[0]}</span>
              }
            </div>
            <div className={landingStyles.mockName}>{p.name}</div>
            <div className={landingStyles.mockLabels}>
              <span className={landingStyles.mockMic}>{p.mic}</span>
              <span className={landingStyles.mockIem}>{p.iem}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Element renderers (mirrors Landing.jsx) ───────────────────────────────────

const ALIGN_MAP = { left: 'flex-start', center: 'center', right: 'flex-end' }

function renderElement(el, signInHref, signInLabel) {
  const s = landingStyles
  switch (el.type) {
    case 'heading': {
      const Tag = el.data.level === 1 ? 'h1' : el.data.level === 3 ? 'h3' : 'h2'
      const cls = el.data.level === 1 ? s.elH1 : el.data.level === 3 ? s.elH3 : s.elH2
      return (
        <Tag className={cls} style={{ textAlign: el.data.align || 'left' }}>
          {(el.data.text || '').split('\n').map((line, i, arr) => (
            <span key={i}>{line}{i < arr.length - 1 && <br />}</span>
          ))}
        </Tag>
      )
    }
    case 'text':
      return <div className={s.elText} style={{ textAlign: el.data.align || 'left' }} dangerouslySetInnerHTML={{ __html: el.data.html || '' }} />
    case 'image': {
      if (!el.data.url) return null
      const radiusMap = { none: '0', sm: '4px', md: '8px', lg: '16px', full: '50%' }
      const maxWidthMap = { full: '100%', lg: '640px', md: '400px', sm: '240px' }
      return (
        <img
          src={el.data.url}
          alt={el.data.alt || ''}
          className={s.elImage}
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
        ? <a href={href} target="_blank" rel="noopener noreferrer" className={el.data.variant === 'secondary' ? s.ctaSecondary : s.ctaPrimary}>{label}</a>
        : <Link to={href || '/'} className={el.data.variant === 'secondary' ? s.ctaSecondary : s.ctaPrimary}>{label}</Link>
      return <div style={{ display: 'flex', justifyContent: justify }}>{btn}</div>
    }
    case 'badge':
      return (
        <div style={{ display: 'flex', justifyContent: ALIGN_MAP[el.data.align] || 'flex-start' }}>
          <div className={s.elBadge} style={{ '--badge-color': el.data.color || '#60a5fa' }}>
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
        <hr className={s.elDivider} style={{
          borderTopWidth: thickMap[el.data?.thickness || 'md'] || '2px',
          borderTopColor: el.data?.color || undefined,
          width: spanMap[el.data?.span || 'full'] || '100%',
        }} />
      )
    }
    case 'card':
      return (
        <div
          className={s.elCard}
          style={{
            background: el.data.bgColor || undefined,
            borderTopColor: el.data.accentColor || 'rgba(255,255,255,0.06)',
            textAlign: el.data.align || 'left',
          }}
        >
          {el.data.icon && <div className={s.elCardIcon}>{el.data.icon}</div>}
          {el.data.title && <div className={s.elCardTitle}>{el.data.title}</div>}
          {el.data.body && <div className={s.elCardBody}>{el.data.body}</div>}
          {el.data.badgeText && (
            <div style={{ display: 'flex', justifyContent: ALIGN_MAP[el.data.align] || 'flex-start', marginTop: 4 }}>
              <div className={s.elBadge} style={{ '--badge-color': el.data.badgeColor || '#60a5fa' }}>
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
        <div className={s.elMockWrap} style={{ justifyContent: mockJustify }}>
          <div style={{ width: '100%', maxWidth: mockMaxWidth, position: 'relative' }}>
            <MockDisplay people={el.data.people} eventName={el.data.eventName} />
            <div className={s.mockGlow} />
          </div>
        </div>
      )
    }
    default:
      return null
  }
}

const PADDING_MAP = { none: '0', sm: '32px 0', md: '48px 0', lg: '72px 0', xl: '96px 0' }

function renderSection(section, signInHref, signInLabel) {
  const d = section.data || {}
  const elements = d.elements || []
  const cols = d.columns || 3
  const padding = PADDING_MAP[d.padding] || PADDING_MAP.lg
  const bd = d.bottomDivider
  const bdPxMap = { thin: 1, md: 2, thick: 4 }
  const bdPx = bdPxMap[bd?.thickness] || 2
  const s = landingStyles
  return (
    <section
      key={section._id || section.id}
      className={s.dynSection}
      style={{ background: d.bgColor || '', padding, position: 'relative', borderTop: d.accentTop ? `2px solid ${d.accentTop}` : undefined }}
    >
      <div className={s.container}>
        <div className={s.dynGrid} style={{ '--cols': cols }}>
          {elements.map(el => {
            const rendered = renderElement(el, signInHref, signInLabel)
            if (!rendered) return null
            return (
              <div
                key={el._id}
                className={s.dynCell}
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

// ── Main component ────────────────────────────────────────────────────────────

export default function SitePage() {
  const { slug } = useParams()
  const navigate  = useNavigate()
  const [isAdmin, setIsAdmin]   = useState(false)
  const [sections, setSections] = useState([])
  const [title, setTitle]       = useState('')
  const [loading, setLoading]   = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [navPages, setNavPages] = useState([])

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.user) setIsAdmin(true) })
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/site-admin/nav-links')
      .then(r => r.json())
      .then(d => setNavPages(d.pages || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true); setNotFound(false)
    fetch(`/api/site-admin/pages/${slug}/public`)
      .then(r => {
        if (r.status === 404) { setNotFound(true); setLoading(false); return null }
        return r.json()
      })
      .then(d => {
        if (!d) return
        setTitle(d.title || '')
        setSections((d.blocks || []).filter(b => b.type === 'section').map(b => ({ ...b, _id: String(b.id) })))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [slug])

  const signInHref  = isAdmin ? '/studio' : '/org'
  const signInLabel = isAdmin ? 'Go to dashboard' : 'Get started'

  const navLinks    = navPages.filter(p => p.show_in_nav)
  const footerLinks = navPages.filter(p => p.show_in_footer)

  if (notFound) {
    return (
      <div className={styles.page}>
        <header className={styles.nav}>
          <Link to="/" className={styles.navBrand}>Beacon</Link>
          <div className={styles.navLinks}>
            <Link to="/docs" className={styles.navLink}>Docs</Link>
            <Link to={signInHref} className={styles.navCta}>{isAdmin ? 'Dashboard' : 'Sign in'} →</Link>
          </div>
        </header>
        <div className={styles.notFound}>
          <h1 className={styles.notFoundTitle}>Page not found</h1>
          <p className={styles.notFoundMsg}>There's no page at <code>/{slug}</code>.</p>
          <Link to="/" className={styles.notFoundLink}>← Back to home</Link>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.nav}>
        <Link to="/" className={styles.navBrand}>Beacon</Link>
        <div className={styles.navLinks}>
          {navLinks.map(p => (
            <Link key={p.slug} to={`/${p.slug}`} className={styles.navLink}>{p.title}</Link>
          ))}
          <Link to="/docs" className={styles.navLink}>Docs</Link>
          <Link to="/display" className={styles.navLink}>Display</Link>
          <Link to={signInHref} className={styles.navCta}>{isAdmin ? 'Dashboard' : 'Sign in'} →</Link>
        </div>
      </header>

      {title && (
        <div className={styles.pageHeader}>
          <div className={styles.container}>
            <h1 className={styles.pageTitle}>{title}</h1>
          </div>
        </div>
      )}

      {!loading && sections.map(s => renderSection(s, signInHref, signInLabel))}

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <Link to="/" className={styles.footerBrand}>Beacon</Link>
          <div className={styles.footerLinks}>
            <Link to="/docs" className={styles.footerLink}>Documentation</Link>
            <Link to="/display" className={styles.footerLink}>Display login</Link>
            <Link to={signInHref} className={styles.footerLink}>Studio</Link>
            <Link to="/contact" className={styles.footerLink}>Contact</Link>
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
