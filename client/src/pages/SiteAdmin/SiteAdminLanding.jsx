import { useState, useEffect, useRef, useReducer, useCallback } from 'react'
import { Link } from 'react-router-dom'
import SiteAdminLogin from './SiteAdminLogin'
import styles from './SiteAdminLanding.module.css'

// ── Defaults ──────────────────────────────────────────────────────────────────

function newSection(type) {
  const defaults = {
    hero:         { badge: '', headline: '', subtext: '', primaryBtn: { label: '', href: '' }, secondaryBtn: { label: '', href: '' }, showMockDisplay: false, align: 'left' },
    feature_grid: { heading: '', subtext: '', columns: 3, cells: [{ heading: '', text: '', accentColor: '#60a5fa' }] },
    steps:        { heading: '', subtext: '', steps: [{ number: '01', title: '', text: '' }] },
    content_row:  { imagePosition: 'left', imageUrl: '', imageAlt: '', heading: '', text: '', btn: { label: '', href: '' }, bgColor: '' },
    cta_banner:   { heading: '', subtext: '', primaryBtn: { label: '', href: '' }, secondaryBtn: { label: '', href: '' }, bgColor: '', align: 'center' },
    custom_grid:  { columns: 3, cells: [{ imageUrl: '', imageAlt: '', heading: '', text: '', btnLabel: '', btnHref: '' }] },
    pricing:      { heading: '', subtext: '', tier: 'Free', amount: '$0', per: '/ forever', tagline: '', features: [''], primaryBtn: { label: 'Get started', href: '/org' } },
    profile:      { badge: '', heading: '', name: '', meta: '', photoUrl: '', photoFallback: '', bio: '', links: [], supportText: '', supportLinks: [] },
  }
  return { _id: crypto.randomUUID(), type, data: { ...(defaults[type] ?? {}) } }
}

const SECTION_TYPES = [
  { id: 'hero',         label: 'Hero',         color: '#60a5fa', desc: 'Full-width hero with headline, CTA buttons, optional mock display' },
  { id: 'feature_grid', label: 'Feature Grid',  color: '#c084fc', desc: 'Grid of feature cards with heading and text' },
  { id: 'steps',        label: 'Steps',         color: '#34d399', desc: 'Numbered how-it-works steps' },
  { id: 'content_row',  label: 'Content Row',   color: '#fb923c', desc: 'Image + text side-by-side with optional button' },
  { id: 'cta_banner',   label: 'CTA Banner',    color: '#f472b6', desc: 'Centered call-to-action with buttons' },
  { id: 'custom_grid',  label: 'Custom Grid',   color: '#38bdf8', desc: 'Flexible grid: image, heading, text, and button per cell' },
  { id: 'pricing',      label: 'Pricing',       color: '#fbbf24', desc: 'Pricing tier card with feature list' },
  { id: 'profile',      label: 'Profile',       color: '#94a3b8', desc: 'Developer / team member bio with social links' },
]

// ── Shared field helpers ───────────────────────────────────────────────────────

function Field({ label, children, hint }) {
  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>{label}{hint && <span className={styles.fieldHint}> — {hint}</span>}</label>
      {children}
    </div>
  )
}

function TextInput({ value, onChange, placeholder, mono }) {
  return (
    <input
      type="text"
      className={`${styles.textInput}${mono ? ' ' + styles.mono : ''}`}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  )
}

function TextArea({ value, onChange, placeholder, rows = 4 }) {
  return (
    <textarea
      className={styles.textArea}
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
    />
  )
}

function BtnFields({ label, data = {}, onChange }) {
  return (
    <Field label={label}>
      <div className={styles.inlineRow}>
        <TextInput value={data.label} onChange={v => onChange({ ...data, label: v })} placeholder="Button label" />
        <TextInput value={data.href}  onChange={v => onChange({ ...data, href: v })}  placeholder="/path or https://…" mono />
      </div>
    </Field>
  )
}

function AlignToggle({ value, onChange }) {
  return (
    <div className={styles.toggleRow}>
      {['left', 'center'].map(a => (
        <button key={a} className={value === a ? styles.toggleBtnActive : styles.toggleBtn}
          onClick={() => onChange(a)}>{a.charAt(0).toUpperCase() + a.slice(1)}</button>
      ))}
    </div>
  )
}

