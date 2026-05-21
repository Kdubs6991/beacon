import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from './_Layout'
import Modal from '../../components/Modal'
import InfoPopover from '../../components/InfoPopover'
import styles from './Screens.module.css'

function api(path, opts = {}) {
  return fetch(`/api/admin${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  }).then(async r => {
    const data = await r.json()
    if (!r.ok) throw new Error(data.error || 'Request failed')
    return data
  })
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(() => {
    const el = document.createElement('textarea')
    el.value = text
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
  })
}


// ── Preset layout definitions ─────────────────────────────────────────────────
const PRESET_LAYOUTS = [
  {
    id: 'grid-standard',
    name: 'Standard Grid',
    desc: 'Balanced card grid, works for most team sizes.',
    preview: 'grid-standard',
  },
  {
    id: 'grid-compact',
    name: 'Compact Grid',
    desc: 'Smaller cards, fits more people on screen.',
    preview: 'grid-compact',
  },
  {
    id: 'cards-large',
    name: 'Large Cards',
    desc: 'Big photos, fewer cards per row.',
    preview: 'cards-large',
  },
  {
    id: 'list',
    name: 'List',
    desc: 'Horizontal rows with minimal chrome.',
    preview: 'list',
  },
]

const LAYOUT_LABELS = Object.fromEntries(PRESET_LAYOUTS.map(l => [l.id, l.name]))

// Mini visual previews — portrait column style
function LayoutPreview({ type }) {
  if (type === 'list') {
    return (
      <div className={styles.previewListRows}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.previewListItem}>
            <div className={styles.previewListAvatar} />
            <div className={styles.previewListBar} />
          </div>
        ))}
      </div>
    )
  }
  const count = type === 'grid-compact' ? 7 : type === 'cards-large' ? 3 : 5
  return (
    <div className={styles.previewPortraitRow}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.previewPortraitCard}>
          <div className={styles.previewPortraitPhoto} />
          <div className={styles.previewPortraitLabel} />
        </div>
      ))}
    </div>
  )
}

// ── Screen form modal ─────────────────────────────────────────────────────────
function ScreenModal({ initial, campuses, allScreens, templates, onSave, onClose }) {
  const [name,       setName]       = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [campusId,   setCampusId]   = useState(initial?.campus_id ?? '')
  const [mirrorId,   setMirrorId]   = useState(initial?.mirror_screen_id ?? '')
  const [layout,     setLayout]     = useState(initial?.layout ?? 'grid-standard')
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState(null)

  const mirrorCandidates = allScreens.filter(s =>
    s.id !== initial?.id &&
    (campusId ? s.campus_id === Number(campusId) : true) &&
    !s.mirror_screen_id
  )

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const body = {
        name: name.trim(),
        description: description.trim() || null,
        campus_id: campusId ? Number(campusId) : null,
        mirror_screen_id: mirrorId ? Number(mirrorId) : null,
        layout,
      }
      const method = initial ? 'PUT' : 'POST'
      const path   = initial ? `/screens/${initial.id}` : '/screens'
      const saved  = await api(path, { method, body: JSON.stringify(body) })
      onSave(saved)
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  return (
    <Modal
      title={initial ? 'Edit Screen' : 'New Screen'}
      onClose={onClose}
      footer={
        <>
          <button className={styles.btnGhost} onClick={onClose}>Cancel</button>
          <button className={styles.btnPrimary} onClick={submit} disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      {error && <p className={styles.formError}>{error}</p>}

      <div className={styles.formField}>
        <label className={styles.formLabel}>Screen name</label>
        <input className={styles.formInput} value={name} onChange={e => setName(e.target.value)} autoFocus placeholder="e.g. Main Stage, Lobby, Overflow" />
      </div>

      <div className={styles.formField}>
        <label className={styles.formLabel}>Description <span className={styles.optional}>(optional)</span></label>
        <input className={styles.formInput} value={description} onChange={e => setDescription(e.target.value)} placeholder="Where is this screen?" />
      </div>

      <div className={styles.formField}>
        <label className={styles.formLabel}>Location</label>
        <select className={styles.formSelect} value={campusId} onChange={e => { setCampusId(e.target.value); setMirrorId('') }}>
          <option value="">No location</option>
          {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className={styles.formField}>
        <label className={styles.formLabel}>Content source</label>
        <div className={styles.radioGroup}>
          <label className={styles.radioOpt}>
            <input type="radio" checked={!mirrorId} onChange={() => setMirrorId('')} />
            <div>
              <span className={styles.radioTitle}>Independent</span>
              <span className={styles.radioDesc}>This screen has its own assignments pushed to it.</span>
            </div>
          </label>
          <label className={`${styles.radioOpt} ${mirrorCandidates.length === 0 ? styles.radioDisabled : ''}`}>
            <input type="radio" checked={!!mirrorId} disabled={mirrorCandidates.length === 0}
              onChange={() => mirrorCandidates[0] && setMirrorId(mirrorCandidates[0].id)} />
            <div>
              <span className={styles.radioTitle}>Mirror another screen</span>
              <span className={styles.radioDesc}>Shows the same assignments as a different screen at this location.</span>
            </div>
          </label>
        </div>
        {mirrorId !== '' && (
          <select className={styles.formSelect} style={{ marginTop: 8 }} value={mirrorId} onChange={e => setMirrorId(e.target.value)}>
            <option value="">Select screen to mirror…</option>
            {mirrorCandidates.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>

      {/* ── Layout picker ── */}
      <div className={styles.formField}>
        <label className={styles.formLabel}>Layout</label>

        <p className={styles.layoutSectionHead}>Presets</p>
        <div className={styles.layoutGrid}>
          {PRESET_LAYOUTS.map(l => (
            <button
              key={l.id}
              type="button"
              className={`${styles.layoutOption} ${layout === l.id ? styles.layoutOptionActive : ''}`}
              onClick={() => setLayout(l.id)}
            >
              <div className={styles.layoutPreviewBox}>
                <LayoutPreview type={l.preview} />
              </div>
              <span className={styles.layoutName}>{l.name}</span>
              <span className={styles.layoutDesc}>{l.desc}</span>
            </button>
          ))}
        </div>

        {templates.length > 0 && (
          <>
            <p className={styles.layoutSectionHead} style={{ marginTop: 16 }}>Custom Templates</p>
            <div className={styles.layoutGrid}>
              {templates.map(t => (
                <button
                  key={`template:${t.id}`}
                  type="button"
                  className={`${styles.layoutOption} ${layout === `template:${t.id}` ? styles.layoutOptionActive : ''}`}
                  onClick={() => setLayout(`template:${t.id}`)}
                >
                  <div className={styles.layoutPreviewBox}>
                    <div className={styles.templatePreviewIcon}>T</div>
                  </div>
                  <span className={styles.layoutName}>{t.name}</span>
                  {t.description && <span className={styles.layoutDesc}>{t.description}</span>}
                </button>
              ))}
            </div>
          </>
        )}

        {templates.length === 0 && (
          <p className={styles.formHint}>
            No custom templates yet.{' '}
            <Link to="/admin/templates" className={styles.hintLink} onClick={onClose}>Create one on the Templates page.</Link>
          </p>
        )}
      </div>
    </Modal>
  )
}

// ── Screen card ───────────────────────────────────────────────────────────────
function ScreenCard({ screen, onEdit, onDelete }) {
  const [copied, setCopied] = useState(null)
  const displayUrl = `${window.location.origin}/display/${screen.token}`

  function copy(text, key) {
    copyToClipboard(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1800)
  }

  const layoutLabel = screen.layout?.startsWith('template:')
    ? 'Custom Template'
    : LAYOUT_LABELS[screen.layout] ?? 'Standard Grid'

  return (
    <div className={styles.card}>
      <div className={styles.cardTop}>
        <div className={styles.cardMeta}>
          <span className={styles.cardName}>{screen.name}</span>
          {screen.description && <span className={styles.cardDesc}>{screen.description}</span>}
        </div>
        <div className={styles.cardMenuBtns}>
          <button className={styles.menuBtn} onClick={() => onEdit(screen)}>Edit</button>
          <button className={`${styles.menuBtn} ${styles.menuDanger}`} onClick={() => onDelete(screen.id)}>Delete</button>
        </div>
      </div>

      <div className={styles.cardBadges}>
        {screen.mirror_screen_name ? (
          <div className={styles.mirrorBadge}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3M12 3v18"/>
            </svg>
            Mirrors: {screen.mirror_screen_name}
          </div>
        ) : (
          <div className={styles.independentBadge}>Independent</div>
        )}
        <div className={styles.layoutBadge}>{layoutLabel}</div>
      </div>

      <div className={styles.cardLinks}>
        <button className={`${styles.linkBtn} ${copied === 'url' ? styles.linkBtnCopied : ''}`}
          onClick={() => copy(displayUrl, 'url')} title={displayUrl}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
          </svg>
          {copied === 'url' ? 'Copied!' : 'Copy URL'}
        </button>

        <button className={`${styles.shareCodeBtn} ${copied === 'code' ? styles.linkBtnCopied : ''}`}
          onClick={() => copy(screen.share_code, 'code')}>
          {copied === 'code' ? '✓ Copied' : screen.share_code}
        </button>
      </div>

      <a href={displayUrl} target="_blank" rel="noreferrer" className={styles.openLink}>
        Open display →
      </a>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Screens() {
  const [screens,       setScreens]       = useState([])
  const [campuses,      setCampuses]      = useState([])
  const [templates,     setTemplates]     = useState([])
  const [loading,       setLoading]       = useState(true)
  const [modal,         setModal]         = useState(null)
  const [filterCampus,  setFilterCampus]  = useState('all')
  const [filterType,    setFilterType]    = useState('all')

  useEffect(() => {
    Promise.all([
      api('/screens'),
      api('/campuses'),
      api('/templates'),
    ]).then(([screenList, campusList, templateList]) => {
      setScreens(screenList)
      setCampuses(campusList)
      setTemplates(templateList)
    }).finally(() => setLoading(false))
  }, [])

  async function deleteScreen(id) {
    if (!confirm('Delete this screen? The display URL will stop working.')) return
    await api(`/screens/${id}`, { method: 'DELETE' })
    setScreens(prev => prev.filter(s => s.id !== id))
  }

  function onScreenSaved(screen) {
    setScreens(prev => {
      const idx = prev.findIndex(s => s.id === screen.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = screen; return next }
      return [...prev, screen]
    })
    setModal(null)
  }

  // Group by campus
  const groups = []
  const byCampus = {}
  screens.forEach(s => {
    const key = s.campus_id ?? '__none__'
    if (!byCampus[key]) byCampus[key] = []
    byCampus[key].push(s)
  })
  campuses.forEach(c => {
    if (byCampus[c.id]?.length) groups.push({ label: c.name, campusKey: String(c.id), screens: byCampus[c.id] })
  })
  if (byCampus['__none__']?.length) {
    groups.push({ label: 'No Location', campusKey: '__none__', screens: byCampus['__none__'] })
  }

  const filteredGroups = groups
    .filter(g => filterCampus === 'all' || g.campusKey === filterCampus)
    .map(g => ({
      ...g,
      screens: g.screens.filter(s =>
        filterType === 'all' ||
        (filterType === 'independent' && !s.mirror_screen_id) ||
        (filterType === 'mirror' && !!s.mirror_screen_id)
      ),
    }))
    .filter(g => g.screens.length > 0)

  return (
    <AdminLayout title="Screens">
      <div className={styles.topBar}>
        <InfoPopover title="Screens" docsHref="/docs#screens">
          <p>Screens are permanent display URLs you point TVs and kiosks at. Each screen gets a unique URL that never changes.</p>
          <p>Use <strong>Mirror mode</strong> to show the same content on multiple screens. Use the <strong>share code</strong> to let team members push assignments without admin access.</p>
        </InfoPopover>
        <button className={`${styles.btnPrimary} ${styles.newScreenBtn}`} onClick={() => setModal({ type: 'screen', data: null })}>
          + New Screen
        </button>
      </div>

      {!loading && screens.length > 0 && (
        <div className={styles.filterBar}>
          <div className={styles.filterHead}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
            Filters
          </div>
          <div className={styles.filterRow}>
            <span className={styles.filterLabel}>Location</span>
            <button className={`${styles.filterPill} ${filterCampus === 'all' ? styles.filterPillActive : ''}`} onClick={() => setFilterCampus('all')}>All</button>
            {campuses.map(c => (
              <button key={c.id} className={`${styles.filterPill} ${filterCampus === String(c.id) ? styles.filterPillActive : ''}`} onClick={() => setFilterCampus(String(c.id))}>{c.name}</button>
            ))}
            {byCampus['__none__']?.length > 0 && (
              <button className={`${styles.filterPill} ${filterCampus === '__none__' ? styles.filterPillActive : ''}`} onClick={() => setFilterCampus('__none__')}>No Location</button>
            )}
          </div>
          <div className={styles.filterRow}>
            <span className={styles.filterLabel}>Type</span>
            {[['all','All'],['independent','Independent'],['mirror','Mirror']].map(([val, label]) => (
              <button key={val} className={`${styles.filterPill} ${filterType === val ? styles.filterPillActive : ''}`} onClick={() => setFilterType(val)}>{label}</button>
            ))}
          </div>
        </div>
      )}

      {loading && <p className={styles.muted}>Loading…</p>}

      {!loading && screens.length === 0 && (
        <div className={styles.emptyState}>
          <p>No screens yet.</p>
          <p className={styles.muted}>Create a screen to get a permanent display URL for your TV or kiosk.</p>
        </div>
      )}

      {filteredGroups.map(group => (
        <div key={group.label} className={styles.group}>
          <p className={styles.groupLabel}>{group.label}</p>
          <div className={styles.grid}>
            {group.screens.map(screen => (
              <ScreenCard
                key={screen.id}
                screen={screen}
                onEdit={s => setModal({ type: 'screen', data: s })}
                onDelete={deleteScreen}
              />
            ))}
          </div>
        </div>
      ))}

      {modal?.type === 'screen' && (
        <ScreenModal
          initial={modal.data}
          campuses={campuses}
          allScreens={screens}
          templates={templates}
          onSave={onScreenSaved}
          onClose={() => setModal(null)}
        />
      )}
    </AdminLayout>
  )
}
