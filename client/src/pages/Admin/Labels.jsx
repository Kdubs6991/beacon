import { useEffect, useState } from 'react'
import AdminLayout from './_Layout'
import Modal from '../../components/Modal'
import InfoPopover from '../../components/InfoPopover'
import styles from './Labels.module.css'

function api(path, opts = {}) {
  return fetch(`/api/admin${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  }).then(async r => {
    const data = await r.json()
    if (r.status === 401) { window.location.href = "/login"; throw new Error("Session expired") }
    if (!r.ok) throw new Error(data.error || "Request failed")
    return data
  })
}

const TYPE_META = {
  mic: { label: 'Microphones', color: styles.typeMic },
  iem: { label: 'In-Ear Monitors', color: styles.typeIem },
}

function GripIcon() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" aria-hidden="true">
      <circle cx="3" cy="2.5" r="1.2"/>
      <circle cx="7" cy="2.5" r="1.2"/>
      <circle cx="3" cy="7" r="1.2"/>
      <circle cx="7" cy="7" r="1.2"/>
      <circle cx="3" cy="11.5" r="1.2"/>
      <circle cx="7" cy="11.5" r="1.2"/>
    </svg>
  )
}

// ── Label modal ───────────────────────────────────────────────────────────────

function LabelModal({ initial, defaultType, onSave, onClose }) {
  const [name, setName]       = useState(initial?.name ?? '')
  const [type, setType]       = useState(initial?.type ?? defaultType ?? 'mic')
  const [groupName, setGroup] = useState(initial?.group_name ?? '')
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState(null)

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const body = { name: name.trim(), type, group_name: groupName.trim() || null }
      const method = initial ? 'PUT' : 'POST'
      const path   = initial ? `/labels/${initial.id}` : '/labels'
      const saved  = await api(path, { method, body: JSON.stringify(body) })
      onSave(saved)
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  return (
    <Modal
      title={initial ? 'Edit Label' : 'Add Label'}
      onClose={onClose}
      width={400}
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
        <label className={styles.formLabel}>Type</label>
        <div className={styles.typeToggle}>
          {Object.entries(TYPE_META).map(([k, m]) => (
            <button
              key={k}
              type="button"
              className={`${styles.typeBtn} ${type === k ? styles.typeBtnActive : ''}`}
              onClick={() => setType(k)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.formField}>
        <label className={styles.formLabel}>Name <span className={styles.req}>*</span></label>
        <input
          className={styles.formInput}
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
          placeholder="e.g. Vox 1, Keys DI, IEM 3"
        />
      </div>

      <div className={styles.formField}>
        <label className={styles.formLabel}>Group <span className={styles.opt}>(optional)</span></label>
        <input
          className={styles.formInput}
          value={groupName}
          onChange={e => setGroup(e.target.value)}
          placeholder="e.g. Vocals, Packs"
        />
        <p className={styles.formHint}>Used by automation rules to assign "next available" within a group.</p>
      </div>
    </Modal>
  )
}

// ── Label row ─────────────────────────────────────────────────────────────────

function LabelRow({ label, isDragging, isOver, onDragStart, onDragOver, onDrop, onDragEnd, onEdit, onDelete }) {
  return (
    <div
      className={`${styles.labelRow} ${isDragging ? styles.labelRowDragging : ''} ${isOver ? styles.labelRowOver : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className={styles.dragHandle}>
        <GripIcon />
      </div>
      <div className={styles.labelInfo}>
        <span className={styles.labelName}>{label.name}</span>
        {label.group_name && <span className={styles.labelGroup}>{label.group_name}</span>}
      </div>
      <div className={styles.labelActions}>
        <button className={styles.menuBtn} onClick={() => onEdit(label)}>Edit</button>
        <button className={`${styles.menuBtn} ${styles.menuDanger}`} onClick={() => onDelete(label.id)}>Delete</button>
      </div>
    </div>
  )
}

// ── Section ───────────────────────────────────────────────────────────────────

function LabelSection({ type, labels, onEdit, onDelete, onReorder }) {
  const meta = TYPE_META[type]
  const [dragIdx, setDragIdx] = useState(null)
  const [overIdx, setOverIdx] = useState(null)

  function handleDragStart(i) { setDragIdx(i) }

  function handleDragOver(e, i) {
    e.preventDefault()
    setOverIdx(i)
  }

  function handleDrop(i) {
    if (dragIdx === null || dragIdx === i) { reset(); return }
    const next = [...labels]
    const [item] = next.splice(dragIdx, 1)
    next.splice(i, 0, item)
    onReorder(type, next)
    reset()
  }

  function handleDragEnd() { reset() }

  function reset() { setDragIdx(null); setOverIdx(null) }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={`${styles.sectionTitle} ${meta.color}`}>{meta.label}</h2>
      </div>

      {labels.length === 0
        ? <p className={styles.emptySection}>No {meta.label.toLowerCase()} defined yet.</p>
        : labels.map((label, i) => (
          <LabelRow
            key={label.id}
            label={label}
            isDragging={dragIdx === i}
            isOver={overIdx === i && dragIdx !== i}
            onDragStart={() => handleDragStart(i)}
            onDragOver={e => handleDragOver(e, i)}
            onDrop={() => handleDrop(i)}
            onDragEnd={handleDragEnd}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))
      }
    </div>
  )
}

// ── Positions section ─────────────────────────────────────────────────────────

