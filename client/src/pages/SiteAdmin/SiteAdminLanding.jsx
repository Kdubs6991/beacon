import { useState, useEffect, useRef, useReducer, useCallback } from 'react'
import { Link } from 'react-router-dom'
import SiteAdminLogin from './SiteAdminLogin'
import styles from './SiteAdminLanding.module.css'

// ── Element type definitions ──────────────────────────────────────────────────

const EL_TYPES = [
  { id: 'heading',      label: 'Heading',      color: '#60a5fa' },
  { id: 'text',         label: 'Text',         color: '#a78bfa' },
  { id: 'image',        label: 'Image',        color: '#34d399' },
  { id: 'button',       label: 'Button',       color: '#fb923c' },
  { id: 'badge',        label: 'Badge',        color: '#f472b6' },
  { id: 'spacer',       label: 'Spacer',       color: '#94a3b8' },
  { id: 'divider',      label: 'Divider',      color: '#94a3b8' },
  { id: 'mock_display', label: 'Mock Display', color: '#fbbf24' },
]

function newElement(type) {
  const defaults = {
    heading:      { level: 2, text: 'New heading', fullWidth: false },
    text:         { html: 'Add your text here.', fullWidth: false },
    image:        { url: '', alt: '', fullWidth: false },
    button:       { label: 'Click here', href: '/', variant: 'primary', fullWidth: false },
    badge:        { text: 'Badge', color: '#60a5fa', fullWidth: false },
    spacer:       { height: 40, fullWidth: true },
    divider:      { fullWidth: true },
    mock_display: { fullWidth: false },
  }
  return { _id: crypto.randomUUID(), type, data: { ...(defaults[type] ?? {}) } }
}

function newSection() {
  return {
    _id: crypto.randomUUID(),
    type: 'section',
    data: { label: 'New Section', bgColor: '', padding: 'lg', columns: 3, elements: [] },
  }
}

// ── Element preview (compact tile visual) ─────────────────────────────────────

function ElPreview({ el }) {
  switch (el.type) {
    case 'heading': {
      const sz = { 1: '1.25rem', 2: '1rem', 3: '0.88rem' }
      return (
        <div className={styles.prevHeading} style={{ fontSize: sz[el.data.level] || '1rem' }}>
          {el.data.text || 'Heading'}
        </div>
      )
    }
    case 'text':
      return (
        <div className={styles.prevText}
          dangerouslySetInnerHTML={{ __html: el.data.html || '<em style="opacity:.4">Empty text</em>' }} />
      )
    case 'image':
      return el.data.url
        ? <img src={el.data.url} alt={el.data.alt} className={styles.prevImage} />
        : <div className={styles.prevImageEmpty}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg><span>No image</span></div>
    case 'button':
      return (
        <div className={el.data.variant === 'secondary' ? styles.prevBtnSec : styles.prevBtnPri}>
          {el.data.label || 'Button'}
        </div>
      )
    case 'badge':
      return (
        <div className={styles.prevBadge} style={{ '--badge-color': el.data.color || '#60a5fa' }}>
          {el.data.text || 'Badge'}
        </div>
      )
    case 'spacer':
      return (
        <div className={styles.prevSpacer} style={{ height: Math.min(el.data.height || 40, 56) }}>
          <span>{el.data.height || 40}px</span>
        </div>
      )
    case 'divider':
      return <div className={styles.prevDivider} />
    case 'mock_display':
      return <div className={styles.prevMock}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="2" y="3" rx="2" width="20" height="14"/><polyline points="8 21 12 17 16 21"/></svg> Beacon UI Mockup</div>
    default:
      return <div className={styles.prevUnknown}>{el.type}</div>
  }
}

// ── Element edit forms ────────────────────────────────────────────────────────

function FullWidthToggle({ value, onChange }) {
  return (
    <label className={styles.checkRow}>
      <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} />
      <span>Span full width</span>
    </label>
  )
}

