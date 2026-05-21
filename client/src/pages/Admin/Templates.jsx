import { useEffect, useState } from 'react'
import AdminLayout from './_Layout'
import Modal from '../../components/Modal'
import InfoPopover from '../../components/InfoPopover'
import styles from './Templates.module.css'

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

function parseConfig(raw) {
  if (!raw) return null
  if (typeof raw === 'object') return raw
  try { return JSON.parse(raw) } catch { return null }
}

function defaultConfig() {
  return {
    rows: [{ cols: 4, height: 2, label: '', showLabel: false }],
    emptySlots: 'reserve',
    autoMerge: false,
    showTitle: true,
    showLogo: true,
  }
}

function totalSlots(rows) {
  return (rows || []).reduce((s, r) => s + (r.cols || 0), 0)
}

const HEIGHT_OPTIONS = [
  [0.5, 'Tiny'],
  [1, 'Compact'],
  [2, 'Standard'],
  [3, 'Tall'],
]

// full = photo + name + label on the card
// photo = headshot only, no text
// label = name + label text, no photo
const SLOT_MODES = [
  ['full',  'Full card'],
  ['photo', 'Image only'],
  ['name',  'Name only'],
  ['label', 'Label only'],
]

const MODE_LABELS = { photo: 'Image', name: 'Name', label: 'Label' }

// ── Toggle switch ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`${styles.toggle} ${checked ? styles.toggleOn : ''}`}
      onClick={() => onChange(!checked)}
    />
  )
}