function ColorInput({ value, onChange }) {
  return (
    <div className={styles.colorRow}>
      <input type="color" className={styles.colorSwatch} value={value || '#60a5fa'}
        onChange={e => onChange(e.target.value)} />
      <TextInput value={value} onChange={onChange} placeholder="#60a5fa" mono />
    </div>
  )
}

// ── Image input with upload ────────────────────────────────────────────────────

function ImageInput({ label, value, onChange }) {
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const fd = new FormData()
      fd.append('image', file)
      const res = await fetch('/api/site-admin/upload', { method: 'POST', credentials: 'include', body: fd })
      const data = await res.json()
      if (data.url) onChange(data.url)
      else setError(data.error || 'Upload failed')
    } catch { setError('Upload failed') }
    setUploading(false)
    e.target.value = ''
  }

  return (
    <Field label={label || 'Image'}>
      <div className={styles.imageInputWrap}>
        {value && <img src={value} alt="" className={styles.imagePreview} />}
        <div className={styles.imageInputRow}>
          <TextInput value={value} onChange={onChange} placeholder="https://…" mono />
          <button type="button" className={styles.uploadBtn} onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
        </div>
        {error && <div className={styles.uploadError}>{error}</div>}
      </div>
    </Field>
  )
}

// ── Per-section editors ───────────────────────────────────────────────────────

function HeroEditor({ data, onChange }) {
  const u = (k, v) => onChange({ ...data, [k]: v })
  return (
    <div className={styles.sectionFields}>
      <div className={styles.fieldRow}>
        <Field label="Badge text"><TextInput value={data.badge} onChange={v => u('badge', v)} placeholder="Worship Team Display" /></Field>
        <Field label="Alignment"><AlignToggle value={data.align || 'left'} onChange={v => u('align', v)} /></Field>
      </div>
      <Field label="Headline" hint="use \n for line breaks">
        <TextArea value={data.headline} onChange={v => u('headline', v)} placeholder="The right mic,\non the right screen." rows={2} />
      </Field>
      <Field label="Subtext">
        <TextArea value={data.subtext} onChange={v => u('subtext', v)} placeholder="Describe what Beacon does…" rows={3} />
      </Field>
      <BtnFields label="Primary button" data={data.primaryBtn} onChange={v => u('primaryBtn', v)} />
      <BtnFields label="Secondary button" data={data.secondaryBtn} onChange={v => u('secondaryBtn', v)} />
      <Field label="Show animated mock display">
        <label className={styles.checkRow}>
          <input type="checkbox" checked={!!data.showMockDisplay} onChange={e => u('showMockDisplay', e.target.checked)} />
          <span>Display the Beacon UI mockup alongside the hero text</span>
        </label>
      </Field>
    </div>
  )
}

function FeatureGridEditor({ data, onChange }) {
  const u = (k, v) => onChange({ ...data, [k]: v })
  const cells = data.cells || []

  function updateCell(i, val) { const c = [...cells]; c[i] = val; u('cells', c) }
  function addCell()          { u('cells', [...cells, { heading: '', text: '', accentColor: '#60a5fa' }]) }
  function removeCell(i)      { u('cells', cells.filter((_, j) => j !== i)) }

  return (
    <div className={styles.sectionFields}>
      <div className={styles.fieldRow}>
        <Field label="Section heading"><TextInput value={data.heading} onChange={v => u('heading', v)} placeholder="Everything your team needs…" /></Field>
        <Field label="Columns">
          <select className={styles.selectInput} value={data.columns || 3} onChange={e => u('columns', Number(e.target.value))}>
            {[2, 3, 4].map(n => <option key={n} value={n}>{n} columns</option>)}
          </select>
        </Field>
      </div>
      <Field label="Subtext"><TextInput value={data.subtext} onChange={v => u('subtext', v)} placeholder="Short subtitle…" /></Field>
      <div className={styles.cellsLabel}>Feature cards</div>
      {cells.map((cell, i) => (
        <div key={i} className={styles.cellCard}>
          <div className={styles.cellCardHeader}>
            <span className={styles.cellIndex}>Card {i + 1}</span>
            {cells.length > 1 && <button className={styles.removeCellBtn} onClick={() => removeCell(i)}>✕ Remove</button>}
          </div>
          <div className={styles.fieldRow}>
            <Field label="Heading"><TextInput value={cell.heading} onChange={v => updateCell(i, { ...cell, heading: v })} placeholder="Feature name" /></Field>
            <Field label="Accent color"><ColorInput value={cell.accentColor} onChange={v => updateCell(i, { ...cell, accentColor: v })} /></Field>
          </div>
          <Field label="Description">
            <TextArea value={cell.text} onChange={v => updateCell(i, { ...cell, text: v })} placeholder="Feature description…" rows={2} />
          </Field>
        </div>
      ))}
      <button className={styles.addCellBtn} onClick={addCell}>+ Add card</button>
    </div>
  )
}

