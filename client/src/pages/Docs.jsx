import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './Docs.module.css'

// ── Text helpers ──────────────────────────────────────────────────────────────

function slugify(text) {
  return (text || '').toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

function stripHtml(html) {
  return (html || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim()
}

// ── Nav derivation ────────────────────────────────────────────────────────────

function deriveNav(blocks) {
  const nav = []
  let currentH1 = null
  let currentH2 = null
  blocks.filter(b => b.type === 'heading').forEach(b => {
    const item = { id: b.data.id || slugify(b.data.text), label: b.data.text, children: [] }
    if (b.data.level === 1) { currentH1 = item; nav.push(currentH1); currentH2 = null }
    else if (b.data.level === 2) {
      if (!currentH1) { nav.push(item); return }
      currentH2 = item
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

function flattenNavIds(nav) {
  return nav.flatMap(item => [
    item.id,
    ...(item.children?.flatMap(c => [c.id, ...(c.children?.map(gc => gc.id) ?? [])]) ?? []),
  ])
}

// ── Search engine ─────────────────────────────────────────────────────────────

const STOP_WORDS = new Set(['a','an','and','are','as','at','be','by','for','from','has','he','in','is','it','its','of','on','or','that','the','this','to','was','were','will','with','you','your'])

function buildSearchIndex(blocks) {
  let section = null, subsection = null, sectionAnchor = null, subsectionAnchor = null
  return blocks.map((block, idx) => {
    if (block.type === 'heading') {
      const id = block.data.id || slugify(block.data.text)
      if (block.data.level === 1) {
        section = block.data.text; sectionAnchor = id; subsection = null; subsectionAnchor = null
      } else if (block.data.level === 2) {
        subsection = block.data.text; subsectionAnchor = id
      } else {
        // h3 — don't update section/subsection pointers
      }
    }

    let text = ''
    switch (block.type) {
      case 'heading':    text = block.data.text || ''; break
      case 'paragraph':
      case 'highlight':
      case 'callout':    text = stripHtml(block.data.html); break
      case 'list':       text = (block.data.items || []).map(stripHtml).join(' | '); break
      case 'code':       text = block.data.text || ''; break
      default:           text = ''
    }

    const ownAnchor = block.type === 'heading'
      ? (block.data.id || slugify(block.data.text))
      : null

    return {
      idx,
      type: block.type,
      subtype: block.data?.variant || null,     // callout variant
      level: block.data?.level || null,
      text,
      section,
      sectionAnchor,
      subsection,
      subsectionAnchor,
      ownAnchor,
      targetAnchor: ownAnchor || subsectionAnchor || sectionAnchor,
    }
  })
}

function scoreEntry(entry, words, phrase) {
  const t = entry.text.toLowerCase()
  if (!t) return 0

  let score = 0

  // Exact full phrase
  if (t.includes(phrase)) {
    score += phrase.length > 4 ? 30 : 15
    // Bonus if match is near the start
    const pos = t.indexOf(phrase)
    if (pos < 40) score += 8
    else if (pos < 120) score += 3
  }

  // All non-stop words present
  const meaningful = words.filter(w => !STOP_WORDS.has(w))
  if (meaningful.length > 1 && meaningful.every(w => t.includes(w))) score += 12

  // Individual words
  for (const w of words) {
    if (STOP_WORDS.has(w)) continue
    if (t.includes(w)) {
      score += 4
      if (t.startsWith(w)) score += 3
    } else if (w.length > 4) {
      // prefix/stem match
      const stem = w.slice(0, Math.ceil(w.length * 0.8))
      if (t.split(/\s+/).some(tok => tok.startsWith(stem))) score += 1
    }
  }

  if (score === 0) return 0

  // Type multipliers
  if (entry.type === 'heading') {
    score *= entry.level === 1 ? 2.5 : entry.level === 2 ? 2.0 : 1.6
  } else if (entry.type === 'callout' || entry.type === 'highlight') {
    score *= 1.25
  } else if (entry.type === 'code') {
    score *= 0.7
  } else if (entry.type === 'spacer' || entry.type === 'divider') {
    return 0
  }

  return score
}

function runSearch(query, index) {
  const phrase = query.toLowerCase().trim()
  if (phrase.length < 2) return []
  const words = phrase.split(/\s+/).filter(Boolean)

  const scored = []
  for (const entry of index) {
    const s = scoreEntry(entry, words, phrase)
    if (s > 0) scored.push({ ...entry, score: s })
  }
  scored.sort((a, b) => b.score - a.score || a.idx - b.idx)

  // Cap to top 2 results per section to avoid flooding
  const sectionCounts = {}
  const results = []
  for (const r of scored) {
    const key = r.sectionAnchor || '__root'
    sectionCounts[key] = (sectionCounts[key] || 0) + 1
    // Always include headings; cap non-heading blocks at 3 per section
    if (r.type !== 'heading' && sectionCounts[key] > 3) continue
    results.push(r)
    if (results.length >= 24) break
  }
  return results
}

// ── Text highlight ────────────────────────────────────────────────────────────

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }

function highlightText(text, query) {
  if (!query || !text) return text
  const words = query.trim().split(/\s+/).filter(w => w.length > 1 && !STOP_WORDS.has(w.toLowerCase()))
  if (!words.length) return text
  const pattern = words.map(escapeRe).join('|')
  try {
    return text.replace(new RegExp(`(${pattern})`, 'gi'), '<mark class="searchMark">$1</mark>')
  } catch {
    return text
  }
}

function getSnippet(text, query, maxLen = 200) {
  if (!text) return ''
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  const lower = text.toLowerCase()
  let firstIdx = -1
  for (const w of words) {
    const i = lower.indexOf(w)
    if (i !== -1 && (firstIdx === -1 || i < firstIdx)) firstIdx = i
  }
  if (firstIdx === -1 || text.length <= maxLen) return text.slice(0, maxLen)
  const start = Math.max(0, firstIdx - 50)
  const end = Math.min(text.length, start + maxLen)
  let snippet = text.slice(start, end)
  if (start > 0) snippet = '…' + snippet
  if (end < text.length) snippet += '…'
  return snippet
}

// ── Anchor link button ────────────────────────────────────────────────────────

function AnchorButton({ id }) {
  const [copied, setCopied] = useState(false)
  function handleClick() {
    navigator.clipboard?.writeText(
      window.location.origin + window.location.pathname + '#' + id
    ).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
  }
  return (
    <button onClick={handleClick} className={copied ? styles.anchorCopied : styles.anchor} title="Copy link">
      {copied ? '✓' : '#'}
    </button>
  )
}

// ── Copy button for code blocks ───────────────────────────────────────────────

function CopyButton({ text }) {
  const [state, setState] = useState('idle')
  function handleCopy() {
    navigator.clipboard?.writeText(text).then(() => {
      setState('copied')
      setTimeout(() => setState('idle'), 2000)
    }).catch(() => {
      setState('err')
      setTimeout(() => setState('idle'), 2000)
    })
  }
  return (
    <button
      className={styles.copyBtn}
      onClick={handleCopy}
      title={state === 'copied' ? 'Copied!' : 'Copy to clipboard'}
    >
      {state === 'copied' ? 'Copied ✓' : state === 'err' ? 'Failed' : 'Copy'}
    </button>
  )
}

// ── Heading block ─────────────────────────────────────────────────────────────

function HeadingBlock({ block, sectionNumber }) {
  const { id, level, text } = block.data
  const anchorId = id || slugify(text)

  if (level === 1) {
    return (
      <div id={anchorId} className={styles.h1Wrap} style={{ scrollMarginTop: 80 }}>
        <div className={styles.h1Inner}>
          {sectionNumber != null && (
            <span className={styles.sectionBadge}>{String(sectionNumber).padStart(2, '0')}</span>
          )}
          <h2 className={styles.h1}>{text}</h2>
          <AnchorButton id={anchorId} />
        </div>
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

function renderBlock(block, sectionNumber) {
  const key = block.id || block._id || block.idx || Math.random()

  switch (block.type) {
    case 'heading':
      return <HeadingBlock key={key} block={block} sectionNumber={sectionNumber} />

    case 'paragraph':
      return (
        <p key={key} className={styles.paragraph} dangerouslySetInnerHTML={{ __html: block.data.html }} />
      )

    case 'highlight':
      return (
        <div key={key} className={styles.highlight} dangerouslySetInnerHTML={{ __html: block.data.html }} />
      )

    case 'callout': {
      const variantClass = block.data.variant === 'warning' ? styles.warning
        : block.data.variant === 'tip' ? styles.tip
        : styles.info
      const icon = block.data.variant === 'warning' ? '⚠'
        : block.data.variant === 'tip' ? '●'
        : 'ℹ'
      return (
        <div key={key} className={`${styles.callout} ${variantClass}`}>
          <span className={styles.calloutIcon}>{icon}</span>
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
        <div key={key} className={styles.codeWrap}>
          <CopyButton text={block.data.text} />
          <pre className={styles.codeBlock}>{block.data.text}</pre>
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

// ── Search bar ────────────────────────────────────────────────────────────────

function SearchBar({ value, onChange, resultCount, loading }) {
  const inputRef = useRef(null)

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') { onChange(''); inputRef.current?.blur() }
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !e.target.closest('input,textarea'))) {
        e.preventDefault(); inputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onChange])

  return (
    <div className={styles.searchWrap}>
      <span className={styles.searchIcon}>&#128269;</span>
      <input
        ref={inputRef}
        type="search"
        placeholder="Search documentation…"
        value={value}
        onChange={e => onChange(e.target.value)}
        className={styles.searchInput}
        spellCheck={false}
        autoComplete="off"
      />
      {value ? (
        <button className={styles.searchClear} onClick={() => { onChange(''); inputRef.current?.focus() }} title="Clear (Esc)">
          ✕
        </button>
      ) : (
        <span className={styles.searchHint}>&#8984;K</span>
      )}
      {value && value.length >= 2 && !loading && (
        <span className={styles.searchCount}>
          {resultCount === 0 ? 'No results' : `${resultCount} result${resultCount !== 1 ? 's' : ''}`}
        </span>
      )}
    </div>
  )
}

// ── Search results ────────────────────────────────────────────────────────────

const TYPE_LABELS = {
  heading: { label: 'Section', cls: styles.badgeHeading },
  paragraph: { label: 'Doc', cls: styles.badgePara },
  list: { label: 'List', cls: styles.badgeList },
  callout: { label: 'Note', cls: styles.badgeCallout },
  highlight: { label: 'Note', cls: styles.badgeCallout },
  code: { label: 'Code', cls: styles.badgeCode },
}

function SearchResultItem({ result, query, onNavigate }) {
  const snippet = result.type === 'heading' ? result.text : getSnippet(result.text, query)
  const highlighted = highlightText(snippet, query)
  const meta = TYPE_LABELS[result.type] || { label: result.type, cls: styles.badgePara }

  function handleClick() {
    onNavigate(result.targetAnchor)
  }

  const calloutLabel = result.subtype === 'warning' ? 'Warning'
    : result.subtype === 'tip' ? 'Tip'
    : result.type === 'callout' ? 'Info' : null

  return (
    <button className={styles.resultItem} onClick={handleClick}>
      <div className={styles.resultMeta}>
        <span className={`${styles.resultBadge} ${meta.cls}`}>
          {calloutLabel || meta.label}
        </span>
        <span className={styles.resultBreadcrumb}>
          {result.section && <span>{result.section}</span>}
          {result.subsection && result.subsection !== result.section && (
            <><span className={styles.breadcrumbSep}>›</span><span>{result.subsection}</span></>
          )}
        </span>
      </div>
      <p
        className={styles.resultText}
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    </button>
  )
}

function SearchResults({ results, query, onNavigate }) {
  if (results.length === 0) {
    return (
      <div className={styles.noResults}>
        <p className={styles.noResultsTitle}>No results for &ldquo;{query}&rdquo;</p>
        <p className={styles.noResultsHint}>Try a different term, or browse the sections below the search bar.</p>
      </div>
    )
  }
  return (
    <div className={styles.resultsList}>
      {results.map((r, i) => (
        <SearchResultItem key={`${r.idx}-${i}`} result={r} query={query} onNavigate={onNavigate} />
      ))}
    </div>
  )
}

// ── Section cards ─────────────────────────────────────────────────────────────

// Short abbreviations for visual identity — one or two letters per section
const SECTION_ABBR = {
  'Overview':                     'OV',
  'First Run / Setup':            'FR',
  'Getting Started':              'GS',
  'Dashboard':                    'DB',
  'Organization':                 'OR',
  'Locations':                    'LC',
  'Services':                     'SV',
  'Templates':                    'TM',
  'Screens':                      'SC',
  'People':                       'PE',
  'Labels':                       'LB',
  'Automation Rules':             'AU',
  'Users & Accounts':             'US',
  'Planning Center Integration':  'PC',
  'Self-Hosting':                 'SH',
}

const SECTION_COLORS = [
  '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981',
  '#f59e0b', '#ef4444', '#ec4899', '#6366f1',
  '#14b8a6', '#f97316', '#a855f7', '#22c55e',
  '#0ea5e9', '#d946ef', '#84cc16',
]

function SectionCards({ nav }) {
  if (!nav.length) return null
  return (
    <div className={styles.sectionCards}>
      {nav.map((item, i) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          className={styles.sectionCard}
          style={{ '--card-accent': SECTION_COLORS[i % SECTION_COLORS.length] }}
        >
          <span className={styles.cardAbbr}
            style={{ background: SECTION_COLORS[i % SECTION_COLORS.length] }}>
            {SECTION_ABBR[item.label] || item.label.slice(0, 2).toUpperCase()}
          </span>
          <div className={styles.cardBody}>
            <span className={styles.cardTitle}>{item.label}</span>
            {item.children?.length > 0 && (
              <span className={styles.cardSubs}>
                {item.children.slice(0, 3).map(c => c.label).join(' · ')}
                {item.children.length > 3 && ` · +${item.children.length - 3} more`}
              </span>
            )}
          </div>
          <span className={styles.cardArrow}>›</span>
        </a>
      ))}
    </div>
  )
}

// ── Main Docs page ────────────────────────────────────────────────────────────

export default function Docs() {
  const { hash } = useLocation()
  const { user } = useAuth()
  const [activeId, setActiveId] = useState('')
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const detailsRef = useRef(null)

  useEffect(() => {
    fetch('/api/site-admin/pages/docs/public')
      .then(r => r.json())
      .then(d => { setBlocks(d.blocks || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const nav = deriveNav(blocks)
  const allIds = flattenNavIds(nav)

  // Build search index once blocks load
  const searchIndex = buildSearchIndex(blocks)

  // Compute section number for each H1 block
  const sectionNumbers = {}
  let sectionNum = 0
  blocks.forEach(b => {
    if (b.type === 'heading' && b.data.level === 1) {
      sectionNum++
      sectionNumbers[b.data.id || slugify(b.data.text)] = sectionNum
    }
  })

  // Search
  const trimmedQuery = query.trim()
  const isSearching = trimmedQuery.length >= 2
  const searchResults = isSearching ? runSearch(trimmedQuery, searchIndex) : []

  const navigate = useCallback((anchorId) => {
    setQuery('')
    setTimeout(() => {
      const el = document.getElementById(anchorId)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 60)
  }, [])

  // Scroll to hash on load
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
          {nav.map((item, i) => (
            <div key={item.id}>
              <a
                href={`#${item.id}`}
                className={`${styles.navItem}${activeId === item.id ? ' ' + styles.navItemActive : ''}`}
              >
                <span
                  className={styles.navDot}
                  style={{ background: SECTION_COLORS[i % SECTION_COLORS.length] }}
                />
                {item.label}
              </a>
              {item.children?.map(child => (
                <div key={child.id}>
                  <a
                    href={`#${child.id}`}
                    className={`${styles.navChild}${activeId === child.id ? ' ' + styles.navChildActive : ''}`}
                  >
                    {child.label}
                  </a>
                  {child.children?.map(gc => (
                    <a
                      key={gc.id}
                      href={`#${gc.id}`}
                      className={`${styles.navGrandchild}${activeId === gc.id ? ' ' + styles.navGrandchildActive : ''}`}
                    >
                      {gc.label}
                    </a>
                  ))}
                </div>
              ))}
            </div>
          ))}
        </nav>

        {/* ── Content ── */}
        <main className={styles.content}>
          <details ref={detailsRef} className={styles.mobileNav}>
            <summary className={styles.mobileNavSummary}>On this page &#9662;</summary>
            {nav.map(item => (
              <div key={item.id}>
                <a href={`#${item.id}`} className={styles.mobileNavItem}
                  onClick={() => { if (detailsRef.current) detailsRef.current.open = false }}>
                  {item.label}
                </a>
                {item.children?.map(child => (
                  <a key={child.id} href={`#${child.id}`} className={styles.mobileNavChild}
                    onClick={() => { if (detailsRef.current) detailsRef.current.open = false }}>
                    {child.label}
                  </a>
                ))}
              </div>
            ))}
          </details>

          <h1 className={styles.docTitle}>Beacon &mdash; Documentation</h1>
          <p className={styles.lead}>
            Everything you need to know to set up and run Beacon for your church.
          </p>

          <SearchBar
            value={query}
            onChange={setQuery}
            resultCount={searchResults.length}
            loading={loading}
          />

          {isSearching ? (
            <SearchResults results={searchResults} query={trimmedQuery} onNavigate={navigate} />
          ) : (
            <>
              {!loading && <SectionCards nav={nav} />}

              {loading ? (
                <div className={styles.loadingMsg}>Loading documentation&hellip;</div>
              ) : (
                <div className={styles.blockContent}>
                  {blocks.map(block => {
                    const anchorId = block.type === 'heading' && block.data.level === 1
                      ? (block.data.id || slugify(block.data.text))
                      : null
                    const sectionNum = anchorId ? sectionNumbers[anchorId] : null
                    return renderBlock(block, sectionNum)
                  })}
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
