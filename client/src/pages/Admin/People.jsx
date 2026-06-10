import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import Cropper from 'react-easy-crop'
import AdminLayout from './_Layout'
import Modal from '../../components/Modal'
import InfoPopover from '../../components/InfoPopover'
import { useAuth } from '../../context/AuthContext'
import styles from './People.module.css'

function api(path, opts = {}) {
  return fetch(`/api/admin${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  }).then(async r => {
    const data = await r.json()
    if (r.status === 401) { window.location.href = '/login'; throw new Error('Session expired') }
    if (!r.ok) throw new Error(data.error || 'Request failed')
    return data
  })
}

const CATEGORIES = ['Worship', 'Pastor', 'Tech', 'Other']
const PORTRAIT_ASPECT = 3 / 4
const MAX_FILE_BYTES = 15 * 1024 * 1024

function parseCategories(val) {
  if (!val) return ['Other']
  if (typeof val === 'string' && val.startsWith('[')) {
    try { return JSON.parse(val) } catch { /* fall through */ }
  }
  return [val]
}

function eff(p) {
  const catRaw = p.category_override || p.category
  return {
    name:          p.name_override              || p.name,
    photo:         p.photo_override             || p.photo_url,
    photoPortrait: p.photo_override_portrait    || p.photo_url_portrait,
    email:         p.email_override             || p.email,
    categories:    parseCategories(catRaw),
    position:      p.position_override          || p.position,
  }
}

function initials(name) {
  return (name || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

// ── Canvas crop helpers ────────────────────────────────────────────────────────
function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

async function extractCrop(imageSrc, pixelCrop, outputW, outputH) {
  const img = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = outputW
  canvas.height = outputH
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height, 0, 0, outputW, outputH)
  return new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.92))
}

// ── PCO badge ─────────────────────────────────────────────────────────────────
function PcoBadge({ card }) {
  return <span className={card ? styles.pcoBadgeCard : styles.pcoBadgeInline}>PCO</span>
}

// ── Category badges ───────────────────────────────────────────────────────────
const CAT_CLASS = { Worship: styles.catWorship, Pastor: styles.catPastor, Tech: styles.catTech, Other: styles.catOther }

function CatBadges({ categories }) {
  return (
    <div className={styles.catBadgesWrap}>
      {(categories || []).map(c => (
        <span key={c} className={`${styles.badge} ${CAT_CLASS[c] || styles.catOther}`}>{c}</span>
      ))}
    </div>
  )
}

// ── Card photo (square, fills top of card) ────────────────────────────────────
function CardPhoto({ photo, name }) {
  const [err, setErr] = useState(false)
  useEffect(() => setErr(false), [photo])
  if (photo && !err) {
    return <img src={photo} alt="" className={styles.cardPhotoImg} onError={() => setErr(true)} />
  }
  return <div className={styles.cardPhotoInitials}>{initials(name)}</div>
}

// ── Small avatar (list view) ──────────────────────────────────────────────────
function Avatar({ photo, name }) {
  const [err, setErr] = useState(false)
  useEffect(() => setErr(false), [photo])
  if (photo && !err) {
    return <img src={photo} alt="" className={styles.avatar} onError={() => setErr(true)} />
  }
  return <div className={styles.avatarInitials}>{initials(name)}</div>
}

// ── Large avatar (detail modal) ───────────────────────────────────────────────
function AvatarLg({ photo, name }) {
  const [err, setErr] = useState(false)
  useEffect(() => setErr(false), [photo])
  if (photo && !err) {
    return <img src={photo} alt="" className={styles.avatarLg} onError={() => setErr(true)} />
  }
  return <div className={styles.avatarInitialsLg}>{initials(name)}</div>
}

// ── Dual-overlay crop modal ───────────────────────────────────────────────────
function PhotoCropModal({ onDone, onCancel }) {
  const [imageSrc, setImageSrc]      = useState(null)
  const [fileError, setFileError]    = useState(null)
  const [crop, setCrop]              = useState({ x: 0, y: 0 })
  const [zoom, setZoom]              = useState(1)
  const [portraitPx, setPortraitPx] = useState(null)
  const [cropBounds, setCropBounds]  = useState(null)
  const [uploading, setUploading]    = useState(false)
  const [uploadErr, setUploadErr]    = useState(null)
  const containerRef = useRef(null)

  const measureCropArea = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const { width, height } = el.getBoundingClientRect()
    const containerAspect = width / height
    let cropW, cropH
    if (containerAspect > PORTRAIT_ASPECT) {
      cropH = height; cropW = height * PORTRAIT_ASPECT
    } else {
      cropW = width; cropH = width / PORTRAIT_ASPECT
    }
    const cropLeft   = (width - cropW) / 2
    const cropTop    = (height - cropH) / 2
    const squareSize = cropW
    const squareTop  = cropTop + (cropH - squareSize) / 2
    setCropBounds({ cropLeft, cropTop, cropW, cropH, squareSize, squareTop })
  }, [])

  useEffect(() => {
    if (!imageSrc) return
    const t = setTimeout(measureCropArea, 50)
    window.addEventListener('resize', measureCropArea)
    return () => { clearTimeout(t); window.removeEventListener('resize', measureCropArea) }
  }, [imageSrc, measureCropArea])

  async function handleFile(file) {
    setFileError(null)
    if (!file) return
    if (!file.type.startsWith('image/')) { setFileError('Please select an image file.'); return }
    if (file.size > MAX_FILE_BYTES) { setFileError('Image must be 15 MB or smaller.'); return }
    setImageSrc(await readFileAsDataUrl(file))
    setCrop({ x: 0, y: 0 })
    setZoom(1)
  }

  async function handleSave() {
    if (!portraitPx) return
    setUploadErr(null)
    setUploading(true)
    try {
      const portraitBlob = await extractCrop(imageSrc, portraitPx, 600, 800)
      const squarePx = {
        x: portraitPx.x, y: portraitPx.y + portraitPx.width / 6,
        width: portraitPx.width, height: portraitPx.width,
      }
      const squareBlob = await extractCrop(imageSrc, squarePx, 600, 600)
      const form = new FormData()
      form.append('square',   squareBlob,   'photo-square.webp')
      form.append('portrait', portraitBlob, 'photo-portrait.webp')
      const res  = await fetch('/api/admin/photos/upload', { method: 'POST', credentials: 'include', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      onDone({ square: data.square, portrait: data.portrait })
    } catch (err) {
      setUploadErr(err.message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Modal
      title="Upload & Crop Photo"
      onClose={onCancel}
      footer={
        <>
          <button className={styles.btnGhost} onClick={onCancel}>Cancel</button>
          <button className={styles.btnPrimary} onClick={handleSave} disabled={!imageSrc || !portraitPx || uploading}>
            {uploading ? 'Uploading…' : 'Crop & Save'}
          </button>
        </>
      }
    >
      {uploadErr && <p className={styles.formError}>{uploadErr}</p>}

      {!imageSrc ? (
        <label className={styles.dropzone}>
          <input type="file" accept="image/*" className={styles.dropzoneInput} onChange={e => handleFile(e.target.files?.[0])} />
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9l4-4 4 4M7 5v14"/><circle cx="17" cy="8" r="2"/><path d="M21 15l-5-5-4 4"/>
          </svg>
          <span className={styles.dropzoneText}>Click or drag to select a photo</span>
          <span className={styles.dropzoneHint}>JPEG, PNG, WebP · max 15 MB</span>
          {fileError && <span className={styles.dropzoneErr}>{fileError}</span>}
        </label>
      ) : (
        <>
          <div className={styles.cropLegend}>
            <span className={styles.cropLegendPortrait}>&#9646; Portrait (display screen)</span>
            <span className={styles.cropLegendSquare}>&#9636; Square (people grid)</span>
          </div>
          <div className={styles.cropContainer} ref={containerRef}>
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={PORTRAIT_ASPECT}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, px) => setPortraitPx(px)}
              style={{
                containerStyle: { borderRadius: 6 },
                cropAreaStyle: { border: '2px solid rgba(255,255,255,0.85)', boxShadow: 'none' },
              }}
            />
            {cropBounds && (
              <div className={styles.cropOverlay} aria-hidden>
                <div
                  className={styles.squareIndicator}
                  style={{ left: cropBounds.cropLeft, top: cropBounds.squareTop, width: cropBounds.squareSize, height: cropBounds.squareSize }}
                />
              </div>
            )}
          </div>
          <div className={styles.zoomRow}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
            <input className={styles.zoomSlider} type="range" min={1} max={3} step={0.05} value={zoom} onChange={e => setZoom(Number(e.target.value))} />
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="11" y1="8" x2="11" y2="14"/>
            </svg>
          </div>
          <button className={styles.changePhotoBtn} onClick={() => { setImageSrc(null); setPortraitPx(null) }}>
            ← Choose a different photo
          </button>
        </>
      )}
    </Modal>
  )
}

// ── Person modal (add / edit) ─────────────────────────────────────────────────
function PersonModal({ initial, onSave, onClose }) {
  const isPco = !!initial?.pco_person_id
  const e = initial ? eff(initial) : {}

  const [name,       setName]       = useState(e.name     ?? '')
  const [email,      setEmail]      = useState(e.email    ?? '')
  const [position,   setPosition]   = useState(e.position ?? '')
  const [categories, setCategories] = useState(e.categories?.length ? e.categories : ['Worship'])
  const [photoUrl,      setPhotoUrl]      = useState(e.photo         ?? '')
  const [photoPortrait, setPhotoPortrait] = useState(e.photoPortrait ?? '')
  const [pcoId,    setPcoId]    = useState(initial?.pco_person_id ?? '')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState(null)
  const [showCrop, setShowCrop] = useState(false)
  const [positionTypes, setPositionTypes] = useState([])

  useEffect(() => {
    fetch('/api/admin/position-types', { credentials: 'include' })
      .then(r => r.json())
      .then(data => setPositionTypes(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  function toggleCategory(cat) {
    setCategories(prev =>
      prev.includes(cat)
        ? prev.length > 1 ? prev.filter(c => c !== cat) : prev
        : [...prev, cat]
    )
  }

  async function submit(ev) {
    ev.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const body = {
        name:               name.trim(),
        email:              email.trim()    || null,
        position:           position.trim() || null,
        category:           categories,
        photo_url:          photoUrl        || null,
        photo_url_portrait: photoPortrait   || null,
        pco_person_id:      pcoId.trim()   || null,
      }
      const method = initial ? 'PUT' : 'POST'
      const path   = initial ? `/people/${initial.id}` : '/people'
      const saved  = await api(path, { method, body: JSON.stringify(body) })
      onSave(saved)
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  if (showCrop) {
    return <PhotoCropModal onDone={({ square, portrait }) => { setPhotoUrl(square); setPhotoPortrait(portrait); setShowCrop(false) }} onCancel={() => setShowCrop(false)} />
  }

  return (
    <Modal
      title={initial ? 'Edit Person' : 'Add Person'}
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

      {isPco && (
        <div className={styles.pcoNote}>
          <PcoBadge />
          <span>Changes are saved locally for Beacon only and won't affect your Planning Center profile.</span>
        </div>
      )}

      <div className={styles.formField}>
        <label className={styles.formLabel}>Name <span className={styles.req}>*</span></label>
        <input className={styles.formInput} value={name} onChange={e => setName(e.target.value)} />
      </div>

      <div className={styles.formField}>
        <label className={styles.formLabel}>Position <span className={styles.opt}>(optional)</span></label>
        <select className={styles.formInput} value={position} onChange={e => setPosition(e.target.value)}>
          <option value="">— None —</option>
          {positionTypes.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
          {position && !positionTypes.some(p => p.name === position) && (
            <option value={position}>{position}</option>
          )}
        </select>
        <p className={styles.formHint}>Used by automation rules to auto-assign mics and IEMs. Manage positions in the Labels page.</p>
      </div>

      <div className={styles.formField}>
        <label className={styles.formLabel}>Categories</label>
        <div className={styles.categoryCheckboxes}>
          {CATEGORIES.map(c => (
            <label key={c} className={`${styles.catCheckbox} ${categories.includes(c) ? styles.catCheckboxActive : ''}`}>
              <input type="checkbox" className={styles.catCheckboxInput} checked={categories.includes(c)} onChange={() => toggleCategory(c)} />
              <span className={`${styles.badge} ${CAT_CLASS[c] || styles.catOther}`}>{c}</span>
            </label>
          ))}
        </div>
        <p className={styles.formHint}>Select one or more. At least one is required.</p>
      </div>

      <div className={styles.formField}>
        <label className={styles.formLabel}>Email <span className={styles.opt}>(optional)</span></label>
        <input className={styles.formInput} type="email" value={email} onChange={e => setEmail(e.target.value)} />
      </div>

      <div className={styles.formField}>
        <label className={styles.formLabel}>Photo</label>
        {photoUrl ? (
          <div className={styles.photoPreviewRow}>
            <div className={styles.photoPreviewWrap}>
              <div className={styles.photoPreviewItem}>
                <img src={photoUrl} alt="Square crop" className={styles.photoPreviewSq} />
                <span className={styles.photoPreviewCaption}>Square</span>
              </div>
              {photoPortrait && (
                <div className={styles.photoPreviewItem}>
                  <img src={photoPortrait} alt="Portrait crop" className={styles.photoPreviewPt} />
                  <span className={styles.photoPreviewCaption}>Portrait</span>
                </div>
              )}
            </div>
            <div className={styles.photoPreviewActions}>
              <button type="button" className={styles.btnGhost} onClick={() => setShowCrop(true)}>Change Photo</button>
              <button type="button" className={styles.btnDanger} onClick={() => { setPhotoUrl(''); setPhotoPortrait('') }}>Remove</button>
            </div>
          </div>
        ) : (
          <button type="button" className={styles.uploadBtn} onClick={() => setShowCrop(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Upload Photo
          </button>
        )}
        {isPco && !photoUrl && <p className={styles.formHint}>Leave blank to use the photo from Planning Center.</p>}
      </div>

      {!isPco && (
        <div className={styles.formField}>
          <label className={styles.formLabel}>PCO Person ID <span className={styles.opt}>(optional)</span></label>
          <input className={styles.formInput} value={pcoId} onChange={e => setPcoId(e.target.value)} placeholder="e.g. 12345678" />
        </div>
      )}
      {isPco && (
        <div className={styles.formField}>
          <label className={styles.formLabel}>PCO Person ID</label>
          <div className={styles.pcoIdReadonly}>{initial.pco_person_id}</div>
        </div>
      )}
    </Modal>
  )
}

// ── Person detail modal (grid click) ─────────────────────────────────────────
function PersonDetailModal({ person, onEdit, onDelete, onClose, isAdmin }) {
  const e = eff(person)
  const canDelete = isAdmin && !person.pco_person_id

  return (
    <Modal title={e.name} onClose={onClose}>
      <div className={styles.detailBody}>
        <div className={styles.detailPhoto}>
          <AvatarLg photo={e.photoPortrait || e.photo} name={e.name} />
          {person.pco_person_id && <PcoBadge />}
        </div>

        <div className={styles.detailInfo}>
          <CatBadges categories={e.categories} />

          {e.position && (
            <div className={styles.detailField}>
              <span className={styles.detailLabel}>Position</span>
              <span className={styles.detailValue}>{e.position}</span>
            </div>
          )}
          {e.email && (
            <div className={styles.detailField}>
              <span className={styles.detailLabel}>Email</span>
              <span className={styles.detailValue}>{e.email}</span>
            </div>
          )}
          {person.pco_person_id && (
            <div className={styles.detailField}>
              <span className={styles.detailLabel}>PCO ID</span>
              <span className={`${styles.detailValue} ${styles.pcoId}`}>{person.pco_person_id}</span>
            </div>
          )}
        </div>

        <div className={styles.detailActions}>
          <button className={styles.btnPrimary} onClick={() => { onClose(); onEdit(person) }}>Edit</button>
          {canDelete && (
            <button className={styles.btnDangerSolid} onClick={() => { onClose(); onDelete(person.id) }}>Delete</button>
          )}
        </div>
      </div>
    </Modal>
  )
}

// ── List view ─────────────────────────────────────────────────────────────────
function ListView({ people, onEdit, onDelete, isAdmin }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.th} style={{ width: 44 }} />
            <th className={styles.th}>Name</th>
            <th className={styles.th}>Position</th>
            <th className={styles.th}>Category</th>
            <th className={styles.th}>Email</th>
            <th className={styles.th} />
          </tr>
        </thead>
        <tbody>
          {people.map(p => {
            const e = eff(p)
            const canDelete = isAdmin && !p.pco_person_id
            return (
              <tr key={p.id} className={styles.row}>
                <td className={styles.avatarCell}>
                  <Avatar photo={e.photo} name={e.name} />
                </td>
                <td className={styles.nameCell}>
                  <div className={styles.nameLine}>
                    <span className={styles.name}>{e.name}</span>
                    {p.pco_person_id && <PcoBadge />}
                  </div>
                </td>
                <td className={styles.metaCell}>{e.position ?? <span className={styles.none}>—</span>}</td>
                <td className={styles.catCell}><CatBadges categories={e.categories} /></td>
                <td className={styles.metaCell}>{e.email ?? <span className={styles.none}>—</span>}</td>
                <td className={styles.actionsCell}>
                  <button className={styles.actionBtn} onClick={() => onEdit(p)}>Edit</button>
                  {canDelete && (
                    <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`} onClick={() => onDelete(p.id)}>Delete</button>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Grid card ─────────────────────────────────────────────────────────────────
function PersonCard({ person, onSelect }) {
  const e = eff(person)
  return (
    <div className={styles.card} onClick={() => onSelect(person)}>
      {person.pco_person_id && <PcoBadge card />}
      <div className={styles.cardPhoto}>
        <CardPhoto photo={e.photo} name={e.name} />
      </div>
      <div className={styles.cardInfo}>
        <div className={styles.cardName}>{e.name}</div>
        <CatBadges categories={e.categories} />
      </div>
    </div>
  )
}

// ── Grid view ─────────────────────────────────────────────────────────────────
function GridView({ people, onSelect }) {
  return (
    <div className={styles.grid}>
      {people.map(p => (
        <PersonCard key={p.id} person={p} onSelect={onSelect} />
      ))}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function People() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'

  const [people,       setPeople]       = useState([])
  const [loading,      setLoading]      = useState(true)
  const [loadError,    setLoadError]    = useState(null)
  const [search,       setSearch]       = useState('')
  const [viewMode,     setViewMode]     = useState(() => localStorage.getItem('beacon-people-view') || 'list')
  const [filterSource, setFilterSource] = useState('')         // '' | 'pco' | 'manual'
  const [filterCats,   setFilterCats]   = useState([])         // [] = all
  const [modal,        setModal]        = useState(null)
  const [pcoBanner,    setPcoBanner]    = useState(false)

  useEffect(() => {
    api('/people')
      .then(setPeople)
      .catch(err => setLoadError(err.message))
      .finally(() => setLoading(false))
  }, [])

  function switchView(mode) {
    setViewMode(mode)
    localStorage.setItem('beacon-people-view', mode)
  }

  function toggleFilterCat(cat) {
    setFilterCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat])
  }

  const hasActiveFilters = filterSource !== '' || filterCats.length > 0

  async function handlePcoSync() {
    try {
      const status = await fetch('/api/auth/pco/status', { credentials: 'include' }).then(r => r.json())
      if (!status.connected) { setPcoBanner(true); return }
      setPcoBanner(false)
    } catch { setPcoBanner(true) }
  }

  async function deletePerson(id) {
    if (!confirm('Remove this person?')) return
    await api(`/people/${id}`, { method: 'DELETE' })
    setPeople(prev => prev.filter(p => p.id !== id))
  }

  function onSaved(person) {
    const nameOf = p => p.name_override || p.name
    setPeople(prev => {
      const idx = prev.findIndex(p => p.id === person.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = person; return next }
      return [...prev, person].sort((a, b) => nameOf(a).localeCompare(nameOf(b)))
    })
    setModal(null)
  }

  const filtered = useMemo(() => {
    let result = people
    const q = search.toLowerCase().trim()
    if (q) {
      result = result.filter(p => {
        const e = eff(p)
        return e.name.toLowerCase().includes(q) ||
          (e.email || '').toLowerCase().includes(q) ||
          (e.position || '').toLowerCase().includes(q) ||
          (p.pco_person_id || '').includes(q)
      })
    }
    if (filterSource === 'pco')    result = result.filter(p =>  p.pco_person_id)
    if (filterSource === 'manual') result = result.filter(p => !p.pco_person_id)
    if (filterCats.length > 0) {
      result = result.filter(p => {
        const cats = parseCategories(p.category_override || p.category)
        return filterCats.some(fc => cats.includes(fc))
      })
    }
    return result
  }, [people, search, filterSource, filterCats])

  return (
    <AdminLayout title="People">
      {pcoBanner && (
        <div className={styles.pcoBanner}>
          <span>Planning Center is not connected. Go to <strong>Integrations</strong> to connect and sync your team automatically.</span>
          <button className={styles.pcoBannerClose} onClick={() => setPcoBanner(false)}>✕</button>
        </div>
      )}

      <div className={styles.topBar}>
        <InfoPopover title="People" docsHref="/docs#people">
          <p>People are the members of your worship team — musicians, singers, speakers, and anyone else who appears on your display screens. Each person gets a card showing their name, photo, and assigned mic/IEM labels.</p>
          <p>People can come from two sources: <strong>Planning Center</strong> (synced automatically when PCO is connected) or added <strong>manually</strong> for team members not in PCO. Any edits you make in Beacon — name, photo, category — are local overrides that won't be overwritten by future PCO syncs.</p>
          <p>A person's <strong>position</strong> (e.g. Singer, Electric Guitar) is what your automation rules match against to assign them the right mic and IEM each week. Make sure it's set and matches your rule conditions.</p>
        </InfoPopover>
        <div className={styles.toolbarBtns}>
          <button className={styles.btnGhost} onClick={handlePcoSync}>Sync from PCO</button>
          <button className={styles.btnPrimary} onClick={() => setModal({ type: 'edit', person: null })}>+ Add Person</button>
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            className={styles.search}
            type="search"
            placeholder="Search by name, position, email, or PCO ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.viewToggle}>
          <button className={`${styles.viewBtn} ${viewMode === 'list' ? styles.viewBtnActive : ''}`} onClick={() => switchView('list')} title="List view">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
              <line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
            </svg>
          </button>
          <button className={`${styles.viewBtn} ${viewMode === 'grid' ? styles.viewBtnActive : ''}`} onClick={() => switchView('grid')} title="Grid view">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Filter row */}
      <div className={styles.filterRow}>
        <div className={styles.filterHead}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          Filters
        </div>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Source</span>
          {[['', 'All'], ['pco', 'PCO'], ['manual', 'Manual']].map(([v, label]) => (
            <button
              key={v}
              className={`${styles.filterPill} ${filterSource === v ? styles.filterPillActive : ''}`}
              onClick={() => setFilterSource(v)}
            >{label}</button>
          ))}
        </div>
        <div className={styles.filterGroup}>
          <span className={styles.filterLabel}>Category</span>
          {CATEGORIES.map(c => (
            <button
              key={c}
              className={`${styles.filterPill} ${filterCats.includes(c) ? styles.filterPillActive : ''}`}
              onClick={() => toggleFilterCat(c)}
            >{c}</button>
          ))}
        </div>
        {hasActiveFilters && (
          <button className={styles.filterClear} onClick={() => { setFilterSource(''); setFilterCats([]) }}>
            Clear filters
          </button>
        )}
      </div>

      {loading && <p className={styles.muted}>Loading…</p>}

      {!loading && loadError && (
        <div className={styles.emptyState}>
          <p className={styles.muted}>Failed to load people: {loadError}</p>
        </div>
      )}

      {!loading && !loadError && people.length === 0 && (
        <div className={styles.emptyState}>
          <p>No people yet.</p>
          <p className={styles.muted}>Add people manually or sync from Planning Center.</p>
        </div>
      )}

      {!loading && people.length > 0 && filtered.length === 0 && (
        <p className={styles.muted}>No people match the current search or filters.</p>
      )}

      {!loading && filtered.length > 0 && (
        <>
          {viewMode === 'list'
            ? <ListView people={filtered} onEdit={p => setModal({ type: 'edit', person: p })} onDelete={deletePerson} isAdmin={isAdmin} />
            : <GridView people={filtered} onSelect={p => setModal({ type: 'detail', person: p })} />
          }
          <p className={styles.count}>{filtered.length} of {people.length} {people.length === 1 ? 'person' : 'people'}</p>
        </>
      )}

      {modal?.type === 'edit' && (
        <PersonModal initial={modal.person} onSave={onSaved} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'detail' && (
        <PersonDetailModal
          person={modal.person}
          onEdit={p => setModal({ type: 'edit', person: p })}
          onDelete={deletePerson}
          onClose={() => setModal(null)}
          isAdmin={isAdmin}
        />
      )}
    </AdminLayout>
  )
}