function StepsEditor({ data, onChange }) {
  const u = (k, v) => onChange({ ...data, [k]: v })
  const steps = data.steps || []

  function updateStep(i, val) { const s = [...steps]; s[i] = val; u('steps', s) }
  function addStep()          { u('steps', [...steps, { number: String(steps.length + 1).padStart(2, '0'), title: '', text: '' }]) }
  function removeStep(i)      { u('steps', steps.filter((_, j) => j !== i)) }

  return (
    <div className={styles.sectionFields}>
      <div className={styles.fieldRow}>
        <Field label="Section heading"><TextInput value={data.heading} onChange={v => u('heading', v)} placeholder="Up and running in minutes" /></Field>
        <Field label="Subtext"><TextInput value={data.subtext} onChange={v => u('subtext', v)} placeholder="Short subtitle…" /></Field>
      </div>
      <div className={styles.cellsLabel}>Steps</div>
      {steps.map((step, i) => (
        <div key={i} className={styles.cellCard}>
          <div className={styles.cellCardHeader}>
            <span className={styles.cellIndex}>Step {i + 1}</span>
            {steps.length > 1 && <button className={styles.removeCellBtn} onClick={() => removeStep(i)}>✕ Remove</button>}
          </div>
          <div className={styles.fieldRow}>
            <Field label="Number label"><TextInput value={step.number} onChange={v => updateStep(i, { ...step, number: v })} placeholder="01" /></Field>
            <Field label="Title"><TextInput value={step.title} onChange={v => updateStep(i, { ...step, title: v })} placeholder="Step name" /></Field>
          </div>
          <Field label="Description">
            <TextArea value={step.text} onChange={v => updateStep(i, { ...step, text: v })} placeholder="What happens in this step…" rows={2} />
          </Field>
        </div>
      ))}
      <button className={styles.addCellBtn} onClick={addStep}>+ Add step</button>
    </div>
  )
}

function ContentRowEditor({ data, onChange }) {
  const u = (k, v) => onChange({ ...data, [k]: v })
  return (
    <div className={styles.sectionFields}>
      <div className={styles.fieldRow}>
        <Field label="Image position">
          <div className={styles.toggleRow}>
            {['left', 'right'].map(p => (
              <button key={p} className={(data.imagePosition || 'left') === p ? styles.toggleBtnActive : styles.toggleBtn}
                onClick={() => u('imagePosition', p)}>{p.charAt(0).toUpperCase() + p.slice(1)}</button>
            ))}
          </div>
        </Field>
        <Field label="Background color (optional)"><ColorInput value={data.bgColor} onChange={v => u('bgColor', v)} /></Field>
      </div>
      <ImageInput label="Image" value={data.imageUrl} onChange={v => u('imageUrl', v)} />
      <Field label="Image alt text"><TextInput value={data.imageAlt} onChange={v => u('imageAlt', v)} placeholder="Describe the image…" /></Field>
      <Field label="Heading"><TextInput value={data.heading} onChange={v => u('heading', v)} placeholder="Section heading" /></Field>
      <Field label="Body text" hint="plain text, use blank lines for paragraphs">
        <TextArea value={data.text} onChange={v => u('text', v)} placeholder="Content…" rows={5} />
      </Field>
      <BtnFields label="Button (optional)" data={data.btn} onChange={v => u('btn', v)} />
    </div>
  )
}