// ── Live grid preview — fixed 16:9 TV aspect ratio, rows flex-fill ───────────
function GridPreview({ rows }) {
  let slotNum = 0
  return (
    <div className={styles.gridPreview}>
      {rows.map((row, ri) => {
        const start = slotNum
        slotNum += row.cols
        return (
          <div key={ri} className={styles.previewRowWrap} style={{ flex: row.height }}>
            {row.showLabel && row.label && (
              <div className={styles.previewRowLabel}>{row.label}</div>
            )}
            <div className={styles.previewCells}>
              {Array.from({ length: row.cols }).map((_, ci) => (
                <div key={ci} className={styles.previewCell}>
                  <span className={styles.previewSlot}>{start + ci + 1}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Template modal ────────────────────────────────────────────────────────────
function TemplateModal({ initial, onSave, onClose }) {
  const initConfig = initial ? (parseConfig(initial.config) || defaultConfig()) : defaultConfig()

  const [name,         setName]       = useState(initial?.name || '')
  const [desc,         setDesc]       = useState(initial?.description || '')
  const [rows,         setRows]       = useState(initConfig.rows || [{ cols: 4, height: 2, label: '' }])
  const [emptySlots,   setEmpty]      = useState(initConfig.emptySlots || 'reserve')
  const [autoMerge,    setMerge]      = useState(initConfig.autoMerge ?? false)
  const [showTitle,    setTitle]      = useState(initConfig.showTitle ?? true)
  const [showLogo,     setLogo]       = useState(initConfig.showLogo ?? true)
  const [slotAsgn,     setSlotAsgn]   = useState(initConfig.slots || {})
  const [selectedSlot, setSelected]   = useState(null)
  const [labels,       setLabels]     = useState([])
  const [saving,       setSaving]     = useState(false)
  const [error,        setError]      = useState(null)

  useEffect(() => {
    api('/labels').then(setLabels).catch(() => {})
  }, [])

  const micLabels = labels.filter(l => l.type === 'mic')
  const iemLabels = labels.filter(l => l.type === 'iem')

  function setRowCount(n) {
    setRows(prev => {
      if (n > prev.length) {
        const added = Array.from({ length: n - prev.length }, () => ({ cols: 4, height: 2, label: '', showLabel: false }))
        return [...prev, ...added]
      }
      return prev.slice(0, n)
    })
  }

  function updateRow(i, patch) {
    setRows(prev => prev.map((r, idx) => idx === i ? { ...r, ...patch } : r))
  }

  function slotIsEmpty(a) { return !a.labelId && !a.mode && !a.linkedTo }

  function updateSlotLabel(sn, id) {
    setSlotAsgn(prev => {
      const next = { ...(prev[sn] || {}), labelId: id || undefined }
      if (slotIsEmpty(next)) { const n = { ...prev }; delete n[sn]; return n }
      return { ...prev, [sn]: next }
    })
  }

  function updateSlotMode(sn, mode) {
    setSlotAsgn(prev => {
      const cur = prev[sn] || {}
      const next = { ...cur }
      if (mode === 'full') { delete next.mode; delete next.linkedTo }
      else next.mode = mode
      if (slotIsEmpty(next)) { const n = { ...prev }; delete n[sn]; return n }
      return { ...prev, [sn]: next }
    })
  }

  function updateSlotLinkedTo(sn, linkedTo) {
    setSlotAsgn(prev => {
      const next = { ...(prev[sn] || {}) }
      if (linkedTo) next.linkedTo = Number(linkedTo)
      else delete next.linkedTo
      if (slotIsEmpty(next)) { const n = { ...prev }; delete n[sn]; return n }
      return { ...prev, [sn]: next }
    })
  }

  function clearSlot(sn) {
    setSlotAsgn(prev => { const n = { ...prev }; delete n[sn]; return n })
    setSelected(null)
  }

  async function submit() {
    if (!name.trim()) { setError('Name is required'); return }
    setSaving(true)
    setError(null)
    try {
      const config = { rows, emptySlots, autoMerge, showTitle, showLogo, slots: slotAsgn }
      const body = { name: name.trim(), description: desc.trim() || null, config }
      const method = initial ? 'PUT' : 'POST'
      const path   = initial ? `/templates/${initial.id}` : '/templates'
      const saved  = await api(path, { method, body: JSON.stringify(body) })
      onSave(saved)
    } catch (e) { setError(e.message) }
    finally { setSaving(false) }
  }

  const slots      = totalSlots(rows)
  const gridHeight = Math.min(Math.max(rows.reduce((s, r) => s + r.height * 60, 0), 120), 360)
  const panelAsgn  = selectedSlot !== null ? (slotAsgn[selectedSlot] || {}) : null
  const panelMode  = panelAsgn ? (panelAsgn.mode || 'full') : 'full'

  return (
    <Modal
      title={initial ? 'Edit Template' : 'New Template'}
      onClose={onClose}
      width={540}
      footer={
        <>
          <button className={styles.btnGhost} onClick={onClose}>Cancel</button>
          <button className={styles.btnPrimary} onClick={submit} disabled={saving || !name.trim()}>
            {saving ? 'Saving…' : initial ? 'Save Changes' : 'Create Template'}
          </button>
        </>
      }
    >
      {error && <p className={styles.formError}>{error}</p>}

      {/* Name */}
      <div className={styles.formField}>
        <label className={styles.formLabel}>Template name</label>
        <input
          className={styles.formInput}
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
          placeholder="e.g. Main Stage, Mic Cart, Overflow"
        />
      </div>

      {/* Description */}
      <div className={styles.formField}>
        <label className={styles.formLabel}>Description <span className={styles.opt}>(optional)</span></label>
        <input
          className={styles.formInput}
          value={desc}
          onChange={e => setDesc(e.target.value)}
          placeholder="When or where is this layout used?"
        />
      </div>

      {/* Row count */}
      <div className={styles.formField}>
        <label className={styles.formLabel}>Number of rows</label>
        <div className={styles.rowCountRow}>
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              type="button"
              className={`${styles.rowCountBtn} ${rows.length === n ? styles.rowCountBtnActive : ''}`}
              onClick={() => setRowCount(n)}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* Per-row settings */}
      <div className={styles.formField}>
        <label className={styles.formLabel}>Row settings</label>
        <div className={styles.rowConfigs}>
          {rows.map((row, i) => (
            <div key={i} className={styles.rowConfig}>
              <span className={styles.rowNum}>Row {i + 1}</span>
              <div className={styles.rowTop}>
                <div className={styles.rowField}>
                  <span className={styles.rowFieldLabel}>Columns</span>
                  <select
                    className={styles.rowSelect}
                    value={row.cols}
                    onChange={e => updateRow(i, { cols: Number(e.target.value) })}
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                      <option key={n} value={n}>{n} {n === 1 ? 'slot' : 'slots'}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.rowField}>
                  <span className={styles.rowFieldLabel}>Height</span>
                  <select
                    className={styles.rowSelect}
                    value={row.height}
                    onChange={e => updateRow(i, { height: Number(e.target.value) })}
                  >
                    {HEIGHT_OPTIONS.map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className={styles.rowBottom}>
                <span className={styles.rowFieldLabel}>
                  Section label <span className={styles.opt}>(optional)</span>
                </span>
                <input
                  className={styles.rowInput}
                  value={row.label}
                  onChange={e => updateRow(i, { label: e.target.value })}
                  placeholder="e.g. Vocals, Band, Tech"
                />
                <button
                  type="button"
                  className={`${styles.showLabelBtn} ${row.showLabel ? styles.showLabelBtnOn : ''}`}
                  onClick={() => updateRow(i, { showLabel: !row.showLabel })}
                  disabled={!row.label?.trim()}
                >
                  {row.showLabel ? 'Showing on screen' : 'Show on screen'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Slot configuration — clickable proportional grid */}
      <div className={styles.formField}>
        <label className={styles.formLabel}>
          Slot configuration <span className={styles.opt}>({slots} slot{slots !== 1 ? 's' : ''} — click a cell to configure it)</span>
        </label>
        <div className={styles.assignGrid} style={{ height: `${gridHeight}px` }}>
          {rows.map((row, ri) => {
            const rowStart = rows.slice(0, ri).reduce((s, r) => s + r.cols, 0)
            return (
              <div key={ri} className={styles.assignRow} style={{ flex: row.height }}>
                {Array.from({ length: row.cols }).map((_, ci) => {
                  const sn = rowStart + ci + 1
                  const asgn = slotAsgn[sn]
                  const labelName = asgn?.labelId ? labels.find(l => l.id === asgn.labelId)?.name : null
                  const isSel = selectedSlot === sn
                  const hasConfig = !!(labelName || asgn?.mode)
                  return (
                    <div
                      key={ci}
                      className={`${styles.assignCell} ${isSel ? styles.assignCellSelected : ''} ${hasConfig ? styles.assignCellSet : ''}`}
                      onClick={() => setSelected(isSel ? null : sn)}
                    >
                      <span className={styles.assignCellNum}>{sn}</span>
                      {asgn?.mode && asgn.mode !== 'full' && (
                        <span className={styles.assignCellMode}>{MODE_LABELS[asgn.mode]}</span>
                      )}
                      {asgn?.linkedTo && (
                        <span className={styles.assignCellLinked}>→{asgn.linkedTo}</span>
                      )}
                      {labelName && <span className={styles.assignCellMic}>{labelName}</span>}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        {panelAsgn !== null && (
          <div className={styles.assignPanel}>
            <div className={styles.assignPanelHead}>
              <span className={styles.assignPanelTitle}>Slot {selectedSlot}</span>
              <button
                type="button"
                className={styles.assignClearBtn}
                onClick={() => clearSlot(selectedSlot)}
                disabled={!slotAsgn[selectedSlot]}
              >Clear</button>
            </div>

            <div className={styles.rowField}>
              <span className={styles.rowFieldLabel}>What this cell shows on screen</span>
              <div className={styles.slotModeRow}>
                {SLOT_MODES.map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    className={`${styles.slotModeBtn} ${panelMode === v ? styles.slotModeBtnActive : ''}`}
                    onClick={() => updateSlotMode(selectedSlot, v)}
                  >{l}</button>
                ))}
              </div>
            </div>

            {panelMode === 'name' && (
              <div className={styles.rowField}>
                <span className={styles.rowFieldLabel}>Link data from slot</span>
                <select
                  className={styles.rowSelect}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  value={panelAsgn.linkedTo || ''}
                  onChange={e => updateSlotLinkedTo(selectedSlot, e.target.value || undefined)}
                >
                  <option value="">No link — use this slot's own person</option>
                  {(() => {
                    let sn = 0
                    const opts = []
                    rows.forEach((row, ri) => {
                      for (let c = 0; c < row.cols; c++) {
                        sn++
                        if (sn !== selectedSlot) {
                          const a = slotAsgn[sn]
                          const ml = a?.mode ? ` · ${MODE_LABELS[a.mode] ?? a.mode}` : ''
                          opts.push(<option key={sn} value={sn}>Row {ri + 1} · Col {c + 1}{ml}</option>)
                        }
                      }
                    })
                    return opts
                  })()}
                </select>
              </div>
            )}

            {panelMode !== 'photo' && panelMode !== 'name' && (
              <div className={styles.rowField}>
                <span className={styles.rowFieldLabel}>Label assigned to this slot</span>
                <select
                  className={styles.rowSelect}
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  value={panelAsgn.labelId || ''}
                  onChange={e => updateSlotLabel(selectedSlot, e.target.value ? Number(e.target.value) : undefined)}
                >
                  <option value="">None</option>
                  {micLabels.length > 0 && (
                    <optgroup label="Mic">
                      {micLabels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </optgroup>
                  )}
                  {iemLabels.length > 0 && (
                    <optgroup label="IEM">
                      {iemLabels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </optgroup>
                  )}
                  {labels.length === 0 && (
                    <option disabled>No labels yet — add some in the Labels tab</option>
                  )}
                </select>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Empty slot behavior */}
      <div className={styles.formField}>
        <label className={styles.formLabel}>Empty slot behavior</label>
        <div className={styles.emptyBehaviorGroup}>
          <label className={`${styles.behaviorOpt} ${emptySlots === 'reserve' ? styles.behaviorOptActive : ''}`}>
            <input
              type="radio"
              name="emptySlots"
              value="reserve"
              checked={emptySlots === 'reserve'}
              onChange={() => setEmpty('reserve')}
              className={styles.radioInput}
            />
            <div>
              <span className={styles.behaviorTitle}>Reserve slots</span>
              <span className={styles.behaviorDesc}>
                Unassigned slots stay visible as empty placeholder cards, keeping the grid shape intact.
                Good for fixed equipment setups — e.g. Mic 4 always has a slot even if no one is using it this week.
              </span>
            </div>
          </label>
          <label className={`${styles.behaviorOpt} ${emptySlots === 'collapse' ? styles.behaviorOptActive : ''}`}>
            <input
              type="radio"
              name="emptySlots"
              value="collapse"
              checked={emptySlots === 'collapse'}
              onChange={() => setEmpty('collapse')}
              className={styles.radioInput}
            />
            <div>
              <span className={styles.behaviorTitle}>Collapse slots</span>
              <span className={styles.behaviorDesc}>
                Unassigned slots disappear and the remaining cards fill in.
                Good for variable team sizes where you only want to show who's actually assigned.
              </span>
            </div>
          </label>
        </div>
      </div>

      {/* Options */}
      <div className={styles.formField}>
        <label className={styles.formLabel}>Display options</label>
        <div className={styles.optionsList}>
          <div className={styles.optionRow}>
            <div>
              <span className={styles.optionTitle}>Auto-merge same person</span>
              <span className={styles.optionDesc}>
                When the same person appears in vertically adjacent slots, combine them into one taller card.
              </span>
            </div>
            <Toggle checked={autoMerge} onChange={setMerge} />
          </div>
          <div className={styles.optionRow}>
            <div>
              <span className={styles.optionTitle}>Show service title</span>
              <span className={styles.optionDesc}>Display the event name and date in the header bar.</span>
            </div>
            <Toggle checked={showTitle} onChange={setTitle} />
          </div>
          <div className={styles.optionRow}>
            <div>
              <span className={styles.optionTitle}>Show organization logo</span>
              <span className={styles.optionDesc}>Display your org logo and name in the header bar.</span>
            </div>
            <Toggle checked={showLogo} onChange={setLogo} />
          </div>
        </div>
      </div>
    </Modal>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function Templates() {
  const [templates, setTemplates] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [modal,     setModal]     = useState(null)
  const [viewMode,  setViewMode]  = useState(() => localStorage.getItem('beacon-templates-view') || 'list')

  useEffect(() => {
    api('/templates').then(setTemplates).finally(() => setLoading(false))
  }, [])

  function switchView(mode) {
    setViewMode(mode)
    localStorage.setItem('beacon-templates-view', mode)
  }

  function onSaved(t) {
    setTemplates(prev => {
      const idx = prev.findIndex(x => x.id === t.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = t; return next }
      return [...prev, t]
    })
    setModal(null)
  }

  async function deleteTemplate(id) {
    if (!confirm('Delete this template? Screens using it will fall back to Standard Grid.')) return
    await api(`/templates/${id}`, { method: 'DELETE' })
    setTemplates(prev => prev.filter(t => t.id !== id))
  }

  return (
    <AdminLayout title="Templates">
      <div className={styles.topBar}>
        <InfoPopover title="Templates" docsHref="/docs#templates">
          <p>Templates define a custom display grid for a screen — how many rows, how many slots per row, and what each slot shows.</p>
          <p><strong>Rows</strong> can be different heights (Tiny → Tall) and widths (1–8 slots). Add an optional section label to identify rows like "Vocals" or "Band" on screen.</p>
          <p><strong>Slot configuration</strong> — click any cell in the editor to set its display mode (Full card, Photo only, or Label only) and which label is assigned to that slot by default.</p>
          <p><strong>Empty slot behavior</strong> controls whether unused slots stay as placeholders or collapse when nobody is assigned.</p>
          <p>Once created, select a template when setting up a screen instead of a preset layout.</p>
        </InfoPopover>
        <div className={styles.topBarRight}>
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
          <button className={styles.btnPrimary} onClick={() => setModal({ data: null })}>
            + New Template
          </button>
        </div>
      </div>

      {loading && <p className={styles.muted}>Loading…</p>}

      {!loading && templates.length === 0 && (
        <div className={styles.emptyState}>
          <p>No templates yet.</p>
          <p>Create a template to define a custom fixed-grid layout for your screens.</p>
        </div>
      )}

      {templates.length > 0 && viewMode === 'list' && (
        <div className={styles.list}>
          {templates.map(t => {
            const config = parseConfig(t.config)
            const slots  = config?.rows ? totalSlots(config.rows) : 0
            const nRows  = config?.rows?.length ?? 0
            const isReserve = (config?.emptySlots ?? 'reserve') === 'reserve'
            return (
              <div key={t.id} className={styles.listItem}>
                <div className={styles.itemIcon}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                  </svg>
                </div>
                <div className={styles.itemBody}>
                  <span className={styles.itemName}>{t.name}</span>
                  {t.description && <span className={styles.itemDesc}>{t.description}</span>}
                  <div className={styles.itemMeta}>
                    <span>{slots} slot{slots !== 1 ? 's' : ''} · {nRows} row{nRows !== 1 ? 's' : ''}</span>
                    <span className={`${styles.itemBadge} ${isReserve ? styles.badgeReserve : styles.badgeCollapse}`}>
                      {isReserve ? 'Reserve empty' : 'Collapse empty'}
                    </span>
                    {config?.autoMerge && (
                      <span className={`${styles.itemBadge} ${styles.badgeMerge}`}>Auto-merge</span>
                    )}
                  </div>
                </div>
                <div className={styles.itemActions}>
                  <button className={styles.actionBtn} onClick={() => setModal({ data: t })}>Edit</button>
                  <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`} onClick={() => deleteTemplate(t.id)}>Delete</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {templates.length > 0 && viewMode === 'grid' && (
        <div className={styles.cardGrid}>
          {templates.map(t => {
            const config    = parseConfig(t.config)
            const slots     = config?.rows ? totalSlots(config.rows) : 0
            const nRows     = config?.rows?.length ?? 0
            const isReserve = (config?.emptySlots ?? 'reserve') === 'reserve'
            const rows      = config?.rows || [{ cols: 4, height: 2 }]
            return (
              <div key={t.id} className={styles.cardItem}>
                <div className={styles.cardPreview}>
                  <GridPreview rows={rows} />
                </div>
                <div className={styles.cardBody}>
                  <span className={styles.cardName}>{t.name}</span>
                  {t.description && <span className={styles.itemDesc}>{t.description}</span>}
                  <div className={styles.itemMeta}>
                    <span>{slots} slot{slots !== 1 ? 's' : ''} · {nRows} row{nRows !== 1 ? 's' : ''}</span>
                    <span className={`${styles.itemBadge} ${isReserve ? styles.badgeReserve : styles.badgeCollapse}`}>
                      {isReserve ? 'Reserve' : 'Collapse'}
                    </span>
                    {config?.autoMerge && (
                      <span className={`${styles.itemBadge} ${styles.badgeMerge}`}>Merge</span>
                    )}
                  </div>
                </div>
                <div className={styles.cardActions}>
                  <button className={styles.actionBtn} onClick={() => setModal({ data: t })}>Edit</button>
                  <button className={`${styles.actionBtn} ${styles.actionBtnDanger}`} onClick={() => deleteTemplate(t.id)}>Delete</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <TemplateModal
          initial={modal.data}
          onSave={onSaved}
          onClose={() => setModal(null)}
        />
      )}
    </AdminLayout>
  )
}
