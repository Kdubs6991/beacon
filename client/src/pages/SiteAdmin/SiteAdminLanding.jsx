import { useState, useEffect, useRef, useReducer, useCallback } from 'react'
import { Link } from 'react-router-dom'
import SiteAdminLogin from './SiteAdminLogin'
import styles from './SiteAdminLanding.module.css'

// ── Shared default people for mock display ────────────────────────────────────

const DEFAULT_MOCK_PEOPLE = [
  { name: 'Sarah M.', micLabel: 'Vox 1',   iemLabel: 'IEM 2', photoUrl: '' },
  { name: 'James K.', micLabel: 'Vox 2',   iemLabel: 'IEM 1', photoUrl: '' },
  { name: 'Drew A.',  micLabel: 'Keys DI', iemLabel: 'IEM 4', photoUrl: '' },
  { name: 'Lily R.',  micLabel: 'Vox 3',   iemLabel: 'IEM 3', photoUrl: '' },
]

// ── Theme color presets ───────────────────────────────────────────────────────

const THEME_BG_PRESETS = [
  { hex: '#09090f', label: 'Darkest' },
  { hex: '#0f0f1a', label: 'Dark navy' },
  { hex: '#141420', label: 'Dark' },
  { hex: '#0d1628', label: 'Blue tint' },
  { hex: '#0f1a12', label: 'Green tint' },
  { hex: '#1a0f1a', label: 'Purple tint' },
  { hex: '#1a100d', label: 'Warm' },
  { hex: '#1c1c1c', label: 'Charcoal' },
]

const THEME_ACCENT_PRESETS = [
  { hex: '#60a5fa', label: 'Blue' },
  { hex: '#3b82f6', label: 'Blue deep' },
  { hex: '#a78bfa', label: 'Purple' },
  { hex: '#34d399', label: 'Green' },
  { hex: '#f472b6', label: 'Pink' },
  { hex: '#fb923c', label: 'Orange' },
  { hex: '#fbbf24', label: 'Amber' },
  { hex: '#94a3b8', label: 'Slate' },
  { hex: '#f87171', label: 'Red' },
  { hex: '#e2e8f0', label: 'Light' },
]

const GRADIENT_PRESETS = [
  { label: 'Navy sweep',   css: 'linear-gradient(135deg, #09090f 0%, #0d1628 100%)' },
  { label: 'Purple shift', css: 'linear-gradient(135deg, #0f0f1a 0%, #1a0f2e 100%)' },
  { label: 'Subtle depth', css: 'linear-gradient(to bottom, #141420 0%, #09090f 100%)' },
  { label: 'Green tint',   css: 'linear-gradient(135deg, #09090f 0%, #0f1a12 100%)' },
  { label: 'Blue-purple',  css: 'linear-gradient(135deg, #0d1628 0%, #1a0f2e 100%)' },
  { label: 'Warm dark',    css: 'linear-gradient(135deg, #09090f 0%, #1a100d 100%)' },
]

const GRADIENT_DIRS = [
  { value: 'to right',  label: '→' },
  { value: 'to bottom', label: '↓' },
  { value: '135deg',    label: '↘' },
  { value: '45deg',     label: '↗' },
]

