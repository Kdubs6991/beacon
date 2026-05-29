import { useEffect, useReducer, useState } from 'react'
import AdminLayout from './_Layout'
import Modal from '../../components/Modal'
import CronBuilder from '../../components/CronBuilder'
import InfoPopover from '../../components/InfoPopover'
import styles from './Locations.module.css'

// ── cron utils ────────────────────────────────────────────────────────────────

function getNextRun(cronExpr) {
  if (!cronExpr) return null
  const parts = cronExpr.trim().split(/\s+/)
  if (parts.length < 5) return null
  const minute = parseInt(parts[0])
  const hour = parseInt(parts[1])
  const days = parts[4] === '*' ? [0,1,2,3,4,5,6] : parts[4].split(',').map(Number)
  const now = new Date()
  for (let i = 0; i <= 7; i++) {
    const c = new Date(now)
    c.setDate(c.getDate() + i)
    c.setHours(hour, minute, 0, 0)
    if (c <= now) continue
    if (days.includes(c.getDay())) return c
  }
  return null
}

function formatNextRun(date) {
  if (!date) return null
  const now = new Date()
  const diffH = Math.round((date - now) / 36e5)
  const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  if (diffH < 24) return `Today at ${time}`
  if (diffH < 48) return `Tomorrow at ${time}`
  return `${date.toLocaleDateString([], { weekday: 'long' })} at ${time}`
}

// ── helpers ──────────────────────────────────────────────────────────────────

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

// ── Campus form modal ─────────────────────────────────────────────────────────

function CampusModal({ initial, onSave, onClose }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const method = initial ? 'PUT' : 'POST'
      const path = initial ? `/campuses/${initial.id}` : '/campuses'
      const saved = await api(path, { method, body: JSON.stringify({ name: name.trim(), description: description.trim() || null }) })
      onSave(saved)
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  return (
    <Modal title={initial ? 'Edit Location' : 'New Location'} onClose={onClose}
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
        <label className={styles.formLabel}>Name</label>
        <input className={styles.formInput} value={name} onChange={e => setName(e.target.value)} autoFocus placeholder="e.g. Main Campus" />
      </div>
      <div className={styles.formField}>
        <label className={styles.formLabel}>Description <span className={styles.optional}>(optional)</span></label>
        <input className={styles.formInput} value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief description" />
      </div>
    </Modal>
  )
}

// ── Service type row ──────────────────────────────────────────────────────────