function ElEditForm({ el, onChange, onUpload }) {
  const u = (k, v) => onChange({ ...el.data, [k]: v })
  switch (el.type) {
    case 'heading':
      return (
        <div className={styles.editFormFields}>
          <div className={styles.editField}>
            <label className={styles.editLabel}>Level</label>
            <div className={styles.toggleRow}>
              {[1, 2, 3].map(l => (
                <button key={l} className={el.data.level === l ? styles.toggleActive : styles.toggleBtn}
                  onClick={() => u('level', l)}>H{l}</button>
              ))}
            </div>
          </div>
          <div className={styles.editField}>
            <label className={styles.editLabel}>Text</label>
            <textarea className={styles.editTextarea} rows={2} value={el.data.text || ''} onChange={e => u('text', e.target.value)} />
          </div>
          <FullWidthToggle value={el.data.fullWidth} onChange={v => u('fullWidth', v)} />
        </div>
      )
    case 'text':
      return (
        <div className={styles.editFormFields}>
          <div className={styles.editField}>
            <label className={styles.editLabel}>Content</label>
            <textarea className={styles.editTextarea} rows={5} value={el.data.html || ''} onChange={e => u('html', e.target.value)} placeholder="Text or HTML…" />
          </div>
          <FullWidthToggle value={el.data.fullWidth} onChange={v => u('fullWidth', v)} />
        </div>
      )
    case 'image': {
      const fileRef = useRef(null)
      const [uploading, setUploading] = useState(false)
      async function handleFile(e) {
        const file = e.target.files[0]; if (!file) return
        setUploading(true)
        const url = await onUpload(file)
        if (url) u('url', url)
        setUploading(false); e.target.value = ''
      }
      return (
        <div className={styles.editFormFields}>
          <div className={styles.editField}>
            <label className={styles.editLabel}>Image URL</label>
            <div className={styles.imageRow}>
              <input className={styles.editInput} value={el.data.url || ''} onChange={e => u('url', e.target.value)} placeholder="https://…" />
              <button className={styles.uploadBtn} onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? '…' : 'Upload'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
            </div>
            {el.data.url && <img src={el.data.url} alt="" className={styles.imageThumb} />}
          </div>
          <div className={styles.editField}>
            <label className={styles.editLabel}>Alt text</label>
            <input className={styles.editInput} value={el.data.alt || ''} onChange={e => u('alt', e.target.value)} placeholder="Describe the image…" />
          </div>
          <FullWidthToggle value={el.data.fullWidth} onChange={v => u('fullWidth', v)} />
        </div>
      )
    }
    case 'button':
      return (
        <div className={styles.editFormFields}>
          <div className={styles.editField}>
            <label className={styles.editLabel}>Label</label>
            <input className={styles.editInput} value={el.data.label || ''} onChange={e => u('label', e.target.value)} placeholder="Button text" />
          </div>
          <div className={styles.editField}>
            <label className={styles.editLabel}>Link</label>
            <input className={styles.editInput} value={el.data.href || ''} onChange={e => u('href', e.target.value)} placeholder="/path or https://…" />
          </div>
          <div className={styles.editField}>
            <label className={styles.editLabel}>Style</label>
            <div className={styles.toggleRow}>
              {['primary', 'secondary'].map(v => (
                <button key={v} className={(el.data.variant || 'primary') === v ? styles.toggleActive : styles.toggleBtn}
                  onClick={() => u('variant', v)}>{v.charAt(0).toUpperCase() + v.slice(1)}</button>
              ))}
            </div>
          </div>
          <FullWidthToggle value={el.data.fullWidth} onChange={v => u('fullWidth', v)} />
        </div>
      )
    case 'badge':
      return (
        <div className={styles.editFormFields}>
          <div className={styles.editField}>
            <label className={styles.editLabel}>Text</label>
            <input className={styles.editInput} value={el.data.text || ''} onChange={e => u('text', e.target.value)} placeholder="Badge label" />
          </div>
          <div className={styles.editField}>
            <label className={styles.editLabel}>Color</label>
            <div className={styles.colorRow}>
              <input type="color" className={styles.colorSwatch} value={el.data.color || '#60a5fa'} onChange={e => u('color', e.target.value)} />
              <input className={styles.editInput} value={el.data.color || ''} onChange={e => u('color', e.target.value)} placeholder="#60a5fa" />
            </div>
          </div>
          <FullWidthToggle value={el.data.fullWidth} onChange={v => u('fullWidth', v)} />
        </div>
      )
    case 'spacer':
      return (
        <div className={styles.editFormFields}>
          <div className={styles.editField}>
            <label className={styles.editLabel}>Height (px)</label>
            <input type="number" className={styles.editInput} min={8} max={200} step={8}
              value={el.data.height || 40} onChange={e => u('height', Number(e.target.value))} />
          </div>
        </div>
      )
    case 'divider':
    case 'mock_display':
      return <div className={styles.noSettings}>No settings for this element type.</div>
    default:
      return null
  }
}

