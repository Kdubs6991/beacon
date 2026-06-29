import { useState, useEffect, useRef, useReducer, useLayoutEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import SiteAdminLogin from './SiteAdminLogin'
import styles from './SiteAdminDocs.module.css'

// ── Helpers ───────────────────────────────────────────────────────────────────

function slugify(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

function newBlock(type) {
  const defaults = {
    heading:   { level: 2, text: '', id: '' },
    paragraph: { html: '' },
    highlight: { html: '' },
    callout:   { variant: 'info', html: '' },
    list:      { ordered: false, items: [''] },
    code:      { text: '' },
    spacer:    { size: 'md' },
    divider:   {},
  }
  return { _id: crypto.randomUUID(), type, data: defaults[type] ?? {} }
}

const BLOCK_TYPES = [
  { id: 'heading',   label: 'Heading' },
  { id: 'paragraph', label: 'Paragraph' },
  { id: 'highlight', label: 'Highlight' },
  { id: 'callout',   label: 'Callout' },
  { id: 'list',      label: 'List' },
  { id: 'code',      label: 'Code' },
  { id: 'spacer',    label: 'Spacer' },
  { id: 'divider',   label: 'Divider' },
]

const TYPE_COLORS = {
  heading:   '#60a5fa',
  paragraph: '#a78bfa',
  highlight: '#38bdf8',
  callout:   '#fbbf24',
  list:      '#34d399',
  code:      '#f472b6',
  spacer:    '#94a3b8',
  divider:   '#94a3b8',
}

// ── Rich text editor (contenteditable) ───────────────────────────────────────

function RichEditor({ html, onChange, placeholder, className }) {
  const ref = useRef(null)
  const mounted = useRef(false)

  useLayoutEffect(() => {
    if (ref.current && !mounted.current) {
      ref.current.innerHTML = html || ''
      mounted.current = true
      syncEmpty()
    }
  })

  function syncEmpty() {
    if (!ref.current) return
    const empty = !ref.current.textContent.trim() && !ref.current.querySelector('img, br')
    if (empty) ref.current.setAttribute('data-empty', '')
    else ref.current.removeAttribute('data-empty')
  }

  function handleInput() {
    syncEmpty()
    const content = ref.current.innerHTML
    onChange(content === '<br>' ? '' : content)
  }

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      className={`${styles.richEditor}${className ? ' ' + className : ''}`}
      data-placeholder={placeholder || 'Type here…'}
      onInput={handleInput}
    />
  )
}

// ── Per-block editors ─────────────────────────────────────────────────────────

function HeadingEditor({ data, onChange }) {
  const levelClass = data.level === 1 ? styles.headingH1 : data.level === 3 ? styles.headingH3 : styles.headingH2
  return (
    <div>
      <div className={styles.levelBtns}>
        {[1, 2, 3].map(l => (
          <button
            key={l}
            className={data.level === l ? styles.levelBtnActive : styles.levelBtn}
            onClick={() => onChange({ ...data, level: l })}
          >{`H${l}`}</button>
        ))}
      </div>
      <input
        className={`${styles.headingInput} ${levelClass}`}
        value={data.text}
        placeholder="Heading text…"
        onChange={e => {
          const text = e.target.value
          onChange({ ...data, text, id: slugify(text) })
        }}
      />
      {data.id && <div className={styles.anchorPreview}>#{data.id}</div>}
    </div>
  )
}

function ParagraphEditor({ data, onChange }) {
  return (
    <RichEditor
      html={data.html}
      onChange={html => onChange({ ...data, html })}
      placeholder="Paragraph text…"
    />
  )
}

function HighlightEditor({ data, onChange }) {
  return (
    <div className={styles.highlight}>
      <RichEditor
        html={data.html}
        onChange={html => onChange({ ...data, html })}
        placeholder="Highlight content…"
      />
    </div>
  )
}

function CalloutEditor({ data, onChange }) {
  const calloutClass = data.variant === 'warning' ? styles.calloutWarning
    : data.variant === 'tip' ? styles.calloutTip
    : styles.calloutInfo
  return (
    <div>
      <div className={styles.levelBtns}>
        {['info', 'warning', 'tip'].map(v => (
          <button
            key={v}
            className={data.variant === v ? styles.levelBtnActive : styles.levelBtn}
            onClick={() => onChange({ ...data, variant: v })}
          >{v.charAt(0).toUpperCase() + v.slice(1)}</button>
        ))}
      </div>
      <div className={calloutClass}>
        <RichEditor
          html={data.html}
          onChange={html => onChange({ ...data, html })}
          placeholder="Callout content…"
        />
      </div>
    </div>
  )
}

function ListEditor({ data, onChange }) {
  function updateItem(i, html) {
    const items = [...data.items]
    items[i] = html
    onChange({ ...data, items })
  }
  function addItem() {
    onChange({ ...data, items: [...data.items, ''] })
  }
  function removeItem(i) {
    if (data.items.length === 1) return
    onChange({ ...data, items: data.items.filter((_, idx) => idx !== i) })
  }
  return (
    <div>
      <div className={styles.levelBtns}>
        <button className={!data.ordered ? styles.levelBtnActive : styles.levelBtn} onClick={() => onChange({ ...data, ordered: false })}>Unordered</button>
        <button className={data.ordered ? styles.levelBtnActive : styles.levelBtn} onClick={() => onChange({ ...data, ordered: true })}>Ordered</button>
      </div>
      <div className={styles.listItems}>
        {data.items.map((item, i) => (
          <div key={i} className={styles.listItemRow}>
            <span className={styles.listBullet}>{data.ordered ? `${i + 1}.` : '•'}</span>
            <RichEditor
              html={item}
              onChange={html => updateItem(i, html)}
              placeholder="List item…"
            />
            <button className={styles.removeItemBtn} onMouseDown={e => { e.preventDefault(); removeItem(i) }}>×</button>
          </div>
        ))}
      </div>
      <button className={styles.addItemBtn} onClick={addItem}>+ Add item</button>
    </div>
  )
}

function CodeEditor({ data, onChange }) {
  return (
    <textarea
      className={styles.codeTextarea}
      value={data.text}
      onChange={e => onChange({ ...data, text: e.target.value })}
      placeholder="Code or preformatted text…"
      spellCheck={false}
    />
  )
}

function SpacerEditor({ data, onChange }) {
  const heights = { sm: 16, md: 32, lg: 56 }
  const h = heights[data.size] || 32
  return (
    <div>
      <div className={styles.levelBtns}>
        {[['sm', 'Small (16px)'], ['md', 'Medium (32px)'], ['lg', 'Large (56px)']].map(([val, label]) => (
          <button
            key={val}
            className={data.size === val ? styles.levelBtnActive : styles.levelBtn}
            onClick={() => onChange({ ...data, size: val })}
          >{label}</button>
        ))}
      </div>
      <div className={styles.spacerPreview} style={{ height: h }}>
        <span className={styles.spacerLabel}>{h}px spacer</span>
      </div>
    </div>
  )
}

function DividerEditor() {
  return <div className={styles.dividerPreview} />
}

function BlockEditor({ block, onChange }) {
  switch (block.type) {
    case 'heading':   return <HeadingEditor data={block.data} onChange={onChange} />
    case 'paragraph': return <ParagraphEditor data={block.data} onChange={onChange} />
    case 'highlight': return <HighlightEditor data={block.data} onChange={onChange} />
    case 'callout':   return <CalloutEditor data={block.data} onChange={onChange} />
    case 'list':      return <ListEditor data={block.data} onChange={onChange} />
    case 'code':      return <CodeEditor data={block.data} onChange={onChange} />
    case 'spacer':    return <SpacerEditor data={block.data} onChange={onChange} />
    case 'divider':   return <DividerEditor />
    default:          return <div className={styles.unknownBlock}>Unknown block type: {block.type}</div>
  }
}

// ── Formatting toolbar ────────────────────────────────────────────────────────

function FormatToolbar() {
  function cmd(command, value = null) {
    document.execCommand(command, false, value)
  }

  function handleLink() {
    const url = window.prompt('Enter URL:')
    if (url) cmd('createLink', url)
  }

  return (
    <div className={styles.toolbar}>
      <button className={styles.toolbarBtn} title="Bold" onMouseDown={e => { e.preventDefault(); cmd('bold') }}><strong>B</strong></button>
      <button className={styles.toolbarBtn} title="Italic" onMouseDown={e => { e.preventDefault(); cmd('italic') }}><em>I</em></button>
      <button className={styles.toolbarBtn} title="Underline" onMouseDown={e => { e.preventDefault(); cmd('underline') }}><u>U</u></button>
      <button className={styles.toolbarBtn} title="Strikethrough" onMouseDown={e => { e.preventDefault(); cmd('strikeThrough') }}><s>S</s></button>
      <button className={styles.toolbarBtn} title="Link" onMouseDown={e => { e.preventDefault(); handleLink() }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
      </button>
      <button className={styles.toolbarBtn} title="Unlink" onMouseDown={e => { e.preventDefault(); cmd('unlink') }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07"/><line x1="2" y1="2" x2="22" y2="22"/></svg>
      </button>
      <button className={styles.toolbarBtn} title="Inline code" onMouseDown={e => {
        e.preventDefault()
        const sel = window.getSelection()
        if (!sel.isCollapsed) {
          const text = sel.toString()
          cmd('insertHTML', `<code>${text}</code>`)
        }
      }}>&lt;/&gt;</button>
      <button className={styles.toolbarBtn} title="Clear formatting" onMouseDown={e => { e.preventDefault(); cmd('removeFormat') }}>✕</button>
    </div>
  )
}

// ── Add block menu ────────────────────────────────────────────────────────────

function AddBlockMenu({ onSelect, onClose }) {
  return (
    <div className={styles.addBlockOverlay} onClick={onClose}>
      <div className={styles.addBlockMenu} onClick={e => e.stopPropagation()}>
        <div className={styles.addBlockTitle}>Add block</div>
        <div className={styles.addBlockGrid}>
          {BLOCK_TYPES.map(t => (
            <button
              key={t.id}
              className={styles.addBlockBtn}
              onClick={() => onSelect(t.id)}
              style={{ '--type-color': TYPE_COLORS[t.id] }}
            >
              <span className={styles.addBlockDot} />
              {t.label}
            </button>
          ))}
        </div>
        <button className={styles.addBlockCancel} onClick={onClose}>Cancel</button>
      </div>
    </div>
  )
}

// ── Main editor ───────────────────────────────────────────────────────────────

export default function SiteAdminDocs() {
  const [authenticated, setAuthenticated] = useState(null)
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveOk, setSaveOk] = useState(false)
  const [addMenuIndex, setAddMenuIndex] = useState(null)
  const [, forceUpdate] = useReducer(x => x + 1, 0)

  const blockEls = useRef([])
  const dragRef = useRef(null) // { fromIndex, toIndex }

  // Auth check
  useEffect(() => {
    fetch('/api/site-admin/me', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setAuthenticated(d.authenticated))
      .catch(() => setAuthenticated(false))
  }, [])

  // Load blocks
  useEffect(() => {
    if (!authenticated) return
    setLoading(true)
    fetch('/api/site-admin/pages/docs/blocks', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        setBlocks((d.blocks || []).map(b => ({ ...b, _id: b.id ? String(b.id) : crypto.randomUUID() })))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [authenticated])

  // Save
  async function handleSave() {
    setSaving(true)
    setSaveOk(false)
    try {
      const res = await fetch('/api/site-admin/pages/docs/blocks', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: blocks.map(b => ({ type: b.type, data: b.data })) }),
      })
      if (res.ok) { setSaveOk(true); setTimeout(() => setSaveOk(false), 2000) }
    } finally {
      setSaving(false)
    }
  }

  // Block mutations
  function updateBlock(index, newData) {
    setBlocks(prev => prev.map((b, i) => i === index ? { ...b, data: newData } : b))
  }

  function deleteBlock(index) {
    setBlocks(prev => prev.filter((_, i) => i !== index))
  }

  function insertBlock(atIndex, type) {
    const b = newBlock(type)
    setBlocks(prev => [...prev.slice(0, atIndex), b, ...prev.slice(atIndex)])
    setAddMenuIndex(null)
  }

  // Drag and drop (pointer events)
  function handleDragStart(e, index) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { fromIndex: index, toIndex: index }
    forceUpdate()
  }

  function handleDragMove(e) {
    if (!dragRef.current) return
    const y = e.clientY
    let toIndex = blocks.length
    for (let i = 0; i < blockEls.current.length; i++) {
      const el = blockEls.current[i]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (y < rect.top + rect.height / 2) { toIndex = i; break }
    }
    if (toIndex !== dragRef.current.toIndex) {
      dragRef.current = { ...dragRef.current, toIndex }
      forceUpdate()
    }
  }

  function handleDragEnd() {
    if (!dragRef.current) return
    const { fromIndex, toIndex } = dragRef.current
    dragRef.current = null
    const effectiveInsert = toIndex > fromIndex ? toIndex - 1 : toIndex
    if (effectiveInsert !== fromIndex) {
      setBlocks(prev => {
        const next = [...prev]
        const [moved] = next.splice(fromIndex, 1)
        next.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, moved)
        return next
      })
    } else {
      forceUpdate()
    }
  }

  if (authenticated === null) return null
  if (!authenticated) return <SiteAdminLogin onAuth={() => setAuthenticated(true)} />

  const drag = dragRef.current

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <header className={styles.topBar}>
        <Link to="/admin" className={styles.backLink}>← Documentation</Link>
        <span className={styles.topBarTitle}>Documentation Editor</span>
        <button
          className={`${styles.saveBtn}${saving ? ' ' + styles.saveBtnSaving : ''}${saveOk ? ' ' + styles.saveBtnOk : ''}`}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving…' : saveOk ? 'Saved ✓' : 'Save'}
        </button>
      </header>

      {/* Format toolbar */}
      <FormatToolbar />

      {/* Body */}
      <main className={styles.body}>
        {loading ? (
          <div className={styles.loadingMsg}>Loading…</div>
        ) : (
          <div className={styles.blockList}>
            {/* Drop line at position 0 */}
            {drag && drag.toIndex === 0 && <div className={styles.dropLine} />}

            {blocks.map((block, index) => (
              <div key={block._id} className={styles.blockRow}>
                <div
                  ref={el => { blockEls.current[index] = el }}
                  className={`${styles.block}${drag?.fromIndex === index ? ' ' + styles.blockDragging : ''}`}
                >
                  {/* Drag handle */}
                  <div
                    className={styles.dragHandle}
                    style={{ touchAction: 'none', cursor: drag ? 'grabbing' : 'grab' }}
                    onPointerDown={e => handleDragStart(e, index)}
                    onPointerMove={handleDragMove}
                    onPointerUp={handleDragEnd}
                    onPointerCancel={handleDragEnd}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
                      <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                      <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
                    </svg>
                  </div>

                  {/* Block inner */}
                  <div className={styles.blockInner}>
                    <div className={styles.blockHeader}>
                      <span className={styles.typeBadge} style={{ '--type-color': TYPE_COLORS[block.type] || '#94a3b8' }}>
                        {block.type}
                      </span>
                      <button
                        className={styles.deleteBtn}
                        onClick={() => deleteBlock(index)}
                        title="Delete block"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    </div>
                    <BlockEditor block={block} onChange={data => updateBlock(index, data)} />
                  </div>
                </div>

                {/* Drop line after this block */}
                {drag && drag.toIndex === index + 1 && drag.fromIndex !== index && drag.fromIndex !== index + 1 && (
                  <div className={styles.dropLine} />
                )}

                {/* Add between button */}
                {!drag && (
                  <div className={styles.addBetween} onClick={() => setAddMenuIndex(index + 1)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </div>
                )}
              </div>
            ))}

            {/* Drop line at end */}
            {drag && drag.toIndex === blocks.length && <div className={styles.dropLine} />}

            {/* Add block at bottom */}
            {!drag && (
              <div className={styles.addBtnRow}>
                <button className={styles.addBtnRowBtn} onClick={() => setAddMenuIndex(blocks.length)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add block
                </button>
              </div>
            )}

            {blocks.length === 0 && !drag && (
              <div className={styles.emptyMsg}>No blocks yet. Use "Add block" to start building the documentation.</div>
            )}
          </div>
        )}
      </main>

      {/* Add block menu */}
      {addMenuIndex !== null && (
        <AddBlockMenu
          onSelect={type => insertBlock(addMenuIndex, type)}
          onClose={() => setAddMenuIndex(null)}
        />
      )}
    </div>
  )
}