function ServiceTypeRow({ st, schedule: scheduleProp, campusId, onDelete, onScheduleSave, onScheduleDelete }) {
  const [showSchedule, setShowSchedule] = useState(false)
  const [schedule, setSchedule] = useState(scheduleProp)
  const [cronValue, setCronValue] = useState(scheduleProp?.cron_expr ?? null)
  const [enabled, setEnabled] = useState(scheduleProp?.enabled !== 0)
  const [saving, setSaving] = useState(false)
  const [running, setRunning] = useState(false)
  const [lastRunAt, setLastRunAt] = useState(scheduleProp?.last_run ?? null)
  const [editName, setEditName] = useState(false)
  const [name, setName] = useState(st.name)
  const [pcoId, setPcoId] = useState(st.pco_service_type_id ?? '')

  const nextRun = schedule?.enabled ? formatNextRun(getNextRun(schedule.cron_expr)) : null

  async function saveSchedule() {
    if (!cronValue) return
    setSaving(true)
    try {
      let saved
      if (schedule) {
        saved = await api(`/schedules/${schedule.id}`, { method: 'PUT', body: JSON.stringify({ cron_expr: cronValue, enabled: enabled ? 1 : 0 }) })
      } else {
        saved = await api('/schedules', { method: 'POST', body: JSON.stringify({ service_type_id: st.id, cron_expr: cronValue, enabled: 1 }) })
        setEnabled(true)
      }
      setSchedule(saved)
      onScheduleSave(st.id, saved)
      setShowSchedule(false)
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  async function deleteSchedule() {
    if (!schedule) return
    if (!confirm('Remove this schedule?')) return
    await api(`/schedules/${schedule.id}`, { method: 'DELETE' })
    setSchedule(null)
    onScheduleDelete(st.id)
    setCronValue(null)
    setShowSchedule(false)
  }

  async function runNow() {
    if (!schedule) return
    setRunning(true)
    try {
      await api(`/schedules/${schedule.id}/run`, { method: 'POST' })
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
      setLastRunAt(now)
      const updated = { ...schedule, last_run: now }
      setSchedule(updated)
      onScheduleSave(st.id, updated)
    } catch (e) { alert(e.message) }
    finally { setRunning(false) }
  }

  async function saveName() {
    if (!name.trim()) return
    const updated = await api(`/service-types/${st.id}`, {
      method: 'PUT',
      body: JSON.stringify({ name: name.trim(), campus_id: campusId, pco_service_type_id: pcoId || null }),
    })
    st.name = updated.name
    st.pco_service_type_id = updated.pco_service_type_id
    setEditName(false)
  }

  return (
    <>
      <div className={styles.stRow}>
        {editName ? (
          <div className={styles.stEditForm}>
            <input className={styles.formInputSm} value={name} onChange={e => setName(e.target.value)} placeholder="Service name" />
            <input className={styles.formInputSm} value={pcoId} onChange={e => setPcoId(e.target.value)} placeholder="PCO ID (optional)" style={{ width: 140 }} />
            <button className={styles.btnPrimaryXs} onClick={saveName}>Save</button>
            <button className={styles.btnGhostXs} onClick={() => setEditName(false)}>Cancel</button>
          </div>
        ) : (
          <>
            <span className={styles.stName}>{st.name}</span>
            {st.pco_service_type_id
              ? <span className={styles.pcoChip}>PCO {st.pco_service_type_id}</span>
              : <span className={styles.pcoChipEmpty}>No PCO link</span>}
            {schedule && (
              <span className={`${styles.scheduleChip} ${!schedule.enabled ? styles.scheduleChipPaused : ''}`}>
                {schedule.enabled ? '⏱' : '⏸'} {schedule.enabled ? 'Active' : 'Paused'}
              </span>
            )}
            {nextRun && (
              <span className={styles.nextRunLabel}>Next: {nextRun}</span>
            )}
          </>
        )}
        <div className={styles.stActions}>
          {!editName && (
            <>
              {schedule && (
                <button className={styles.runNowBtn} onClick={runNow} disabled={running} title="Run this schedule now">
                  {running ? '…' : '▶ Run now'}
                </button>
              )}
              <button className={styles.actionBtn} onClick={() => { setShowSchedule(s => !s); setEditName(false) }}>
                {showSchedule ? 'Hide schedule' : schedule ? 'Edit schedule' : 'Set schedule'}
              </button>
              <button className={styles.actionBtn} onClick={() => { setEditName(true); setShowSchedule(false) }}>Edit</button>
              <button className={`${styles.actionBtn} ${styles.actionDanger}`} onClick={() => onDelete(st.id)}>Remove</button>
            </>
          )}
        </div>
      </div>

      {showSchedule && (
        <div className={styles.schedulePanel}>
          <p className={styles.schedulePanelTitle}>Auto-refresh schedule</p>
          <p className={styles.schedulePanelDesc}>
            When this fires, the app will pull the next upcoming service from Planning Center
            and update all screens at this location.
          </p>
          <CronBuilder value={cronValue} onChange={setCronValue} />
          {schedule && (
            <label className={styles.enabledToggle}>
              <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
              Enabled
            </label>
          )}
          {schedule && (
            <div className={styles.scheduleMetaRow}>
              {nextRun && (
                <span className={styles.nextRunFull}>Next run: {nextRun}</span>
              )}
              {lastRunAt && (
                <span className={styles.lastRun}>
                  Last ran: {new Date(lastRunAt + (lastRunAt.includes('Z') ? '' : 'Z')).toLocaleString()}
                </span>
              )}
            </div>
          )}
          <div className={styles.schedulePanelActions}>
            <button className={styles.btnPrimary} onClick={saveSchedule} disabled={saving || !cronValue}>
              {saving ? 'Saving…' : schedule ? 'Update schedule' : 'Save schedule'}
            </button>
            {schedule && (
              <>
                <button className={styles.runNowBtnPanel} onClick={runNow} disabled={running}>
                  {running ? 'Running…' : '▶ Run now'}
                </button>
                <button className={styles.btnDanger} onClick={deleteSchedule}>Remove</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

// ── Add service type row ──────────────────────────────────────────────────────

function AddServiceTypeRow({ campusId, onAdd }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [pcoId, setPcoId] = useState('')
  const [saving, setSaving] = useState(false)

  async function submit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      const st = await api('/service-types', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), campus_id: campusId, pco_service_type_id: pcoId || null }),
      })
      onAdd(st)
      setName('')
      setPcoId('')
      setOpen(false)
    } catch (e) { alert(e.message) }
    finally { setSaving(false) }
  }

  if (!open) return (
    <button className={styles.addStBtn} onClick={() => setOpen(true)}>+ Add service type</button>
  )

  return (
    <form className={styles.addStForm} onSubmit={submit}>
      <input className={styles.formInputSm} value={name} onChange={e => setName(e.target.value)} placeholder="Service name (e.g. Sunday Morning)" autoFocus required />
      <input className={styles.formInputSm} value={pcoId} onChange={e => setPcoId(e.target.value)} placeholder="Planning Center ID (optional)" style={{ width: 220 }} />
      <button className={styles.btnPrimaryXs} type="submit" disabled={saving || !name.trim()}>
        {saving ? '…' : 'Add'}
      </button>
      <button type="button" className={styles.btnGhostXs} onClick={() => setOpen(false)}>Cancel</button>
    </form>
  )
}

// ── Campus card ───────────────────────────────────────────────────────────────

function CampusCard({ campus, serviceTypes, schedules, onEdit, onDelete, onSTAdd, onSTDelete, onScheduleSave, onScheduleDelete }) {
  const [expanded, setExpanded] = useState(false)

  async function deleteST(stId) {
    if (!confirm('Remove this service type? Any associated schedules will also be deleted.')) return
    await api(`/service-types/${stId}`, { method: 'DELETE' })
    onSTDelete(stId)
  }

  return (
    <div className={styles.campusCard}>
      <div className={styles.campusHeader} onClick={() => setExpanded(e => !e)}>
        <div className={styles.campusInfo}>
          <span className={styles.campusName}>{campus.name}</span>
          {campus.description && <span className={styles.campusDesc}>{campus.description}</span>}
        </div>
        <div className={styles.campusActions} onClick={e => e.stopPropagation()}>
          <span className={styles.stCount}>
            {serviceTypes.length} service type{serviceTypes.length !== 1 ? 's' : ''}
            {campus.screen_count > 0 && ` · ${campus.screen_count} screen${campus.screen_count !== 1 ? 's' : ''}`}
          </span>
          <button className={styles.actionBtn} onClick={() => onEdit(campus)}>Edit</button>
          <button className={`${styles.actionBtn} ${styles.actionDanger}`} onClick={() => onDelete(campus.id)}>Delete</button>
          <button className={styles.chevronBtn}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>

      {expanded && (
        <div className={styles.campusBody}>
          <div className={styles.stSection}>
            <p className={styles.stSectionTitle}>Service Types</p>
            {serviceTypes.length === 0 && (
              <p className={styles.emptyMsg}>No service types yet — add one to set up auto-refresh.</p>
            )}
            <div className={styles.stList}>
              {serviceTypes.map(st => (
                <ServiceTypeRow
                  key={st.id}
                  st={st}
                  schedule={schedules[st.id] ?? null}
                  campusId={campus.id}
                  onDelete={deleteST}
                  onScheduleSave={onScheduleSave}
                  onScheduleDelete={onScheduleDelete}
                />
              ))}
            </div>
            <AddServiceTypeRow campusId={campus.id} onAdd={st => onSTAdd(campus.id, st)} />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Locations() {
  const [campuses, setCampuses] = useState([])
  const [serviceTypes, setServiceTypes] = useState({})   // { campus_id: ST[] }
  const [schedules, setSchedules] = useState({})          // { service_type_id: Schedule }
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)               // null | {type: 'campus', data: campus|null}

  useEffect(() => {
    Promise.all([
      api('/campuses'),
      api('/service-types'),
      api('/schedules'),
    ]).then(([campusList, stList, schedList]) => {
      setCampuses(campusList)
      const stMap = {}
      campusList.forEach(c => { stMap[c.id] = [] })
      stList.forEach(st => {
        if (!stMap[st.campus_id]) stMap[st.campus_id] = []
        stMap[st.campus_id].push(st)
      })
      // unassigned service types go under null key
      const unassigned = stList.filter(st => !st.campus_id)
      if (unassigned.length) stMap[null] = unassigned
      setServiceTypes(stMap)

      const schedMap = {}
      schedList.forEach(s => { schedMap[s.service_type_id] = s })
      setSchedules(schedMap)
    }).finally(() => setLoading(false))
  }, [])

  async function deleteCampus(id) {
    if (!confirm('Delete this location? Service types and screens linked to it will be unlinked.')) return
    await api(`/campuses/${id}`, { method: 'DELETE' })
    setCampuses(prev => prev.filter(c => c.id !== id))
  }

  function onCampusSaved(campus) {
    setCampuses(prev => {
      const idx = prev.findIndex(c => c.id === campus.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = campus; return next }
      return [...prev, campus]
    })
    if (!serviceTypes[campus.id]) setServiceTypes(prev => ({ ...prev, [campus.id]: [] }))
    setModal(null)
  }

  return (
    <AdminLayout title="Locations">
      <div className={styles.pageActions}>
        <InfoPopover
          title="Locations"
          docsHref="/docs#locations"
        >
          <p><strong>Locations</strong> are your physical venues — one per campus or building. Think of them as the top-level bucket everything else lives under.</p>
          <p>Once you have a location, head to <strong>Services</strong> to add service types (Sunday Morning, Wednesday Night, etc.) and set up the schedule that automatically pushes team assignments to your TVs. Head to <strong>Screens</strong> to add the actual display URLs you'll open on those TVs.</p>
          <p>Start here, create at least one location, then build out from there.</p>
        </InfoPopover>

        <button className={styles.btnPrimary} onClick={() => setModal({ type: 'campus', data: null })}>
          + New Location
        </button>
      </div>

      {loading && <p className={styles.muted}>Loading…</p>}

      {!loading && campuses.length === 0 && (
        <div className={styles.emptyState}>
          <p>No locations yet.</p>
          <p className={styles.muted}>Create a location to group your service types and display screens.</p>
        </div>
      )}

      <div className={styles.campusList}>
        {campuses.map(campus => (
          <CampusCard
            key={campus.id}
            campus={campus}
            serviceTypes={serviceTypes[campus.id] ?? []}
            schedules={schedules}
            onEdit={campus => setModal({ type: 'campus', data: campus })}
            onDelete={deleteCampus}
            onSTAdd={(campusId, st) => setServiceTypes(prev => ({ ...prev, [campusId]: [...(prev[campusId] ?? []), st] }))}
            onSTDelete={stId => setServiceTypes(prev => {
              const next = {}
              Object.entries(prev).forEach(([k, list]) => { next[k] = list.filter(s => s.id !== stId) })
              return next
            })}
            onScheduleSave={(stId, sched) => setSchedules(prev => ({ ...prev, [stId]: sched }))}
            onScheduleDelete={stId => setSchedules(prev => { const n = { ...prev }; delete n[stId]; return n })}
          />
        ))}
      </div>

      {modal?.type === 'campus' && (
        <CampusModal
          initial={modal.data}
          onSave={onCampusSaved}
          onClose={() => setModal(null)}
        />
      )}
    </AdminLayout>
  )
}
