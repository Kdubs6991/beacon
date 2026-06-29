import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './Docs.module.css'

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(text) {
  return (text || '').toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// Build hierarchical NAV from heading blocks
function deriveNav(blocks) {
  const nav = []
  let currentH1 = null
  let currentH2 = null

  blocks.filter(b => b.type === 'heading').forEach(b => {
    const item = {
      id: b.data.id || slugify(b.data.text),
      label: b.data.text,
      children: [],
    }

    if (b.data.level === 1) {
      currentH1 = item
      nav.push(currentH1)
      currentH2 = null
    } else if (b.data.level === 2) {
      if (!currentH1) { nav.push(item); return }
      currentH2 = item
      currentH1.children = currentH1.children || []
      currentH1.children.push(currentH2)
    } else if (b.data.level === 3) {
      const parent = currentH2 || currentH1
      if (!parent) return
      parent.children = parent.children || []
      parent.children.push({ id: item.id, label: item.label })
    }
  })

  return nav
}

// Flatten all nav IDs for scroll spy
function flattenNavIds(nav) {
  return nav.flatMap(item => [
    item.id,
    ...(item.children?.flatMap(c => [c.id, ...(c.children?.map(gc => gc.id) ?? [])]) ?? []),
  ])
}

// ── Anchor link button ────────────────────────────────────────────────────────

function AnchorButton({ id }) {
  const [copied, setCopied] = useState(false)
  function handleClick() {
    navigator.clipboard?.writeText(
      window.location.origin + window.location.pathname + '#' + id
    ).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <button
      onClick={handleClick}
      className={copied ? styles.anchorCopied : styles.anchor}
      title="Copy link"
    >
      {copied ? '✓' : '#'}
    </button>
  )
}

// ── Heading block ─────────────────────────────────────────────────────────────

function HeadingBlock({ block }) {
  const { id, level, text } = block.data
  const anchorId = id || slugify(text)

  if (level === 1) {
    return (
      <div id={anchorId} className={styles.h1Wrap} style={{ scrollMarginTop: 80 }}>
        <h2 className={styles.h1}>{text}</h2>
        <AnchorButton id={anchorId} />
      </div>
    )
  }
  if (level === 2) {
    return (
      <div id={anchorId} className={styles.h2Wrap} style={{ scrollMarginTop: 80 }}>
        <h3 className={styles.h2}>{text}</h3>
        <AnchorButton id={anchorId} />
      </div>
    )
  }
  return (
    <div id={anchorId} className={styles.h3Wrap} style={{ scrollMarginTop: 80 }}>
      <h4 className={styles.h3}>{text}</h4>
      <AnchorButton id={anchorId} />
    </div>
  )
}

// ── Block renderer ────────────────────────────────────────────────────────────

function renderBlock(block) {
  const key = block.id || block._id || Math.random()

  switch (block.type) {
    case 'heading':
      return <HeadingBlock key={key} block={block} />

    case 'paragraph':
      return (
        <p
          key={key}
          className={styles.paragraph}
          dangerouslySetInnerHTML={{ __html: block.data.html }}
        />
      )

    case 'highlight':
      return (
        <div
          key={key}
          className={styles.highlight}
          dangerouslySetInnerHTML={{ __html: block.data.html }}
        />
      )

    case 'callout': {
      const variantClass = block.data.variant === 'warning' ? styles.warning
        : block.data.variant === 'tip' ? styles.tip
        : styles.info
      const prefix = block.data.variant === 'warning' ? '⚠ '
        : block.data.variant === 'tip' ? '● '
        : 'ℹ '
      return (
        <div key={key} className={`${styles.callout} ${variantClass}`}>
          <span className={styles.calloutIcon}>{prefix}</span>
          <div dangerouslySetInnerHTML={{ __html: block.data.html }} />
        </div>
      )
    }

    case 'list':
      if (block.data.ordered) {
        return (
          <ol key={key} className={styles.ol}>
            {(block.data.items || []).map((item, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
            ))}
          </ol>
        )
      }
      return (
        <ul key={key} className={styles.ul}>
          {(block.data.items || []).map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
          ))}
        </ul>
      )

    case 'code':
      return (
        <div key={key} className={styles.codeBlock}>
          {block.data.text}
        </div>
      )

    case 'spacer': {
      const heights = { sm: 16, md: 32, lg: 56 }
      return <div key={key} style={{ height: heights[block.data.size] || 32 }} />
    }

    case 'divider':
      return <hr key={key} className={styles.divider} />

    default:
      return null
  }
}

// ── Main Docs page ────────────────────────────────────────────────────────────

export default function Docs() {
  const { hash } = useLocation()
  const { user } = useAuth()
  const [activeId, setActiveId] = useState('')
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const detailsRef = useRef(null)

  // Fetch blocks from DB
  useEffect(() => {
    fetch('/api/site-admin/pages/docs/public')
      .then(r => r.json())
      .then(d => { setBlocks(d.blocks || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const nav = deriveNav(blocks)
  const allIds = flattenNavIds(nav)

  // Scroll to anchor on hash change
  useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '')
      setTimeout(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
    }
  }, [hash, blocks])

  // Scroll spy
  useEffect(() => {
    if (allIds.length === 0) return
    function onScroll() {
      let current = ''
      for (const id of allIds) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= 96) current = id
      }
      setActiveId(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [allIds.join(',')])

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <span className={styles.brand}>Beacon</span>
        <div className={styles.topBarNav}>
          {user
            ? <Link to="/studio" className={styles.backLink}>Studio</Link>
            : <Link to="/login" className={styles.backLink}>Sign in</Link>
          }
          <Link to="/display" className={styles.backLink}>Display login</Link>
        </div>
      </header>

      <div className={styles.layout}>
        {/* ── Sidebar ── */}
        <nav className={styles.sidebar}>
          <p className={styles.sidebarTitle}>Documentation</p>
          {nav.map(item => (
            <div key={item.id}>
              <a
                href={`#${item.id}`}
                className={`${styles.navItem}${activeId === item.id ? ' ' + styles.navItemActive : ''}`}
              >
                {item.label}
              </a>
              {item.children?.map(child => (
                <a
                  key={child.id}
                  href={`#${child.id}`}
                  className={`${styles.navChild}${activeId === child.id ? ' ' + styles.navChildActive : ''}`}
                >
                  {child.label}
                </a>
              ))}
            </div>
          ))}
        </nav>

        {/* ── Content ── */}
        <main className={styles.content}>
          <details ref={detailsRef} className={styles.mobileNav}>
            <summary className={styles.mobileNavSummary}>On this page ▾</summary>
            {nav.map(item => (
              <div key={item.id}>
                <a
                  href={`#${item.id}`}
                  className={styles.mobileNavItem}
                  onClick={() => { if (detailsRef.current) detailsRef.current.open = false }}
                >
                  {item.label}
                </a>
                {item.children?.map(child => (
                  <a
                    key={child.id}
                    href={`#${child.id}`}
                    className={styles.mobileNavChild}
                    onClick={() => { if (detailsRef.current) detailsRef.current.open = false }}
                  >
                    {child.label}
                  </a>
                ))}
              </div>
            ))}
          </details>

          <h1 className={styles.docTitle}>Beacon — Documentation</h1>
          <p className={styles.lead}>
            Everything you need to know to set up and run Beacon for your church.
          </p>

          {loading ? (
            <div className={styles.loadingMsg}>Loading documentation…</div>
          ) : (
            <div className={styles.blockContent}>
              {blocks.map(block => renderBlock(block))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
