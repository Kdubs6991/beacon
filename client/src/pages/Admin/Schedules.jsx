import { useState, useEffect, useCallback } from 'react'
import AdminLayout from './_Layout'
import InfoPopover from '../../components/InfoPopover'
import styles from './Schedules.module.css'

const API = import.meta.env.VITE_API_URL ?? ''
const api = (path, opts) =>
  fetch(API + '/api/admin' + path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  }).then(r => r.json())

// ── Helpers ──────────────────────────────────────────────────────────────────

const DAYS = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
]

const HOURS = ['1','2','3','4','5','6','7','8','9','10','11','12']
const MINUTES = ['00','05','10','15','20','25','30','35','40','45','50','55']

function parseCron(expr) {
  if (!expr) return { day: '0', hour24: 8, minute: 0 }
  const parts = expr.trim().split(/\s+/)
  if (parts.length < 5) return { day: '0', hour24: 8, minute: 0 }
  const [min, hr, , , dow] = parts
  return { day: dow, hour24: parseInt(hr, 10), minute: parseInt(min, 10) }
}

function makeCronExpr(day, hour12, minute, ampm) {
  let h = parseInt(hour12, 10)
  if (ampm === 'PM' && h !== 12) h += 12
  if (ampm === 'AM' && h === 12) h = 0
  return `${parseInt(minute, 10)} ${h} * * ${day}`
}

function describeCron(expr) {
  const { day, hour24, minute } = parseCron(expr)
  const dayLabel = DAYS.find(d => d.value === day)?.label ?? `Day ${day}`
  const ampm = hour24 < 12 ? 'AM' : 'PM'
  const h12 = hour24 % 12 === 0 ? 12 : hour24 % 12
  return `${dayLabel} at ${h12}:${String(minute).padStart(2, '0')} ${ampm}`
}

function formatLastRun(str) {
  if (!str) return null
  const d = new Date(str + 'Z')
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function ChevronIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
    </svg>
  )
}

function EditIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  )
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }) {
  return (
    <label className={styles.toggle} title={checked ? 'Enabled — click to disable' : 'Disabled — click to enable'}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className={styles.toggleTrack}>
        <span className={styles.toggleThumb} />
      </span>
    </label>
  )
}

// ── Schedule form (shared for add & edit) ─────────────────────────────────────