// ── Element edit modal ────────────────────────────────────────────────────────

function ElEditModal({ el, onSave, onClose, onUpload }) {
  const [draft, setDraft] = useState(el)
  const meta = EL_TYPES.find(t => t.id === el.type) || {}
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>Edit {meta.label || el.type}</span>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          <ElEditForm el={draft} onChange={data => setDraft(prev => ({ ...prev, data }))} onUpload={onUpload} />
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.modalSaveBtn} onClick={() => { onSave(draft); onClose() }}>Done</button>
        </div>
      </div>
    </div>
  )
}

// ── Add element menu ──────────────────────────────────────────────────────────

function AddElMenu({ onSelect, onClose }) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.addElBox} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>Add element</span>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.addElGrid}>
          {EL_TYPES.map(t => (
            <button key={t.id} className={styles.addElBtn} onClick={() => onSelect(t.id)}
              style={{ '--el-color': t.color }}>
              <div className={styles.addElDot} />
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Section settings panel ───────────────────────────────────────────────────

function SectionSettingsModal({ section, onSave, onClose }) {
  const [draft, setDraft] = useState(section.data)
  const u = (k, v) => setDraft(prev => ({ ...prev, [k]: v }))
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>Section settings</span>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.editFormFields}>
            <div className={styles.editField}>
              <label className={styles.editLabel}>Section name</label>
              <input className={styles.editInput} value={draft.label || ''} onChange={e => u('label', e.target.value)} placeholder="Section name…" />
            </div>
            <div className={styles.editField}>
              <label className={styles.editLabel}>Grid columns</label>
              <div className={styles.toggleRow}>
                {[1, 2, 3, 4].map(n => (
                  <button key={n} className={(draft.columns || 3) === n ? styles.toggleActive : styles.toggleBtn}
                    onClick={() => u('columns', n)}>{n}</button>
                ))}
              </div>
            </div>
            <div className={styles.editField}>
              <label className={styles.editLabel}>Padding</label>
              <div className={styles.toggleRow}>
                {[['none','None'], ['sm','S'], ['md','M'], ['lg','L'], ['xl','XL']].map(([v, l]) => (
                  <button key={v} className={(draft.padding || 'lg') === v ? styles.toggleActive : styles.toggleBtn}
                    onClick={() => u('padding', v)}>{l}</button>
                ))}
              </div>
            </div>
            <div className={styles.editField}>
              <label className={styles.editLabel}>Background color</label>
              <div className={styles.colorRow}>
                <input type="color" className={styles.colorSwatch}
                  value={draft.bgColor || '#000000'} onChange={e => u('bgColor', e.target.value)} />
                <input className={styles.editInput} value={draft.bgColor || ''}
                  onChange={e => u('bgColor', e.target.value)} placeholder="Transparent (leave blank)" />
                {draft.bgColor && <button className={styles.clearBtn} onClick={() => u('bgColor', '')}>Clear</button>}
              </div>
            </div>
          </div>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.modalSaveBtn} onClick={() => { onSave(draft); onClose() }}>Done</button>
        </div>
      </div>
    </div>
  )
}

// ── Canvas (element grid editor for one section) ──────────────────────────────