function PositionsSection() {
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [editId, setEditId] = useState(null)
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api('/position-types').then(data => {
      setPositions(Array.isArray(data) ? data : [])
      setLoading(false)
    })
  }, [])

  async function handleAdd() {
    if (!newName.trim()) return
    setSaving(true)
    const saved = await api('/position-types', { method: 'POST', body: JSON.stringify({ name: newName.trim() }) })
    setPositions(prev => [...prev, saved])
    setNewName('')
    setAdding(false)
    setSaving(false)
  }

  async function handleEdit(id) {
    if (!editName.trim()) return
    setSaving(true)
    const saved = await api(`/position-types/${id}`, { method: 'PUT', body: JSON.stringify({ name: editName.trim() }) })
    setPositions(prev => prev.map(p => p.id === id ? saved : p))
    setEditId(null)
    setSaving(false)
  }

  async function handleDelete(id) {
    if (!confirm('Delete this position?')) return
    await api(`/position-types/${id}`, { method: 'DELETE' })
    setPositions(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.sectionHeaderInfo}>
          <h2 className={`${styles.sectionTitle} ${styles.typePosition}`}>Positions</h2>
          <p className={styles.sectionSubtitle}>Roles used in Manual service types — e.g. Singer, Speaker, Announcements. Automation rules match on these.</p>
        </div>
        {!adding && (
          <button className={styles.btnPrimary} onClick={() => setAdding(true)}>
            + Add Position
          </button>
        )}
      </div>

      {loading && <p className={styles.emptySection}>Loading…</p>}

      {!loading && positions.length === 0 && !adding && (
        <p className={styles.emptySection}>No positions defined yet.</p>
      )}

      {!loading && positions.map(p => (
        <div key={p.id} className={styles.positionRow}>
          {editId === p.id ? (
            <>
              <input
                className={styles.positionInput}
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleEdit(p.id); if (e.key === 'Escape') setEditId(null) }}
                autoFocus
              />
              <button className={styles.menuBtn} onClick={() => handleEdit(p.id)} disabled={saving}>Save</button>
              <button className={styles.menuBtn} onClick={() => setEditId(null)}>Cancel</button>
            </>
          ) : (
            <>
              <span className={styles.positionName}>{p.name}</span>
              <div className={styles.labelActions}>
                <button className={styles.menuBtn} onClick={() => { setEditId(p.id); setEditName(p.name) }}>Edit</button>
                <button className={`${styles.menuBtn} ${styles.menuDanger}`} onClick={() => handleDelete(p.id)}>Delete</button>
              </div>
            </>
          )}
        </div>
      ))}

      {adding && (
        <div className={styles.positionAddRow}>
          <input
            className={styles.positionInput}
            placeholder="e.g. Singer, Speaker, Keys"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); if (e.key === 'Escape') { setAdding(false); setNewName('') } }}
            autoFocus
          />
          <button className={styles.menuBtn} onClick={handleAdd} disabled={saving || !newName.trim()}>Add</button>
          <button className={styles.menuBtn} onClick={() => { setAdding(false); setNewName('') }}>Cancel</button>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Labels() {
  const [labels, setLabels] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)

  useEffect(() => {
    api('/labels').then(setLabels).finally(() => setLoading(false))
  }, [])

  function byType(type) {
    return labels.filter(l => l.type === type).sort((a, b) => a.sort_order - b.sort_order)
  }

  async function handleReorder(type, reordered) {
    setLabels(prev => [
      ...prev.filter(l => l.type !== type),
      ...reordered,
    ])
    await api('/labels/reorder', {
      method: 'PUT',
      body: JSON.stringify({ ids: reordered.map(l => l.id) }),
    })
  }

  async function deleteLabel(id) {
    if (!confirm('Delete this label?')) return
    await api(`/labels/${id}`, { method: 'DELETE' })
    setLabels(prev => prev.filter(l => l.id !== id))
  }

  function onSaved(label) {
    setLabels(prev => {
      const idx = prev.findIndex(l => l.id === label.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = label; return next }
      return [...prev, label]
    })
    setModal(null)
  }

  return (
    <AdminLayout title="Labels">
      <div className={styles.topBar}>
        <InfoPopover title="Labels" docsHref="/docs#labels">
          <p>Labels are your physical audio equipment inventory — every mic channel, DI box, and IEM pack gets a label name like <strong>Vox 1</strong>, <strong>Keys DI</strong>, or <strong>Pack A</strong>. These are what appear on musician cards on the TV display.</p>
          <p><strong>Order matters</strong> — when automation assigns "next available", it starts from the top of the list and picks the first one that hasn't been given to someone else that service. Drag rows to set the priority.</p>
          <p>Use <strong>groups</strong> (e.g. "Vocals", "Instruments") to create separate pools so automation can pull a vocalist's mic from the Vocals group instead of mixing with DI boxes.</p>
          <p><strong>Positions</strong> are at the bottom of this page — role names like Singer, Worship Leader, or Electric Guitar. Define them here first so they appear as dropdown options when building Manual service teams.</p>
        </InfoPopover>
        <button className={styles.btnPrimary} onClick={() => setModal({ label: null, defaultType: 'mic' })}>
          + Add Label
        </button>
      </div>

      {loading && <p className={styles.muted}>Loading…</p>}

      {!loading && (
        <div className={styles.sections}>
          {['mic', 'iem'].map(type => (
            <LabelSection
              key={type}
              type={type}
              labels={byType(type)}
              onEdit={label => setModal({ label, defaultType: label.type })}
              onDelete={deleteLabel}
              onReorder={handleReorder}
            />
          ))}
          <PositionsSection />
        </div>
      )}

      {modal && (
        <LabelModal
          initial={modal.label}
          defaultType={modal.defaultType}
          onSave={onSaved}
          onClose={() => setModal(null)}
        />
      )}
    </AdminLayout>
  )
}