function isGradient(v) { return typeof v === 'string' && v.startsWith('linear-gradient(') }
function parseGradient(v) {
  const m = v?.match(/linear-gradient\(([^,]+),\s*(#[0-9a-fA-F]{3,8})[^,]*,\s*(#[0-9a-fA-F]{3,8})/)
  return { dir: m?.[1]?.trim() || '135deg', c1: m?.[2] || '#09090f', c2: m?.[3] || '#0d1628' }
}
function buildGradient(dir, c1, c2) { return `linear-gradient(${dir}, ${c1} 0%, ${c2} 100%)` }

// ── Element type definitions ──────────────────────────────────────────────────

const EL_TYPES = [
  { id: 'heading',      label: 'Heading',      color: '#60a5fa' },
  { id: 'text',         label: 'Text',         color: '#a78bfa' },
  { id: 'card',         label: 'Card',         color: '#f472b6' },
  { id: 'image',        label: 'Image',        color: '#34d399' },
  { id: 'button',       label: 'Button',       color: '#fb923c' },
  { id: 'badge',        label: 'Badge',        color: '#e879f9' },
  { id: 'spacer',       label: 'Spacer',       color: '#94a3b8' },
  { id: 'divider',      label: 'Divider',      color: '#94a3b8' },
  { id: 'mock_display', label: 'Mock Display', color: '#fbbf24' },
]

function newElement(type) {
  const defaults = {
    heading:      { level: 2, text: 'New heading', align: 'left', fullWidth: false },
    text:         { html: 'Add your text here.', align: 'left', fullWidth: false },
    image:        { url: '', alt: '', radius: 'md', maxWidth: 'full', fullWidth: false },
    button:       { label: 'Click here', href: '/', variant: 'primary', align: 'left', fullWidth: false },
    badge:        { text: 'Badge', color: '#60a5fa', align: 'left', fullWidth: false },
    spacer:       { height: 40, fullWidth: true },
    divider:      { fullWidth: true, color: '', thickness: 'md', span: 'full' },
    card:         { icon: '⚡', title: 'Card title', body: 'Describe this feature or item here.', badgeText: '', badgeColor: '#60a5fa', bgColor: '', accentColor: '', align: 'left', fullWidth: false },
    mock_display: { fullWidth: false, eventName: 'Sunday Service', size: 'lg', align: 'left', people: DEFAULT_MOCK_PEOPLE.map(p => ({ ...p })) },
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
        : <div className={styles.prevImageEmpty}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/></svg><span>No image — click Edit to add one</span></div>
    case 'button':
      return (
        <div style={{ display: 'flex', justifyContent: ({ left: 'flex-start', center: 'center', right: 'flex-end' })[el.data.align] || 'flex-start' }}>
          <div className={el.data.variant === 'secondary' ? styles.prevBtnSec : styles.prevBtnPri}>
            {el.data.label || 'Button'}
          </div>
        </div>
      )
    case 'badge':
      return (
        <div style={{ display: 'flex', justifyContent: ({ left: 'flex-start', center: 'center', right: 'flex-end' })[el.data.align] || 'flex-start' }}>
          <div className={styles.prevBadge} style={{ '--badge-color': el.data.color || '#60a5fa' }}>
            {el.data.text || 'Badge'}
          </div>
        </div>
      )
    case 'card': {
      return (
        <div className={styles.prevCard} style={{
          background: el.data.bgColor || 'rgba(255,255,255,0.04)',
          borderTopColor: el.data.accentColor || 'transparent',
          textAlign: el.data.align || 'left',
        }}>
          {el.data.icon && <div className={styles.prevCardIcon}>{el.data.icon}</div>}
          <div className={styles.prevCardTitle}>{el.data.title || 'Card title'}</div>
          {el.data.body && <div className={styles.prevCardBody}>{el.data.body}</div>}
          {el.data.badgeText && (
            <div className={styles.prevBadge} style={{ '--badge-color': el.data.badgeColor || '#60a5fa', display: 'inline-flex', marginTop: 4 }}>
              {el.data.badgeText}
            </div>
          )}
        </div>
      )
    }
    case 'spacer':
      return (
        <div className={styles.prevSpacer} style={{ height: Math.min(el.data.height || 40, 56) }}>
          <span>{el.data.height || 40}px</span>
        </div>
      )
    case 'divider': {
      const dt = { thin: '1px', md: '2px', thick: '4px' }[el.data.thickness || 'md'] || '2px'
      const dw = { full: '100%', half: '50%', quarter: '25%' }[el.data.span || 'full'] || '100%'
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 0' }}>
          <div style={{ width: dw, borderTop: `${dt} solid ${el.data.color || 'var(--border)'}` }} />
        </div>
      )
    }
    case 'mock_display': {
      const mockPeople = el.data.people || DEFAULT_MOCK_PEOPLE
      const mockEvent = el.data.eventName || 'Sunday Service'
      return (
        <div className={styles.prevMockWrap}>
          <div className={styles.prevMockHeader}>
            <span className={styles.prevMockBrand}>BEACON</span>
            <span className={styles.prevMockEvent}>{mockEvent}</span>
            <span className={styles.prevMockClock}>9:00 AM</span>
          </div>
          <div className={styles.prevMockGrid}>
            {mockPeople.slice(0, 4).map((p, i) => (
              <div key={i} className={styles.prevMockCard}>
                <div className={styles.prevMockPhoto}>
                  {p.photoUrl
                    ? <img src={p.photoUrl} alt={p.name} className={styles.prevMockPhotoImg} />
                    : <span className={styles.prevMockInitial}>{(p.name || '?')[0]}</span>
                  }
                </div>
                <div className={styles.prevMockName}>{p.name}</div>
                <div className={styles.prevMockLabels}>
                  {p.micLabel && <span className={styles.prevMockMic}>{p.micLabel}</span>}
                  {p.iemLabel && <span className={styles.prevMockIem}>{p.iemLabel}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    }
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

function ThemeSwatches({ presets, value, onChange }) {
  return (
    <div className={styles.themeSwatches}>
      {presets.map(p => (
        <button key={p.hex}
          className={`${styles.themeSwatch}${value === p.hex ? ' ' + styles.themeSwatchActive : ''}`}
          style={{ background: p.hex }}
          onClick={() => onChange(p.hex)}
          title={p.label}
        />
      ))}
    </div>
  )
}

function AccentColorField({ value, onChange }) {
  return (
    <div className={styles.accentColorField}>
      <ThemeSwatches presets={THEME_ACCENT_PRESETS} value={value} onChange={onChange} />
      <div className={styles.colorRow}>
        <input type="color" className={styles.colorSwatch}
          value={value || '#60a5fa'} onChange={e => onChange(e.target.value)} />
        <input className={styles.editInput} value={value || ''}
          onChange={e => onChange(e.target.value)} placeholder="#60a5fa" />
        {value && <button className={styles.clearBtn} onClick={() => onChange('')}>Default</button>}
      </div>
    </div>
  )
}

function BgColorField({ value, onChange }) {
  const gradMode = isGradient(value)
  const { dir, c1, c2 } = gradMode ? parseGradient(value) : { dir: '135deg', c1: '#09090f', c2: '#0d1628' }
  return (
    <div className={styles.bgColorField}>
      <div className={styles.bgTypeRow}>
        <button className={!gradMode ? styles.toggleActive : styles.toggleBtn}
          onClick={() => { if (gradMode) onChange('#0f0f1a') }}>Solid</button>
        <button className={gradMode ? styles.toggleActive : styles.toggleBtn}
          onClick={() => { if (!gradMode) onChange(buildGradient('135deg', '#09090f', '#0d1628')) }}>Gradient</button>
        {value && <button className={styles.clearBtn} onClick={() => onChange('')}>Clear</button>}
      </div>
      {gradMode ? (
        <>
          <div className={styles.gradPresets}>
            {GRADIENT_PRESETS.map(p => (
              <button key={p.label}
                className={`${styles.gradPreset}${value === p.css ? ' ' + styles.gradPresetActive : ''}`}
                style={{ background: p.css }} onClick={() => onChange(p.css)} title={p.label} />
            ))}
          </div>
          <div className={styles.editField}>
            <label className={styles.editLabel}>Direction</label>
            <div className={styles.toggleRow}>
              {GRADIENT_DIRS.map(d => (
                <button key={d.value}
                  className={dir === d.value ? styles.toggleActive : styles.toggleBtn}
                  onClick={() => onChange(buildGradient(d.value, c1, c2))}>{d.label}</button>
              ))}
            </div>
          </div>
          <div className={styles.gradColorPair}>
            <div className={styles.editField}>
              <label className={styles.editLabel}>Start</label>
              <input type="color" className={`${styles.colorSwatch} ${styles.gradColorSwatch}`}
                value={c1} onChange={e => onChange(buildGradient(dir, e.target.value, c2))} />
            </div>
            <div className={styles.gradArrow}>→</div>
            <div className={styles.editField}>
              <label className={styles.editLabel}>End</label>
              <input type="color" className={`${styles.colorSwatch} ${styles.gradColorSwatch}`}
                value={c2} onChange={e => onChange(buildGradient(dir, c1, e.target.value))} />
            </div>
          </div>
          <div className={styles.gradPreview} style={{ background: value }} />
        </>
      ) : (
        <>
          <ThemeSwatches presets={THEME_BG_PRESETS} value={value} onChange={onChange} />
          <div className={styles.colorRow}>
            <input type="color" className={styles.colorSwatch}
              value={value || '#000000'} onChange={e => onChange(e.target.value)} />
            <input className={styles.editInput} value={value || ''}
              onChange={e => onChange(e.target.value)} placeholder="Transparent (leave blank)" />
          </div>
        </>
      )}
    </div>
  )
}

// ── Image form (extracted to fix Rules of Hooks — can't use hooks inside switch) ──

function ImageEditForm({ el, onChange, onUpload }) {
  const u = (k, v) => onChange({ ...el.data, [k]: v })
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
      <div className={styles.editField}>
        <label className={styles.editLabel}>Corner radius</label>
        <div className={styles.toggleRow}>
          {[['none','None'], ['sm','S'], ['md','M'], ['lg','L'], ['full','Circle']].map(([v, l]) => (
            <button key={v} className={(el.data.radius || 'md') === v ? styles.toggleActive : styles.toggleBtn}
              onClick={() => u('radius', v)}>{l}</button>
          ))}
        </div>
      </div>
      <div className={styles.editField}>
        <label className={styles.editLabel}>Max width</label>
        <div className={styles.toggleRow}>
          {[['full','Full'], ['lg','Large'], ['md','Medium'], ['sm','Small']].map(([v, l]) => (
            <button key={v} className={(el.data.maxWidth || 'full') === v ? styles.toggleActive : styles.toggleBtn}
              onClick={() => u('maxWidth', v)}>{l}</button>
          ))}
        </div>
      </div>
      <FullWidthToggle value={el.data.fullWidth} onChange={v => u('fullWidth', v)} />
    </div>
  )
}

// ── Card form ────────────────────────────────────────────────────────────────

function CardEditForm({ el, onChange }) {
  const u = (k, v) => onChange({ ...el.data, [k]: v })
  return (
    <div className={styles.editFormFields}>
      <div className={styles.editField}>
        <label className={styles.editLabel}>Icon (emoji)</label>
        <input className={styles.editInput} value={el.data.icon || ''} onChange={e => u('icon', e.target.value)} placeholder="⚡ — leave blank to hide" />
      </div>
      <div className={styles.editField}>
        <label className={styles.editLabel}>Title</label>
        <input className={styles.editInput} value={el.data.title || ''} onChange={e => u('title', e.target.value)} placeholder="Card heading" />
      </div>
      <div className={styles.editField}>
        <label className={styles.editLabel}>Body text</label>
        <textarea className={styles.editTextarea} rows={3} value={el.data.body || ''} onChange={e => u('body', e.target.value)} placeholder="Description…" />
      </div>
      <div className={styles.editField}>
        <label className={styles.editLabel}>Badge label (optional)</label>
        <input className={styles.editInput} value={el.data.badgeText || ''} onChange={e => u('badgeText', e.target.value)} placeholder="Leave blank to hide" />
      </div>
      {el.data.badgeText && (
        <div className={styles.editField}>
          <label className={styles.editLabel}>Badge color</label>
          <AccentColorField value={el.data.badgeColor || ''} onChange={v => u('badgeColor', v)} />
        </div>
      )}
      <div className={styles.editField}>
        <label className={styles.editLabel}>Text alignment</label>
        <div className={styles.toggleRow}>
          {[['left','Left'], ['center','Center'], ['right','Right']].map(([v, l]) => (
            <button key={v} className={(el.data.align || 'left') === v ? styles.toggleActive : styles.toggleBtn}
              onClick={() => u('align', v)}>{l}</button>
          ))}
        </div>
      </div>
      <div className={styles.editField}>
        <label className={styles.editLabel}>Card background</label>
        <BgColorField value={el.data.bgColor || ''} onChange={v => u('bgColor', v)} />
      </div>
      <div className={styles.editField}>
        <label className={styles.editLabel}>Accent color (top border)</label>
        <AccentColorField value={el.data.accentColor || ''} onChange={v => u('accentColor', v)} />
      </div>
      <FullWidthToggle value={el.data.fullWidth} onChange={v => u('fullWidth', v)} />
    </div>
  )
}

// ── Delete confirm modal ──────────────────────────────────────────────────────

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.confirmBox} onClick={e => e.stopPropagation()}>
        <p className={styles.confirmMsg}>{message}</p>
        <div className={styles.confirmActions}>
          <button className={styles.confirmCancel} onClick={onCancel}>Cancel</button>
          <button className={styles.confirmDelete} onClick={() => { onConfirm(); onCancel() }}>Delete</button>
        </div>
      </div>
    </div>
  )
}

// ── Element edit forms (switch-based, hooks-free) ─────────────────────────────

function AlignField({ value, onChange }) {
  return (
    <div className={styles.editField}>
      <label className={styles.editLabel}>Alignment</label>
      <div className={styles.toggleRow}>
        {[['left','Left'], ['center','Center'], ['right','Right']].map(([v, l]) => (
          <button key={v} className={(value || 'left') === v ? styles.toggleActive : styles.toggleBtn}
            onClick={() => onChange(v)}>{l}</button>
        ))}
      </div>
    </div>
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
          <AlignField value={el.data.align} onChange={v => u('align', v)} />
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
          <AlignField value={el.data.align} onChange={v => u('align', v)} />
          <FullWidthToggle value={el.data.fullWidth} onChange={v => u('fullWidth', v)} />
        </div>
      )
    case 'image':
      return <ImageEditForm el={el} onChange={onChange} onUpload={onUpload} />
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
          <AlignField value={el.data.align} onChange={v => u('align', v)} />
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
            <AccentColorField value={el.data.color || ''} onChange={v => u('color', v)} />
          </div>
          <AlignField value={el.data.align} onChange={v => u('align', v)} />
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
      return (
        <div className={styles.editFormFields}>
          <div className={styles.editField}>
            <label className={styles.editLabel}>Color</label>
            <AccentColorField value={el.data.color || ''} onChange={v => u('color', v)} />
          </div>
          <div className={styles.editField}>
            <label className={styles.editLabel}>Thickness</label>
            <div className={styles.toggleRow}>
              {[['thin','Thin'], ['md','Medium'], ['thick','Thick']].map(([v, l]) => (
                <button key={v} className={(el.data.thickness || 'md') === v ? styles.toggleActive : styles.toggleBtn}
                  onClick={() => u('thickness', v)}>{l}</button>
              ))}
            </div>
          </div>
          <div className={styles.editField}>
            <label className={styles.editLabel}>Width</label>
            <div className={styles.toggleRow}>
              {[['full','Full'], ['half','Half'], ['quarter','Quarter']].map(([v, l]) => (
                <button key={v} className={(el.data.span || 'full') === v ? styles.toggleActive : styles.toggleBtn}
                  onClick={() => u('span', v)}>{l}</button>
              ))}
            </div>
          </div>
        </div>
      )
    case 'card':
      return <CardEditForm el={el} onChange={onChange} />
    case 'mock_display':
      return <MockDisplayEditForm data={el.data} onChange={onChange} onUpload={onUpload} />
    default:
      return null
  }
}

// ── Mock display sub-components ───────────────────────────────────────────────

function MockPersonEditor({ person, onChange, onRemove, onUpload }) {
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const u = (k, v) => onChange({ ...person, [k]: v })
  async function handleFile(e) {
    const file = e.target.files[0]; if (!file) return
    setUploading(true)
    const url = await onUpload(file)
    if (url) u('photoUrl', url)
    setUploading(false); e.target.value = ''
  }
  return (
    <div className={styles.mockPersonRow}>
      <div className={styles.mockPersonPhoto} onClick={() => fileRef.current?.click()} title="Upload photo">
        {person.photoUrl
          ? <img src={person.photoUrl} alt="" className={styles.mockPersonPhotoImg} />
          : <span className={styles.mockPersonInitial}>{(person.name || '?')[0]}</span>
        }
        <div className={styles.mockPersonPhotoBadge}>{uploading ? '…' : '↑'}</div>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
      </div>
      <div className={styles.mockPersonFields}>
        <input className={styles.editInput} value={person.name || ''} onChange={e => u('name', e.target.value)} placeholder="Name" />
        <input className={styles.editInput} value={person.micLabel || ''} onChange={e => u('micLabel', e.target.value)} placeholder="Mic" />
        <input className={styles.editInput} value={person.iemLabel || ''} onChange={e => u('iemLabel', e.target.value)} placeholder="IEM" />
      </div>
      <button className={styles.mockPersonRemove} onClick={onRemove} title="Remove">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
  )
}

function MockDisplayEditForm({ data, onChange, onUpload }) {
  const people = data.people || DEFAULT_MOCK_PEOPLE.map(p => ({ ...p }))
  function updatePerson(idx, updated) {
    onChange({ ...data, people: people.map((p, i) => i === idx ? updated : p) })
  }
  function removePerson(idx) {
    onChange({ ...data, people: people.filter((_, i) => i !== idx) })
  }
  function addPerson() {
    onChange({ ...data, people: [...people, { name: 'New Person', micLabel: '', iemLabel: '', photoUrl: '' }] })
  }
  return (
    <div className={styles.editFormFields}>
      <div className={styles.editField}>
        <label className={styles.editLabel}>Event name</label>
        <input className={styles.editInput} value={data.eventName || ''} onChange={e => onChange({ ...data, eventName: e.target.value })} placeholder="Sunday Service" />
      </div>
      <div className={styles.editField}>
        <label className={styles.editLabel}>Size</label>
        <div className={styles.toggleRow}>
          {[['sm','S'], ['md','M'], ['lg','L'], ['xl','XL']].map(([v, l]) => (
            <button key={v} className={(data.size || 'lg') === v ? styles.toggleActive : styles.toggleBtn}
              onClick={() => onChange({ ...data, size: v })}>{l}</button>
          ))}
        </div>
      </div>
      <div className={styles.editField}>
        <label className={styles.editLabel}>Alignment</label>
        <div className={styles.toggleRow}>
          {[['left','Left'], ['center','Center'], ['right','Right']].map(([v, l]) => (
            <button key={v} className={(data.align || 'left') === v ? styles.toggleActive : styles.toggleBtn}
              onClick={() => onChange({ ...data, align: v })}>{l}</button>
          ))}
        </div>
      </div>
      <div className={styles.editField}>
        <label className={styles.editLabel}>People</label>
        <div className={styles.mockPeopleList}>
          {people.map((p, i) => (
            <MockPersonEditor key={i} person={p} onChange={u => updatePerson(i, u)} onRemove={() => removePerson(i)} onUpload={onUpload} />
          ))}
          <button className={styles.mockAddPersonBtn} onClick={addPerson}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add person
          </button>
        </div>
      </div>
      <FullWidthToggle value={data.fullWidth} onChange={v => onChange({ ...data, fullWidth: v })} />
    </div>
  )
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
              <label className={styles.editLabel}>Background</label>
              <BgColorField value={draft.bgColor || ''} onChange={v => u('bgColor', v)} />
            </div>
            <div className={styles.editField}>
              <label className={styles.editLabel}>Top accent line</label>
              <AccentColorField value={draft.accentTop || ''} onChange={v => u('accentTop', v)} />
            </div>
            <div className={styles.editField}>
              <label className={styles.editLabel}>Section divider</label>
              <label className={styles.checkRow}>
                <input type="checkbox"
                  checked={!!(draft.bottomDivider?.enabled)}
                  onChange={e => u('bottomDivider', { ...(draft.bottomDivider || {}), enabled: e.target.checked })}
                />
                <span>Divider at section boundary</span>
              </label>
              {draft.bottomDivider?.enabled && (
                <div className={styles.sectionDividerFields}>
                  <div className={styles.editField}>
                    <label className={styles.editLabel}>Color</label>
                    <AccentColorField
                      value={draft.bottomDivider?.color || ''}
                      onChange={v => u('bottomDivider', { ...(draft.bottomDivider || {}), color: v })}
                    />
                  </div>
                  <div className={styles.editField}>
                    <label className={styles.editLabel}>Thickness</label>
                    <div className={styles.toggleRow}>
                      {[['thin','Thin'], ['md','Medium'], ['thick','Thick']].map(([v, l]) => (
                        <button key={v}
                          className={(draft.bottomDivider?.thickness || 'md') === v ? styles.toggleActive : styles.toggleBtn}
                          onClick={() => u('bottomDivider', { ...(draft.bottomDivider || {}), thickness: v })}
                        >{l}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
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
                  <div className={styles.elTypeChip} style={{ '--el-color': EL_TYPES.find(t => t.id === el.type)?.color || '#94a3b8' }}>
                    {EL_TYPES.find(t => t.id === el.type)?.label || el.type}
                  </div>
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
  const [confirmIdx, setConfirmIdx] = useState(null)
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
                <button className={styles.delBtn} onClick={() => setConfirmIdx(idx)} title="Delete">
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
      {confirmIdx !== null && (
        <ConfirmModal
          message={`Delete "${sections[confirmIdx]?.data?.label || 'Section'}"? This can't be undone.`}
          onConfirm={() => onDelete(confirmIdx)}
          onCancel={() => setConfirmIdx(null)}
        />
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function SiteAdminLanding({ slug = 'landing', pageTitle = 'Landing Page Editor', backPath = '/admin', previewPath = '/' }) {
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
    fetch(`/api/site-admin/pages/${slug}/blocks`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        setSections((d.blocks || []).map(b => ({ ...b, _id: b.id ? String(b.id) : crypto.randomUUID() })))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [authenticated, slug])

  const handleSave = useCallback(async (secs) => {
    const toSave = secs ?? sections
    setSaving(true); setSaveOk(false)
    try {
      const res = await fetch(`/api/site-admin/pages/${slug}/blocks`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: toSave.map(s => ({ type: s.type, data: s.data })) }),
      })
      if (res.ok) { setSaveOk(true); setTimeout(() => setSaveOk(false), 2500) }
    } finally { setSaving(false) }
  }, [sections, slug])

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
        <Link to={backPath} className={styles.backLink}>← Back</Link>
        <span className={styles.topBarTitle}>{pageTitle}</span>
        <div className={styles.topBarRight}>
          <a href={previewPath} target="_blank" rel="noopener noreferrer" className={styles.previewLink}>Preview →</a>
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