function CtaBannerEditor({ data, onChange }) {
  const u = (k, v) => onChange({ ...data, [k]: v })
  return (
    <div className={styles.sectionFields}>
      <div className={styles.fieldRow}>
        <Field label="Alignment"><AlignToggle value={data.align || 'center'} onChange={v => u('align', v)} /></Field>
        <Field label="Background color (optional)"><ColorInput value={data.bgColor} onChange={v => u('bgColor', v)} /></Field>
      </div>
      <Field label="Heading"><TextInput value={data.heading} onChange={v => u('heading', v)} placeholder="Ready to get started?" /></Field>
      <Field label="Subtext"><TextArea value={data.subtext} onChange={v => u('subtext', v)} placeholder="Supporting text…" rows={2} /></Field>
      <BtnFields label="Primary button"   data={data.primaryBtn}   onChange={v => u('primaryBtn', v)} />
      <BtnFields label="Secondary button" data={data.secondaryBtn} onChange={v => u('secondaryBtn', v)} />
    </div>
  )
}

function CustomGridEditor({ data, onChange }) {
  const u = (k, v) => onChange({ ...data, [k]: v })
  const cells = data.cells || []

  function updateCell(i, val) { const c = [...cells]; c[i] = val; u('cells', c) }
  function addCell()          { u('cells', [...cells, { imageUrl: '', imageAlt: '', heading: '', text: '', btnLabel: '', btnHref: '' }]) }
  function removeCell(i)      { u('cells', cells.filter((_, j) => j !== i)) }

  return (
    <div className={styles.sectionFields}>
      <Field label="Columns">
        <select className={styles.selectInput} value={data.columns || 3} onChange={e => u('columns', Number(e.target.value))}>
          {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} column{n > 1 ? 's' : ''}</option>)}
        </select>
      </Field>
      <div className={styles.cellsLabel}>Grid cells</div>
      {cells.map((cell, i) => (
        <div key={i} className={styles.cellCard}>
          <div className={styles.cellCardHeader}>
            <span className={styles.cellIndex}>Cell {i + 1}</span>
            {cells.length > 1 && <button className={styles.removeCellBtn} onClick={() => removeCell(i)}>✕ Remove</button>}
          </div>
          <ImageInput label="Image (optional)" value={cell.imageUrl} onChange={v => updateCell(i, { ...cell, imageUrl: v })} />
          <Field label="Image alt text"><TextInput value={cell.imageAlt} onChange={v => updateCell(i, { ...cell, imageAlt: v })} placeholder="Describe image…" /></Field>
          <Field label="Heading (optional)"><TextInput value={cell.heading} onChange={v => updateCell(i, { ...cell, heading: v })} placeholder="Card title" /></Field>
          <Field label="Text (optional)">
            <TextArea value={cell.text} onChange={v => updateCell(i, { ...cell, text: v })} placeholder="Card body text…" rows={2} />
          </Field>
          <div className={styles.inlineRow}>
            <Field label="Button label"><TextInput value={cell.btnLabel} onChange={v => updateCell(i, { ...cell, btnLabel: v })} placeholder="Learn more" /></Field>
            <Field label="Button href"><TextInput value={cell.btnHref} onChange={v => updateCell(i, { ...cell, btnHref: v })} placeholder="/path" mono /></Field>
          </div>
        </div>
      ))}
      <button className={styles.addCellBtn} onClick={addCell}>+ Add cell</button>
    </div>
  )
}

function PricingEditor({ data, onChange }) {
  const u = (k, v) => onChange({ ...data, [k]: v })
  const features = data.features || []

  function updateFeature(i, val) { const f = [...features]; f[i] = val; u('features', f) }
  function addFeature()          { u('features', [...features, '']) }
  function removeFeature(i)      { u('features', features.filter((_, j) => j !== i)) }

  return (
    <div className={styles.sectionFields}>
      <div className={styles.fieldRow}>
        <Field label="Section heading"><TextInput value={data.heading} onChange={v => u('heading', v)} placeholder="Simple, transparent pricing" /></Field>
        <Field label="Subtext"><TextInput value={data.subtext} onChange={v => u('subtext', v)} placeholder="…" /></Field>
      </div>
      <div className={styles.fieldRow}>
        <Field label="Tier name"><TextInput value={data.tier}   onChange={v => u('tier', v)}   placeholder="Free" /></Field>
        <Field label="Price"><TextInput     value={data.amount} onChange={v => u('amount', v)} placeholder="$0" /></Field>
        <Field label="Per"><TextInput       value={data.per}    onChange={v => u('per', v)}    placeholder="/ forever" /></Field>
      </div>
      <Field label="Tagline">
        <TextArea value={data.tagline} onChange={v => u('tagline', v)} placeholder="No catch. No credit card…" rows={2} />
      </Field>
      <div className={styles.cellsLabel}>Feature list</div>
      {features.map((f, i) => (
        <div key={i} className={styles.listItemRow}>
          <TextInput value={f} onChange={v => updateFeature(i, v)} placeholder="Feature…" />
          {features.length > 1 && <button className={styles.removeCellBtn} onClick={() => removeFeature(i)}>✕</button>}
        </div>
      ))}
      <button className={styles.addCellBtn} onClick={addFeature}>+ Add feature</button>
      <BtnFields label="CTA button" data={data.primaryBtn} onChange={v => u('primaryBtn', v)} />
    </div>
  )
}