function ScheduleForm({ initial, screens, onSave, onCancel, formClass }) {
  const { day: initDay, hour24, minute: initMin } = parseCron(initial?.cron_expr)
  const initAmpm = hour24 < 12 ? 'AM' : 'PM'
  const initHour = String(hour24 % 12 === 0 ? 12 : hour24 % 12)
  const initMinute = String(initMin).padStart(2, '0')

  const [day, setDay] = useState(initDay)
  const [hour, setHour] = useState(initHour)
  const [minute, setMinute] = useState(initMinute)
  const [ampm, setAmpm] = useState(initAmpm)
  const [selectedScreenIds, setSelectedScreenIds] = useState(() => {
    try { return initial?.screen_ids ? JSON.parse(initial.screen_ids) : [] } catch { return [] }
  })
  const [saving, setSaving] = useState(false)

  function toggleScreen(id) {
    setSelectedScreenIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handleSave() {
    setSaving(true)
    const cron_expr = makeCronExpr(day, hour, minute, ampm)
    await onSave({ cron_expr, screen_ids: selectedScreenIds })
    setSaving(false)
  }

  return (
    <div className={formClass ?? styles.addSchedForm}>
      <div className={styles.formGroup}>
        <span className={styles.formLabel}>Day</span>
        <select className={styles.formSelect} value={day} onChange={e => setDay(e.target.value)}>
          {DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
      </div>
      <div className={styles.formGroup}>
        <span className={styles.formLabel}>Hour</span>
        <select className={styles.formSelect} value={hour} onChange={e => setHour(e.target.value)} style={{ minWidth: 58 }}>
          {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
        </select>
      </div>
      <div className={styles.formGroup}>
        <span className={styles.formLabel}>Min</span>
        <select className={styles.formSelect} value={minute} onChange={e => setMinute(e.target.value)} style={{ minWidth: 58 }}>
          {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div className={styles.formGroup}>
        <span className={styles.formLabel}>&nbsp;</span>
        <select className={styles.formSelect} value={ampm} onChange={e => setAmpm(e.target.value)} style={{ minWidth: 58 }}>
          <option value="AM">AM</option>
          <option value="PM">PM</option>
        </select>
      </div>
      {screens.length > 0 && (
        <div className={styles.formGroup}>
          <span className={styles.formLabel}>Update screens</span>
          <div className={styles.screenChecks}>
            {screens.map(s => (
              <label key={s.id} className={styles.screenCheck}>
                <input
                  type="checkbox"
                  checked={selectedScreenIds.includes(s.id)}
                  onChange={() => toggleScreen(s.id)}
                />
                <span>{s.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
      <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`} onClick={handleSave} disabled={saving}>
        {saving ? 'Saving…' : (initial ? 'Update' : 'Add schedule')}
      </button>
      {onCancel && (
        <button className={`${styles.btn} ${styles.btnSmall}`} onClick={onCancel}>Cancel</button>
      )}
    </div>
  )
}

// ── Single schedule row ───────────────────────────────────────────────────────

function ScheduleRow({ schedule, screens, onToggle, onRun, onDelete, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [runOk, setRunOk] = useState(false)
  const [running, setRunning] = useState(false)

  const screenIds = (() => { try { return schedule.screen_ids ? JSON.parse(schedule.screen_ids) : [] } catch { return [] } })()
  const screenCount = screenIds.length

  async function handleRun() {
    setRunning(true)
    await onRun(schedule.id)
    setRunning(false)
    setRunOk(true)
    setTimeout(() => setRunOk(false), 3000)
  }

  if (editing) {
    return (
      <ScheduleForm
        initial={schedule}
        screens={screens}
        formClass={styles.editSchedForm}
        onSave={async (data) => { await onUpdate(schedule.id, data); setEditing(false) }}
        onCancel={() => setEditing(false)}
      />
    )
  }

  return (
    <div className={styles.schedRow}>
      <Toggle checked={!!schedule.enabled} onChange={v => onToggle(schedule.id, v)} />
      <div className={styles.schedRowLeft}>
        <span className={styles.schedCron}>{schedule.cron_expr}</span>
        <span className={styles.schedDesc}>{describeCron(schedule.cron_expr)}</span>
        <span className={screenCount > 0 ? styles.schedScreens : styles.schedScreensNone}>
          {screenCount > 0 ? `${screenCount} screen${screenCount !== 1 ? 's' : ''}` : 'No screens'}
        </span>
        {schedule.last_run && (
          <span className={styles.schedLastRun}>Last: {formatLastRun(schedule.last_run)}</span>
        )}
        {runOk && <span className={styles.runOk}>Triggered!</span>}
      </div>
      <div className={styles.schedRowActions}>
        <button className={styles.btnIcon} onClick={handleRun} disabled={running} title="Run now">
          <PlayIcon />{running ? 'Running…' : 'Run now'}
        </button>
        <button className={styles.btnIcon} onClick={() => setEditing(true)} title="Edit">
          <EditIcon />
        </button>
        <button className={`${styles.btnIcon} ${styles.btnDanger}`} onClick={() => onDelete(schedule.id)} title="Delete">
          <TrashIcon />
        </button>
      </div>
    </div>
  )
}

// ── Service type card ─────────────────────────────────────────────────────────

function ServiceTypeCard({ st, schedules, campuses, screens, pcoConnected, onDelete, onRefreshSchedules }) {
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editingSt, setEditingSt] = useState(false)
  const [stName, setStName] = useState(st.name)
  const [stCampus, setStCampus] = useState(st.campus_id ?? '')
  const [savingSt, setSavingSt] = useState(false)

  const mySchedules = schedules.filter(s => s.service_type_id === st.id)
  const campus = campuses.find(c => c.id === st.campus_id)

  async function saveStEdit() {
    setSavingSt(true)
    await api(`/service-types/${st.id}`, {
      method: 'PUT',
      body: JSON.stringify({ name: stName, campus_id: stCampus || null, pco_service_type_id: st.pco_service_type_id }),
    })
    setSavingSt(false)
    setEditingSt(false)
    onRefreshSchedules()
  }

  async function addSchedule({ cron_expr, screen_ids }) {
    await api('/schedules', {
      method: 'POST',
      body: JSON.stringify({ service_type_id: st.id, cron_expr, enabled: 1, screen_ids }),
    })
    setAdding(false)
    onRefreshSchedules()
  }

  async function toggleSchedule(id, enabled) {
    const sched = mySchedules.find(s => s.id === id)
    await api(`/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ cron_expr: sched.cron_expr, enabled: enabled ? 1 : 0, screen_ids: sched.screen_ids }),
    })
    onRefreshSchedules()
  }

  async function updateSchedule(id, { cron_expr, screen_ids }) {
    const sched = mySchedules.find(s => s.id === id)
    await api(`/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ cron_expr, enabled: sched.enabled, screen_ids }),
    })
    onRefreshSchedules()
  }

  async function runSchedule(id) {
    await api(`/schedules/${id}/run`, { method: 'POST' })
  }

  async function deleteSchedule(id) {
    if (!confirm('Delete this schedule?')) return
    await api(`/schedules/${id}`, { method: 'DELETE' })
    onRefreshSchedules()
  }

  return (
    <div className={styles.stCard}>
      <div className={styles.stHeader}>
        <div className={styles.stHeaderLeft}>
          <span
            className={`${styles.stChevron} ${open ? styles.stChevronOpen : ''}`}
            onClick={() => setOpen(o => !o)}
          >
            <ChevronIcon />
          </span>
          {editingSt ? (
            <>
              <input
                className={styles.addStInput}
                value={stName}
                onChange={e => setStName(e.target.value)}
                style={{ maxWidth: 200 }}
              />
              <select className={styles.formSelect} value={stCampus} onChange={e => setStCampus(e.target.value)}>
                <option value="">No campus</option>
                {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`} onClick={saveStEdit} disabled={savingSt}>
                {savingSt ? 'Saving…' : 'Save'}
              </button>
              <button className={`${styles.btn} ${styles.btnSmall}`} onClick={() => { setEditingSt(false); setStName(st.name); setStCampus(st.campus_id ?? '') }}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <span className={styles.stName}>{st.name}</span>
              {campus && <span className={styles.stMeta}>{campus.name}</span>}
              {mySchedules.length > 0 && (
                <span className={styles.stMeta}>
                  {mySchedules.filter(s => s.enabled).length}/{mySchedules.length} active
                </span>
              )}
            </>
          )}
        </div>
        <div className={styles.stActions}>
          {!editingSt && (
            <button className={styles.btnIcon} onClick={() => { setEditingSt(true); setOpen(true) }} title="Edit service type">
              <EditIcon />
            </button>
          )}
          <button className={`${styles.btnIcon} ${styles.btnDanger}`} onClick={() => onDelete(st.id)} title="Delete service type">
            <TrashIcon />
          </button>
        </div>
      </div>

      {open && (
        <div className={styles.schedBody}>
          {!pcoConnected && st.pco_service_type_id && (
            <div className={styles.pcoNotice}>
              <div className={styles.pcoNoticeDot} />
              <div>
                <p className={styles.pcoNoticeTitle}>PCO not connected</p>
                <p className={styles.pcoNoticeHint}>This service type has a PCO ID but PCO is not connected. Connect it in Integrations to enable sync.</p>
              </div>
            </div>
          )}
          <div>
            <p className={styles.schedSectionLabel}>Schedules</p>
            {mySchedules.length === 0 && !adding && (
              <p className={styles.emptyHint}>No schedules yet. Add one to automatically fetch data on a recurring basis.</p>
            )}
            <div className={styles.schedList}>
              {mySchedules.map(s => (
                <ScheduleRow
                  key={s.id}
                  schedule={s}
                  screens={screens}
                  onToggle={toggleSchedule}
                  onRun={runSchedule}
                  onDelete={deleteSchedule}
                  onUpdate={updateSchedule}
                />
              ))}
              {adding && (
                <ScheduleForm
                  screens={screens}
                  onSave={addSchedule}
                  onCancel={() => setAdding(false)}
                />
              )}
            </div>
            {!adding && (
              <button className={`${styles.btn} ${styles.btnSmall}`} style={{ marginTop: 10 }} onClick={() => setAdding(true)}>
                <PlusIcon /> Add schedule
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Add service type form ─────────────────────────────────────────────────────

function AddServiceTypeForm({ campuses, onAdd, onCancel }) {
  const [name, setName] = useState('')
  const [campusId, setCampusId] = useState(campuses[0]?.id ?? '')
  const [saving, setSaving] = useState(false)

  async function handleAdd() {
    if (!name.trim()) return
    setSaving(true)
    await onAdd({ name: name.trim(), campus_id: campusId || null })
    setSaving(false)
  }

  return (
    <div className={styles.addStForm}>
      <div className={styles.formGroup}>
        <span className={styles.formLabel}>Name</span>
        <input
          className={styles.addStInput}
          placeholder="e.g. Sunday Morning"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          autoFocus
        />
      </div>
      {campuses.length > 0 && (
        <div className={styles.formGroup}>
          <span className={styles.formLabel}>Campus</span>
          <select className={styles.formSelect} value={campusId} onChange={e => setCampusId(e.target.value)}>
            <option value="">None</option>
            {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}
      <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleAdd} disabled={saving || !name.trim()}>
        {saving ? 'Adding…' : 'Add'}
      </button>
      <button className={styles.btn} onClick={onCancel}>Cancel</button>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Schedules() {
  const [serviceTypes, setServiceTypes] = useState([])
  const [schedules, setSchedules] = useState([])
  const [campuses, setCampuses] = useState([])
  const [screens, setScreens] = useState([])
  const [pcoConnected, setPcoConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [addingType, setAddingType] = useState(false)

  const load = useCallback(async () => {
    try {
      const [sts, scheds, camps, screensData, pcoStatus] = await Promise.all([
        api('/service-types'),
        api('/schedules'),
        api('/campuses'),
        api('/screens'),
        fetch(API + '/api/pco/status', { credentials: 'include' }).then(r => r.json()).catch(() => ({ connected: false })),
      ])
      setServiceTypes(Array.isArray(sts) ? sts : [])
      setSchedules(Array.isArray(scheds) ? scheds : [])
      setCampuses(Array.isArray(camps) ? camps : [])
      setScreens(Array.isArray(screensData) ? screensData : [])
      setPcoConnected(!!pcoStatus.connected)
      setLoading(false)
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function addServiceType({ name, campus_id }) {
    await api('/service-types', {
      method: 'POST',
      body: JSON.stringify({ name, campus_id }),
    })
    setAddingType(false)
    load()
  }

  async function deleteServiceType(id) {
    const hasSchedules = schedules.some(s => s.service_type_id === id)
    const msg = hasSchedules
      ? 'This service type has schedules. Deleting it will also delete its schedules. Continue?'
      : 'Delete this service type?'
    if (!confirm(msg)) return
    await api(`/service-types/${id}`, { method: 'DELETE' })
    load()
  }

  return (
    <AdminLayout title="Services">
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <h2 className={styles.pageTitle}>Services</h2>
          <InfoPopover docsHref="/docs#services">
            Manage service types and automated fetch schedules. Each service type can have multiple
            schedules that automatically pull data from Planning Center on a recurring basis.
          </InfoPopover>
        </div>
        {!addingType && (
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setAddingType(true)}>
            <PlusIcon /> New service type
          </button>
        )}
      </div>

      {!pcoConnected && (
        <div className={styles.pcoNotice}>
          <div className={styles.pcoNoticeDot} />
          <div>
            <p className={styles.pcoNoticeTitle}>Planning Center not connected</p>
            <p className={styles.pcoNoticeHint}>
              Connect your PCO account in the Integrations page to enable automatic data sync.
              You can still create service types and schedules now — they'll activate once connected.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <p className={styles.stateMsg}>Loading…</p>
      ) : error ? (
        <p className={styles.stateMsg} style={{ color: '#f87171' }}>{error}</p>
      ) : (
        <div className={styles.stList}>
          {addingType && (
            <AddServiceTypeForm
              campuses={campuses}
              onAdd={addServiceType}
              onCancel={() => setAddingType(false)}
            />
          )}

          {serviceTypes.length === 0 && !addingType && (
            <p className={styles.stateMsg}>
              No service types yet.{' '}
              <button
                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: 'inherit', fontFamily: 'inherit' }}
                onClick={() => setAddingType(true)}
              >
                Add your first one.
              </button>
            </p>
          )}

          {serviceTypes.map(st => (
            <ServiceTypeCard
              key={st.id}
              st={st}
              schedules={schedules}
              campuses={campuses}
              screens={screens}
              pcoConnected={pcoConnected}
              onDelete={deleteServiceType}
              onRefreshSchedules={load}
            />
          ))}
        </div>
      )}
    </AdminLayout>
  )
}