function SectionCanvas({ section, onUpdateSection, onBack, onUpload }) {
  const [elements, setElements] = useState(section.data.elements || [])
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [editingIdx, setEditingIdx] = useState(null)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [, forceUpdate] = useReducer(x => x + 1, 0)

  const elRefs = useRef([])
  const dragRef = useRef(null)

  function saveElements(els) {
    setElements(els)
    onUpdateSection({ ...section.data, elements: els })
  }

  function addElement(type) {
    const el = newElement(type)
    const next = [...elements, el]
    saveElements(next)
    setShowAddMenu(false)
    setEditingIdx(next.length - 1)
  }

  function updateElement(idx, updated) {
    const next = elements.map((e, i) => i === idx ? updated : e)
    saveElements(next)
  }

  function deleteElement(idx) {
    saveElements(elements.filter((_, i) => i !== idx))
    setSelectedIdx(null)
  }

  function duplicateElement(idx) {
    const copy = { ...elements[idx], _id: crypto.randomUUID() }
    const next = [...elements.slice(0, idx + 1), copy, ...elements.slice(idx + 1)]
    saveElements(next)
  }

  // Drag-and-drop
  function handleDragStart(e, index) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { fromIndex: index, toIndex: index }
    forceUpdate()
  }
  function handleDragMove(e) {
    if (!dragRef.current) return
    const y = e.clientY
    let toIndex = elements.length
    for (let i = 0; i < elRefs.current.length; i++) {
      const el = elRefs.current[i]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (y < rect.top + rect.height / 2) { toIndex = i; break }
    }
    if (toIndex !== dragRef.current.toIndex) { dragRef.current = { ...dragRef.current, toIndex }; forceUpdate() }
  }
  function handleDragEnd() {
    if (!dragRef.current) return
    const { fromIndex, toIndex } = dragRef.current
    dragRef.current = null
    if (toIndex !== fromIndex) {
      const next = [...elements]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, moved)
      saveElements(next)
    } else { forceUpdate() }
  }

  const drag = dragRef.current
  const cols = section.data.columns || 3

  return (
    <div className={styles.page}>
      {/* Top bar */}
      <header className={styles.topBar}>
        <button className={styles.backBtn} onClick={onBack}>← Sections</button>
        <span className={styles.topBarTitle}>{section.data.label || 'Section'}</span>
        <div className={styles.topBarRight}>
          <button className={styles.settingsBtn} onClick={() => setShowSettings(true)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
            Settings
          </button>
        </div>
      </header>

      {/* Grid canvas */}
      <div className={styles.canvasWrap} onClick={() => setSelectedIdx(null)}>
        <div className={styles.canvas} style={{ '--cols': cols }}>
          {drag && drag.toIndex === 0 && <div className={styles.elDropLine} style={{ gridColumn: '1 / -1' }} />}

          {elements.map((el, idx) => {
            const isSelected = selectedIdx === idx
            const isDragging = drag?.fromIndex === idx
            const fullWidth = el.data.fullWidth ? '1 / -1' : 'span 1'
            return (
              <div key={el._id}
                ref={r => { elRefs.current[idx] = r }}
                className={`${styles.elTile}${isSelected ? ' ' + styles.elTileSelected : ''}${isDragging ? ' ' + styles.elTileDragging : ''}`}
                style={{ gridColumn: fullWidth }}
                onClick={e => { e.stopPropagation(); setSelectedIdx(idx) }}
              >
                {/* Drag handle */}
                <div
                  className={styles.elDragHandle}
                  style={{ touchAction: 'none', cursor: drag ? 'grabbing' : 'grab' }}
                  onPointerDown={e => { e.stopPropagation(); handleDragStart(e, idx) }}
                  onPointerMove={handleDragMove}
                  onPointerUp={handleDragEnd}
                  onPointerCancel={handleDragEnd}
                  onClick={e => e.stopPropagation()}
                >
                  <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
                    <circle cx="2.5" cy="2" r="1.2"/><circle cx="7.5" cy="2" r="1.2"/>
                    <circle cx="2.5" cy="7" r="1.2"/><circle cx="7.5" cy="7" r="1.2"/>
                    <circle cx="2.5" cy="12" r="1.2"/><circle cx="7.5" cy="12" r="1.2"/>
                  </svg>
                </div>

                {/* Preview */}
                <div className={styles.elContent}>
                  <ElPreview el={el} />
                </div>

                {/* Selected overlay */}
                {isSelected && (
                  <div className={styles.elOverlay} onClick={e => e.stopPropagation()}>
                    <button className={styles.elOverlayBtn} onClick={() => setEditingIdx(idx)} title="Edit">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Edit
                    </button>
                    <button className={styles.elOverlayBtn} onClick={() => duplicateElement(idx)} title="Duplicate">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                    <button className={`${styles.elOverlayBtn} ${styles.elDeleteBtn}`} onClick={() => deleteElement(idx)} title="Delete">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {drag && drag.toIndex === elements.length && <div className={styles.elDropLine} style={{ gridColumn: '1 / -1' }} />}

          {/* Add element button always at end */}
          <div className={styles.addElTile} onClick={e => { e.stopPropagation(); setShowAddMenu(true) }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add element
          </div>
        </div>
      </div>

      {/* Element edit modal */}
      {editingIdx !== null && elements[editingIdx] && (
        <ElEditModal
          el={elements[editingIdx]}
          onSave={updated => updateElement(editingIdx, updated)}
          onClose={() => setEditingIdx(null)}
          onUpload={onUpload}
        />
      )}

      {/* Add element menu */}
      {showAddMenu && <AddElMenu onSelect={addElement} onClose={() => setShowAddMenu(false)} />}

      {/* Section settings */}
      {showSettings && (
        <SectionSettingsModal
          section={section}
          onSave={data => onUpdateSection(data)}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}

// ── Section list view ─────────────────────────────────────────────────────────

function SectionListView({ sections, onEdit, onDelete, onDuplicate, onAdd, onDragStart, onDragMove, onDragEnd, dragRef, sectionEls }) {
  const drag = dragRef.current
  return (
    <div className={styles.sectionList}>
      {drag && drag.toIndex === 0 && <div className={styles.dropLine} />}
      {sections.map((section, idx) => {
        const isDragging = drag?.fromIndex === idx
        return (
          <div key={section._id} className={styles.sectionRow}>
            <div className={`${styles.sectionCard}${isDragging ? ' ' + styles.sectionDragging : ''}`}
              ref={el => { sectionEls.current[idx] = el }}>
              {/* Drag handle */}
              <div
                className={styles.dragHandle}
                style={{ touchAction: 'none', cursor: drag ? 'grabbing' : 'grab' }}
                onPointerDown={e => onDragStart(e, idx)}
                onPointerMove={onDragMove}
                onPointerUp={onDragEnd}
                onPointerCancel={onDragEnd}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <circle cx="9" cy="5" r="1.5"/><circle cx="15" cy="5" r="1.5"/>
                  <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                  <circle cx="9" cy="19" r="1.5"/><circle cx="15" cy="19" r="1.5"/>
                </svg>
              </div>
              {/* Info */}
              <div className={styles.sectionInfo}>
                <span className={styles.sectionLabel}>{section.data.label || 'Section'}</span>
                <span className={styles.sectionMeta}>
                  {(section.data.elements || []).length} element{(section.data.elements || []).length !== 1 ? 's' : ''}
                  {' · '}{section.data.columns || 3} col
                </span>
              </div>
              {/* Actions */}
              <div className={styles.sectionActions}>
                <button className={styles.editBtn} onClick={() => onEdit(idx)}>Edit</button>
                <button className={styles.dupBtn} onClick={() => onDuplicate(idx)} title="Duplicate">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </button>
                <button className={styles.delBtn} onClick={() => onDelete(idx)} title="Delete">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                </button>
              </div>
            </div>
            {drag && drag.toIndex === idx + 1 && drag.fromIndex !== idx && drag.fromIndex !== idx + 1 && (
              <div className={styles.dropLine} />
            )}
          </div>
        )
      })}
      {drag && drag.toIndex === sections.length && <div className={styles.dropLine} />}
      <div className={styles.addSectionRow}>
        <button className={styles.addSectionBtn} onClick={onAdd}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Add section
        </button>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SiteAdminLanding() {
  const [authenticated, setAuthenticated] = useState(null)
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveOk, setSaveOk] = useState(false)
  const [editingIdx, setEditingIdx] = useState(null) // null = list view
  const [, forceUpdate] = useReducer(x => x + 1, 0)

  const sectionEls = useRef([])
  const dragRef = useRef(null)

  useEffect(() => {
    fetch('/api/site-admin/me', { credentials: 'include' })
      .then(r => r.json()).then(d => setAuthenticated(d.authenticated)).catch(() => setAuthenticated(false))
  }, [])

  useEffect(() => {
    if (!authenticated) return
    fetch('/api/site-admin/pages/landing/blocks', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        setSections((d.blocks || []).map(b => ({ ...b, _id: b.id ? String(b.id) : crypto.randomUUID() })))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [authenticated])

  const handleSave = useCallback(async (secs) => {
    const toSave = secs ?? sections
    setSaving(true); setSaveOk(false)
    try {
      const res = await fetch('/api/site-admin/pages/landing/blocks', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: toSave.map(s => ({ type: s.type, data: s.data })) }),
      })
      if (res.ok) { setSaveOk(true); setTimeout(() => setSaveOk(false), 2500) }
    } finally { setSaving(false) }
  }, [sections])

  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') { e.preventDefault(); handleSave() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleSave])

  async function handleUpload(file) {
    const fd = new FormData(); fd.append('image', file)
    try {
      const res = await fetch('/api/site-admin/upload', { method: 'POST', credentials: 'include', body: fd })
      const data = await res.json()
      return data.url || null
    } catch { return null }
  }

  function updateSection(idx, data) {
    const next = sections.map((s, i) => i === idx ? { ...s, data } : s)
    setSections(next)
    handleSave(next)
  }

  function deleteSection(idx) {
    const next = sections.filter((_, i) => i !== idx)
    setSections(next); handleSave(next)
  }

  function duplicateSection(idx) {
    const copy = { ...sections[idx], _id: crypto.randomUUID(), id: undefined, data: { ...sections[idx].data } }
    const next = [...sections.slice(0, idx + 1), copy, ...sections.slice(idx + 1)]
    setSections(next); handleSave(next)
  }

  function addSection() {
    const s = newSection()
    const next = [...sections, s]
    setSections(next); handleSave(next)
    setEditingIdx(next.length - 1)
  }

  // Section list drag-and-drop
  function handleDragStart(e, index) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { fromIndex: index, toIndex: index }
    forceUpdate()
  }
  function handleDragMove(e) {
    if (!dragRef.current) return
    const y = e.clientY; let toIndex = sections.length
    for (let i = 0; i < sectionEls.current.length; i++) {
      const el = sectionEls.current[i]; if (!el) continue
      const rect = el.getBoundingClientRect()
      if (y < rect.top + rect.height / 2) { toIndex = i; break }
    }
    if (toIndex !== dragRef.current.toIndex) { dragRef.current = { ...dragRef.current, toIndex }; forceUpdate() }
  }
  function handleDragEnd() {
    if (!dragRef.current) return
    const { fromIndex, toIndex } = dragRef.current
    dragRef.current = null
    if (toIndex !== fromIndex) {
      const next = [...sections]
      const [moved] = next.splice(fromIndex, 1)
      next.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, moved)
      setSections(next); handleSave(next)
    } else { forceUpdate() }
  }

  if (authenticated === null) return null
  if (!authenticated) return <SiteAdminLogin onAuth={() => setAuthenticated(true)} />

  // Canvas view — editing a single section
  if (editingIdx !== null && sections[editingIdx]) {
    return (
      <SectionCanvas
        section={sections[editingIdx]}
        onUpdateSection={data => updateSection(editingIdx, data)}
        onBack={() => setEditingIdx(null)}
        onUpload={handleUpload}
      />
    )
  }

  // List view
  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <Link to="/admin" className={styles.backLink}>← Landing</Link>
        <span className={styles.topBarTitle}>Landing Page Editor</span>
        <div className={styles.topBarRight}>
          <a href="/" target="_blank" rel="noopener noreferrer" className={styles.previewLink}>Preview →</a>
          <button
            className={`${styles.saveBtn}${saving ? ' ' + styles.saveBtnSaving : ''}${saveOk ? ' ' + styles.saveBtnOk : ''}`}
            onClick={() => handleSave()} disabled={saving}
          >
            {saving ? 'Saving…' : saveOk ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </header>

      <main className={styles.body}>
        {loading ? (
          <div className={styles.loadingMsg}>Loading…</div>
        ) : (
          <SectionListView
            sections={sections}
            onEdit={idx => setEditingIdx(idx)}
            onDelete={deleteSection}
            onDuplicate={duplicateSection}
            onAdd={addSection}
            onDragStart={handleDragStart}
            onDragMove={handleDragMove}
            onDragEnd={handleDragEnd}
            dragRef={dragRef}
            sectionEls={sectionEls}
          />
        )}
      </main>
    </div>
  )
}