function ProfileEditor({ data, onChange }) {
  const u = (k, v) => onChange({ ...data, [k]: v })
  const links = data.links || []
  const supportLinks = data.supportLinks || []

  function updateLink(i, val) { const l = [...links]; l[i] = val; u('links', l) }
  function addLink()          { u('links', [...links, { type: 'github', label: '', href: '' }]) }
  function removeLink(i)      { u('links', links.filter((_, j) => j !== i)) }

  function updateSupport(i, val) { const s = [...supportLinks]; s[i] = val; u('supportLinks', s) }
  function addSupport()          { u('supportLinks', [...supportLinks, { label: '', href: '', color: '#60a5fa' }]) }
  function removeSupport(i)      { u('supportLinks', supportLinks.filter((_, j) => j !== i)) }

  return (
    <div className={styles.sectionFields}>
      <div className={styles.fieldRow}>
        <Field label="Badge text"><TextInput value={data.badge}   onChange={v => u('badge', v)}   placeholder="Developer" /></Field>
        <Field label="Heading"><TextInput    value={data.heading} onChange={v => u('heading', v)} placeholder="Meet the Developer" /></Field>
      </div>
      <div className={styles.fieldRow}>
        <Field label="Name"><TextInput         value={data.name}          onChange={v => u('name', v)}          placeholder="Kaleb Wrigley" /></Field>
        <Field label="Photo fallback initials"><TextInput value={data.photoFallback} onChange={v => u('photoFallback', v)} placeholder="KW" /></Field>
      </div>
      <Field label="Meta (one line, use · as separator)">
        <TextInput value={data.meta} onChange={v => u('meta', v)} placeholder="Role · University · City" />
      </Field>
      <ImageInput label="Photo" value={data.photoUrl} onChange={v => u('photoUrl', v)} />
      <Field label="Bio">
        <TextArea value={data.bio} onChange={v => u('bio', v)} placeholder="Bio text…" rows={4} />
      </Field>

      <div className={styles.cellsLabel}>Social / contact links</div>
      {links.map((link, i) => (
        <div key={i} className={styles.cellCard}>
          <div className={styles.cellCardHeader}>
            <span className={styles.cellIndex}>Link {i + 1}</span>
            <button className={styles.removeCellBtn} onClick={() => removeLink(i)}>✕ Remove</button>
          </div>
          <div className={styles.fieldRow}>
            <Field label="Type">
              <select className={styles.selectInput} value={link.type || 'github'} onChange={e => updateLink(i, { ...link, type: e.target.value })}>
                {['github', 'linkedin', 'twitter', 'email', 'website'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Label"><TextInput value={link.label} onChange={v => updateLink(i, { ...link, label: v })} placeholder="GitHub" /></Field>
            <Field label="URL"><TextInput   value={link.href}  onChange={v => updateLink(i, { ...link, href: v })}  placeholder="https://…" mono /></Field>
          </div>
        </div>
      ))}
      <button className={styles.addCellBtn} onClick={addLink}>+ Add link</button>

      <Field label="Support / donate text">
        <TextArea value={data.supportText} onChange={v => u('supportText', v)} placeholder="Donation message…" rows={3} />
      </Field>
      <div className={styles.cellsLabel}>Donation links</div>
      {supportLinks.map((sl, i) => (
        <div key={i} className={styles.cellCard}>
          <div className={styles.cellCardHeader}>
            <span className={styles.cellIndex}>Donation link {i + 1}</span>
            <button className={styles.removeCellBtn} onClick={() => removeSupport(i)}>✕ Remove</button>
          </div>
          <div className={styles.fieldRow}>
            <Field label="Label"><TextInput value={sl.label} onChange={v => updateSupport(i, { ...sl, label: v })} placeholder="Venmo" /></Field>
            <Field label="URL"><TextInput   value={sl.href}  onChange={v => updateSupport(i, { ...sl, href: v })}  placeholder="https://…" mono /></Field>
            <Field label="Accent color"><ColorInput value={sl.color} onChange={v => updateSupport(i, { ...sl, color: v })} /></Field>
          </div>
        </div>
      ))}
      <button className={styles.addCellBtn} onClick={addSupport}>+ Add donation link</button>
    </div>
  )
}

function SectionEditor({ section, onChange }) {
  switch (section.type) {
    case 'hero':         return <HeroEditor         data={section.data} onChange={onChange} />
    case 'feature_grid': return <FeatureGridEditor   data={section.data} onChange={onChange} />
    case 'steps':        return <StepsEditor         data={section.data} onChange={onChange} />
    case 'content_row':  return <ContentRowEditor    data={section.data} onChange={onChange} />
    case 'cta_banner':   return <CtaBannerEditor     data={section.data} onChange={onChange} />
    case 'custom_grid':  return <CustomGridEditor    data={section.data} onChange={onChange} />
    case 'pricing':      return <PricingEditor       data={section.data} onChange={onChange} />
    case 'profile':      return <ProfileEditor       data={section.data} onChange={onChange} />
    default: return <div className={styles.unknownSection}>Unknown section type: {section.type}</div>
  }
}

// ── Add section menu ───────────────────────────────────────────────────────────

function AddSectionMenu({ onSelect, onClose }) {
  return (
    <div className={styles.menuOverlay} onClick={onClose}>
      <div className={styles.menuBox} onClick={e => e.stopPropagation()}>
        <div className={styles.menuTitle}>Add section</div>
        <div className={styles.menuGrid}>
          {SECTION_TYPES.map(t => (
            <button key={t.id} className={styles.menuBtn} onClick={() => onSelect(t.id)}
              style={{ '--type-color': t.color }}>
              <div className={styles.menuBtnDot} />
              <div>
                <div className={styles.menuBtnLabel}>{t.label}</div>
                <div className={styles.menuBtnDesc}>{t.desc}</div>
              </div>
            </button>
          ))}
        </div>
        <button className={styles.menuCancel} onClick={onClose}>Cancel</button>
      </div>
    </div>
  )
}

// ── Main editor ───────────────────────────────────────────────────────────────

export default function SiteAdminLanding() {
  const [authenticated, setAuthenticated] = useState(null)
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveOk, setSaveOk] = useState(false)
  const [addMenuIndex, setAddMenuIndex] = useState(null)
  const [collapsed, setCollapsed] = useState({})
  const [, forceUpdate] = useReducer(x => x + 1, 0)

  const sectionEls = useRef([])
  const dragRef = useRef(null)

  useEffect(() => {
    fetch('/api/site-admin/me', { credentials: 'include' })
      .then(r => r.json())
      .then(d => setAuthenticated(d.authenticated))
      .catch(() => setAuthenticated(false))
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

  const handleSave = useCallback(async () => {
    setSaving(true); setSaveOk(false)
    try {
      const res = await fetch('/api/site-admin/pages/landing/blocks', {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: sections.map(s => ({ type: s.type, data: s.data })) }),
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

  function updateSection(index, newData) {
    setSections(prev => prev.map((s, i) => i === index ? { ...s, data: newData } : s))
  }
  function deleteSection(index) { setSections(prev => prev.filter((_, i) => i !== index)) }
  function duplicateSection(index) {
    const copy = { ...sections[index], _id: crypto.randomUUID(), id: undefined }
    setSections(prev => [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)])
  }
  function insertSection(atIndex, type) {
    setSections(prev => [...prev.slice(0, atIndex), newSection(type), ...prev.slice(atIndex)])
    setAddMenuIndex(null)
  }
  function toggleCollapse(id) { setCollapsed(prev => ({ ...prev, [id]: !prev[id] })) }

  // Drag-and-drop (same pointer events pattern as docs editor)
  function handleDragStart(e, index) {
    e.currentTarget.setPointerCapture(e.pointerId)
    dragRef.current = { fromIndex: index, toIndex: index }
    forceUpdate()
  }
  function handleDragMove(e) {
    if (!dragRef.current) return
    const y = e.clientY
    let toIndex = sections.length
    for (let i = 0; i < sectionEls.current.length; i++) {
      const el = sectionEls.current[i]
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
      setSections(prev => {
        const next = [...prev]
        const [moved] = next.splice(fromIndex, 1)
        next.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, moved)
        return next
      })
    } else { forceUpdate() }
  }

  if (authenticated === null) return null
  if (!authenticated) return <SiteAdminLogin onAuth={() => setAuthenticated(true)} />

  const drag = dragRef.current
  const typeMap = Object.fromEntries(SECTION_TYPES.map(t => [t.id, t]))

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <Link to="/admin" className={styles.backLink}>← Landing</Link>
        <span className={styles.topBarTitle}>Landing Page Editor</span>
        <div className={styles.topBarRight}>
          <a href="/" target="_blank" rel="noopener noreferrer" className={styles.previewLink}>Preview →</a>
          <button
            className={`${styles.saveBtn}${saving ? ' ' + styles.saveBtnSaving : ''}${saveOk ? ' ' + styles.saveBtnOk : ''}`}
            onClick={handleSave} disabled={saving}
          >
            {saving ? 'Saving…' : saveOk ? '✓ Saved' : 'Save'}
          </button>
        </div>
      </header>

      <main className={styles.body}>
        {loading ? (
          <div className={styles.loadingMsg}>Loading…</div>
        ) : (
          <div className={styles.sectionList}>
            {drag && drag.toIndex === 0 && <div className={styles.dropLine} />}

            {sections.map((section, index) => {
              const meta = typeMap[section.type]
              const isCollapsed = !!collapsed[section._id]
              return (
                <div
                  key={section._id}
                  className={styles.sectionRow}
                >
                  <div
                    ref={el => { sectionEls.current[index] = el }}
                    className={`${styles.sectionCard}${drag?.fromIndex === index ? ' ' + styles.sectionDragging : ''}`}
                  >
                    {/* Card header */}
                    <div className={styles.cardHeader}>
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
                      <button className={styles.cardHeaderMain} onClick={() => toggleCollapse(section._id)}>
                        <span className={styles.typeBadge} style={{ '--type-color': meta?.color || '#94a3b8' }}>
                          {meta?.label || section.type}
                        </span>
                        <span className={styles.sectionSummary}>
                          {section.data?.heading || section.data?.headline || section.data?.name || ''}
                        </span>
                        <span className={styles.collapseIcon}>{isCollapsed ? '▸' : '▾'}</span>
                      </button>
                      <div className={styles.cardActions}>
                        <button className={styles.actionBtn} onClick={() => duplicateSection(index)} title="Duplicate">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                          </svg>
                        </button>
                        <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => deleteSection(index)} title="Delete">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Editor body */}
                    {!isCollapsed && (
                      <div className={styles.cardBody}>
                        <SectionEditor section={section} onChange={data => updateSection(index, data)} />
                      </div>
                    )}
                  </div>

                  {drag && drag.toIndex === index + 1 && drag.fromIndex !== index && drag.fromIndex !== index + 1 && (
                    <div className={styles.dropLine} />
                  )}

                  {!drag && (
                    <div className={styles.addBetween} onClick={() => setAddMenuIndex(index + 1)}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    </div>
                  )}
                </div>
              )
            })}

            {drag && drag.toIndex === sections.length && <div className={styles.dropLine} />}

            {!drag && (
              <div className={styles.addBtnRow}>
                <button className={styles.addBtnRowBtn} onClick={() => setAddMenuIndex(sections.length)}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Add section
                </button>
              </div>
            )}

            {sections.length === 0 && !drag && (
              <div className={styles.emptyMsg}>No sections yet. Click "Add section" to start building the landing page.</div>
            )}
          </div>
        )}
      </main>

      {addMenuIndex !== null && (
        <AddSectionMenu onSelect={type => insertSection(addMenuIndex, type)} onClose={() => setAddMenuIndex(null)} />
      )}
    </div>
  )
}
