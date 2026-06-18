import { useState, useEffect, useCallback } from 'react'
import AdminLayout from './_Layout'
import InfoPopover from '../../components/InfoPopover'
import Modal from '../../components/Modal'
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

function SendIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="22" y1="2" x2="11" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  )
}

function ExternalLinkIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
      <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
    </svg>
  )
}

function RefreshIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  )
}

function formatPlanDate(sortDate) {
  if (!sortDate) return ''
  try {
    return new Date(sortDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  } catch { return '' }
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

// ── Manual team builder ───────────────────────────────────────────────────────

function ManualTeamBuilder({ serviceTypeId, people }) {
  const [assignments, setAssignments] = useState([])
  const [positions, setPositions] = useState([])
  const [loading, setLoading] = useState(true)
  const [addPersonId, setAddPersonId] = useState('')

  const loadAssignments = useCallback(async () => {
    setLoading(true)
    const [data, pos] = await Promise.all([
      api(`/service-types/${serviceTypeId}/manual-assignments`),
      api('/position-types'),
    ])
    setAssignments(Array.isArray(data) ? data : [])
    setPositions(Array.isArray(pos) ? pos : [])
    setLoading(false)
  }, [serviceTypeId])

  useEffect(() => { loadAssignments() }, [loadAssignments])

  const assignedIds = new Set(assignments.map(a => a.person_id).filter(Boolean))
  const available = people.filter(p => !assignedIds.has(p.id))

  async function handleAdd() {
    if (!addPersonId) return
    const person = people.find(p => p.id === Number(addPersonId))
    const defaultPosition = person?.position_override ?? person?.position ?? null
    await api(`/service-types/${serviceTypeId}/manual-assignments`, {
      method: 'POST',
      body: JSON.stringify({ person_id: Number(addPersonId), position: defaultPosition }),
    })
    setAddPersonId('')
    loadAssignments()
  }

  async function handleUpdatePosition(a, position) {
    await api(`/service-types/${serviceTypeId}/manual-assignments/${a.id}`, {
      method: 'PUT',
      body: JSON.stringify({ slot: a.slot, position: position || null }),
    })
    loadAssignments()
  }

  async function handleRemove(id) {
    await api(`/service-types/${serviceTypeId}/manual-assignments/${id}`, { method: 'DELETE' })
    loadAssignments()
  }

  if (loading) return <p className={styles.emptyHint}>Loading…</p>

  return (
    <div>
      <p className={styles.schedSectionLabel}>Team</p>
      <p className={styles.manualHint}>
        Assign a position to each person — automation rules will use it to assign mic and IEM labels when the schedule runs.
      </p>
      {assignments.length === 0 && (
        <p className={styles.emptyHint}>No team members yet. Add people below.</p>
      )}
      <div className={styles.manualList}>
        {assignments.map((a, i) => (
          <div key={a.id} className={styles.manualRow}>
            <span className={styles.manualSlotNum}>{i + 1}</span>
            <span className={styles.manualName}>{a.person_name ?? '—'}</span>
            <select
              className={styles.formSelect}
              style={{ minWidth: 140 }}
              value={a.position ?? ''}
              onChange={e => handleUpdatePosition(a, e.target.value)}
            >
              <option value="">No position</option>
              {positions.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              {a.position && !positions.some(p => p.name === a.position) && (
                <option value={a.position}>{a.position}</option>
              )}
            </select>
            <button className={`${styles.btnIcon} ${styles.btnDanger}`} onClick={() => handleRemove(a.id)}>
              <TrashIcon />
            </button>
          </div>
        ))}
      </div>
      <div className={styles.addPersonRow}>
        <select
          className={styles.formSelect}
          value={addPersonId}
          onChange={e => setAddPersonId(e.target.value)}
        >
          <option value="">Add person…</option>
          {available.map(p => (
            <option key={p.id} value={p.id}>{p.name_override ?? p.name}</option>
          ))}
        </select>
        <button
          className={`${styles.btn} ${styles.btnSmall} ${styles.btnPrimary}`}
          onClick={handleAdd}
          disabled={!addPersonId}
        >
          Add
        </button>
      </div>
    </div>
  )
}

// ── PCO card body (upcoming plans + team preview) ────────────────────────────

function PcoCardBody({ st, pcoConnected }) {
  const [plans, setPlans]               = useState(null)
  const [plansLoading, setPlansLoading] = useState(false)
  const [plansError, setPlansError]     = useState(null)
  const [previewPlanId, setPreviewPlanId] = useState(null)
  const [preview, setPreview]           = useState(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    if (pcoConnected && st.pco_service_type_id) { loadPlans() }
  }, [pcoConnected, st.pco_service_type_id])

  async function loadPlans() {
    setPlansLoading(true); setPlansError(null)
    try {
      const r = await fetch(`/api/pco/service-types/${st.pco_service_type_id}/plans`, { credentials: 'include' })
      const data = await r.json()
      if (data.error) throw new Error(data.error)
      setPlans(data.data ?? [])
    } catch (e) { setPlansError(e.message) }
    setPlansLoading(false)
  }

  async function loadPreview(planId) {
    setPreviewPlanId(planId); setPreviewLoading(true); setPreview(null)
    try {
      const r = await fetch(
        `/api/pco/service-types/${st.pco_service_type_id}/plans/${planId}/team-preview?service_type_id=${st.id}`,
        { credentials: 'include' }
      )
      const data = await r.json()
      setPreview(data.preview ?? [])
    } catch { setPreview([]) }
    setPreviewLoading(false)
  }

  if (!pcoConnected) return null
  if (!st.pco_service_type_id) {
    return (
      <div className={styles.pcoBodyEmpty}>
        <p className={styles.emptyHint}>No PCO service type linked. Edit this service type to connect it to a Planning Center service.</p>
      </div>
    )
  }

  return (
    <div className={styles.pcoBody}>
      {st.pco_service_type_name && (
        <p className={styles.pcoLinkedLabel}>
          Linked to Planning Center: <strong>{st.pco_service_type_name}</strong>
        </p>
      )}

      <p className={styles.schedSectionLabel} style={{ marginTop: st.pco_service_type_name ? 14 : 0 }}>Upcoming plans</p>

      {plansLoading && <p className={styles.emptyHint}>Loading plans…</p>}
      {plansError  && <p className={styles.emptyHint} style={{ color: 'var(--red)' }}>{plansError} <button className={styles.btnLink} onClick={loadPlans}>Retry</button></p>}
      {plans && plans.length === 0 && <p className={styles.emptyHint}>No upcoming plans found in Planning Center for this service.</p>}

      {plans && plans.length > 0 && (
        <div className={styles.planList}>
          {plans.map(plan => {
            const title = plan.attributes?.title || '(No title)'
            const date  = formatPlanDate(plan.attributes?.sort_date)
            const isSelected = previewPlanId === plan.id
            return (
              <div key={plan.id} className={styles.planRow}>
                <div className={styles.planRowLeft}>
                  <span className={styles.planTitle}>{title}</span>
                  {date && <span className={styles.planDate}>{date}</span>}
                </div>
                <button
                  className={`${styles.btnIcon} ${isSelected ? styles.btnIconActive : ''}`}
                  onClick={() => isSelected ? (setPreviewPlanId(null), setPreview(null)) : loadPreview(plan.id)}
                >
                  {isSelected ? 'Hide' : 'Preview team'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {previewLoading && <p className={styles.emptyHint}>Loading team preview…</p>}

      {preview && !previewLoading && (
        <div className={styles.previewBox}>
          <p className={styles.schedSectionLabel}>Team preview</p>
          {preview.length === 0 && (
            <p className={styles.emptyHint}>No team members found (or all declined).</p>
          )}
          {preview.map((m, i) => (
            <div key={i} className={styles.previewRow}>
              {m.photo ? (
                <img src={m.photo} alt="" className={styles.previewAvatar} />
              ) : (
                <div className={styles.previewAvatarInitials}>
                  {(m.displayName || m.name || '?')[0].toUpperCase()}
                </div>
              )}
              <div className={styles.previewInfo}>
                <span className={styles.previewName}>{m.displayName}</span>
                <span className={styles.previewPos}>{m.position || 'No position'}</span>
              </div>
              {m.inBeacon && <span className={styles.previewInBeacon}>In Beacon</span>}
              {m.matched === true && (
                <span className={styles.previewMatched}>
                  {m.micLabel ? `Mic: ${m.micLabel}` : ''}
                  {m.micLabel && m.iemLabel ? ' · ' : ''}
                  {m.iemLabel ? `IEM: ${m.iemLabel}` : ''}
                </span>
              )}
              {m.matched === false && (
                <span className={styles.previewNoMatch}>No rule matched</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
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
          <span className={styles.formLabel}>Screens</span>
          <details className={styles.screenDropdown}>
            <summary className={styles.screenDropdownSummary}>
              {selectedScreenIds.length === 0
                ? 'No screens selected'
                : `${selectedScreenIds.length} screen${selectedScreenIds.length !== 1 ? 's' : ''} selected`}
            </summary>
            <div className={styles.screenDropdownList}>
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
          </details>
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

// ── Push modal ────────────────────────────────────────────────────────────────

function PushModal({ st, screens, scheduleScreenIds, onClose }) {
  const isPco = (st.mode ?? 'manual') !== 'manual'
  const pushableScreens = screens.filter(s => !s.mirror_screen_id)
  const [selectedIds, setSelectedIds] = useState(() => {
    if (scheduleScreenIds.length > 0) {
      const valid = scheduleScreenIds.filter(id => pushableScreens.some(s => s.id === id))
      if (valid.length > 0) return valid
    }
    return []
  })
  const [pushing, setPushing]       = useState(false)
  const [result, setResult]         = useState(null)
  const [error, setError]           = useState(null)
  // PCO plan selection
  const [planMode, setPlanMode]     = useState('today')  // 'today' | 'pick'
  const [plans, setPlans]           = useState(null)
  const [plansLoading, setPlansLoading] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState('')

  useEffect(() => {
    if (isPco && st.pco_service_type_id && planMode === 'pick' && !plans) {
      setPlansLoading(true)
      fetch(`/api/pco/service-types/${st.pco_service_type_id}/plans`, { credentials: 'include' })
        .then(r => r.json())
        .then(data => { setPlans(data.data ?? []); setPlansLoading(false) })
        .catch(() => { setPlans([]); setPlansLoading(false) })
    }
  }, [isPco, st.pco_service_type_id, planMode, plans])

  function toggle(id) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  async function handlePush() {
    setPushing(true); setError(null)
    try {
      const body = { screen_ids: selectedIds }
      if (isPco && planMode === 'pick' && selectedPlanId) body.plan_id = selectedPlanId
      const r = await api(`/service-types/${st.id}/push`, {
        method: 'POST',
        body: JSON.stringify(body),
      })
      if (r.error) throw new Error(r.error)
      setResult(r)
    } catch (err) { setError(err.message) }
    setPushing(false)
  }

  const canPush = selectedIds.length > 0 && pushableScreens.length > 0
    && (!isPco || planMode === 'today' || !!selectedPlanId)

  return (
    <Modal
      title={`Push "${st.name}"`}
      onClose={onClose}
      footer={
        result ? (
          <button className={`${styles.btn} ${styles.btnSmall}`} onClick={onClose}>Close</button>
        ) : (
          <>
            <button className={`${styles.btn} ${styles.btnSmall}`} onClick={onClose}>Cancel</button>
            <button
              className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`}
              onClick={handlePush}
              disabled={pushing || !canPush}
            >
              {pushing ? 'Pushing…' : `Push to ${selectedIds.length} screen${selectedIds.length !== 1 ? 's' : ''}`}
            </button>
          </>
        )
      }
    >
      {result ? (
        result.pushed === 0 ? (
          <p className={styles.pushError}>
            Push succeeded but no musicians were sent — no team members matched any automation rules. Check your rules on the Automation page.
          </p>
        ) : (
          <p className={styles.pushSuccess}>
            Pushed {result.pushed} musician{result.pushed !== 1 ? 's' : ''} to {result.screens} screen{result.screens !== 1 ? 's' : ''}.
          </p>
        )
      ) : (
        <>
          {error && <p className={styles.pushError}>{error}</p>}

          {isPco && (
            <div className={styles.pushPlanSection}>
              <p className={styles.pushSectionLabel}>Which plan?</p>
              <div className={styles.pushPlanTabs}>
                <button
                  className={`${styles.pushPlanTab} ${planMode === 'today' ? styles.pushPlanTabActive : ''}`}
                  onClick={() => setPlanMode('today')}
                >Today&apos;s plan</button>
                <button
                  className={`${styles.pushPlanTab} ${planMode === 'pick' ? styles.pushPlanTabActive : ''}`}
                  onClick={() => setPlanMode('pick')}
                >Choose a plan</button>
              </div>
              {planMode === 'pick' && (
                <div style={{ marginTop: 10 }}>
                  {plansLoading && <p className={styles.pushHint}>Loading plans…</p>}
                  {!plansLoading && plans && plans.length === 0 && (
                    <p className={styles.pushHint}>No upcoming plans found in Planning Center.</p>
                  )}
                  {!plansLoading && plans && plans.length > 0 && (
                    <select
                      className={styles.formSelect}
                      value={selectedPlanId}
                      onChange={e => setSelectedPlanId(e.target.value)}
                    >
                      <option value="">Select a plan…</option>
                      {plans.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.attributes?.title || '(No title)'} — {formatPlanDate(p.attributes?.sort_date)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>
          )}

          <p className={styles.pushSectionLabel}>Screens</p>
          <p className={styles.pushHint}>
            {scheduleScreenIds.length > 0
              ? 'Screens from your schedule are pre-selected. Add or remove as needed.'
              : 'Choose which screens to push to.'}
          </p>
          {pushableScreens.length === 0 ? (
            <p className={styles.pushHint}>No screens available. Create a screen on the Screens page first.</p>
          ) : (
            <div className={styles.pushScreenList}>
              {pushableScreens.map(s => (
                <label key={s.id} className={styles.pushScreenRow}>
                  <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => toggle(s.id)} />
                  <span className={styles.pushScreenName}>{s.name}</span>
                  {s.campus_name && <span className={styles.pushScreenCampus}>{s.campus_name}</span>}
                  <span className={s.is_active ? styles.pushScreenActive : styles.pushScreenInactive}>
                    {s.is_active ? 'Live' : 'Offline'}
                  </span>
                </label>
              ))}
            </div>
          )}
        </>
      )}
    </Modal>
  )
}

// ── Service type card ─────────────────────────────────────────────────────────

function ServiceTypeCard({ st, schedules, campuses, screens, people, pcoConnected, onDelete, onRefreshSchedules }) {
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [editingSt, setEditingSt] = useState(false)
  const [stName, setStName] = useState(st.name)
  const [stCampus, setStCampus] = useState(st.campus_id ?? '')
  const [stMode, setStMode] = useState(st.mode ?? 'manual')
  const [stPcoId, setStPcoId] = useState(st.pco_service_type_id ?? '')
  const [stPcoName, setStPcoName] = useState(st.pco_service_type_name ?? '')
  const [pcoTypes, setPcoTypes] = useState(null)
  const [pcoTypesLoading, setPcoTypesLoading] = useState(false)
  const [savingSt, setSavingSt] = useState(false)
  const [pushOpen, setPushOpen] = useState(false)

  const mySchedules = schedules.filter(s => s.service_type_id === st.id)
  const campus = campuses.find(c => c.id === st.campus_id)
  const isManual = (st.mode ?? 'manual') === 'manual'

  async function loadPcoTypesForEdit() {
    if (pcoTypes !== null) return
    setPcoTypesLoading(true)
    try {
      const r = await fetch('/api/pco/service-types', { credentials: 'include' })
      const data = await r.json()
      setPcoTypes(data.data ?? [])
    } catch { setPcoTypes([]) }
    setPcoTypesLoading(false)
  }

  async function saveStEdit() {
    setSavingSt(true)
    await api(`/service-types/${st.id}`, {
      method: 'PUT',
      body: JSON.stringify({
        name: stName,
        campus_id: stCampus || null,
        pco_service_type_id: stMode === 'pco' ? (stPcoId || null) : null,
        pco_service_type_name: stMode === 'pco' ? (stPcoName || null) : null,
        mode: stMode,
      }),
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
    <>
    <div className={styles.stCard}>
      <div
        className={styles.stHeader}
        onClick={() => !editingSt && setOpen(o => !o)}
        style={{ cursor: editingSt ? 'default' : 'pointer' }}
      >
        <div className={styles.stHeaderLeft}>
          <span className={`${styles.stChevron} ${open ? styles.stChevronOpen : ''}`}>
            <ChevronIcon />
          </span>
          {editingSt ? (
            <>
              <div className={styles.formGroup}>
                <span className={styles.formLabel}>Name</span>
                <input
                  className={styles.addStInput}
                  value={stName}
                  onChange={e => setStName(e.target.value)}
                  style={{ maxWidth: 200 }}
                />
              </div>
              <div className={styles.formGroup}>
                <span className={styles.formLabel}>Mode</span>
                <select className={styles.formSelect} value={stMode} onChange={e => {
                  setStMode(e.target.value)
                  if (e.target.value === 'pco' && pcoConnected) loadPcoTypesForEdit()
                }}>
                  <option value="manual">Manual</option>
                  {pcoConnected && <option value="pco">PCO Sync</option>}
                </select>
              </div>
              {stMode === 'pco' && pcoConnected && (
                <div className={styles.formGroup} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
                  <span className={styles.formLabel}>PCO service type</span>
                  {pcoTypesLoading && <span className={styles.formLabel}>Loading…</span>}
                  {!pcoTypesLoading && pcoTypes && pcoTypes.length > 0 && (
                    <select
                      className={styles.formSelect}
                      value={stPcoId}
                      onChange={e => {
                        const picked = pcoTypes.find(t => t.id === e.target.value)
                        setStPcoId(e.target.value)
                        setStPcoName(picked?.attributes?.name ?? '')
                        if (picked && !stName) setStName(picked.attributes?.name ?? '')
                      }}
                    >
                      <option value="">Select from PCO…</option>
                      {pcoTypes.map(t => <option key={t.id} value={t.id}>{t.attributes?.name}</option>)}
                    </select>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
                    <input
                      className={styles.addStInput}
                      value={stPcoId}
                      onChange={e => { setStPcoId(e.target.value); setStPcoName('') }}
                      placeholder="Or type PCO service type ID…"
                      style={{ flex: 1 }}
                    />
                    <a href="/docs#pco-service-id" target="_blank" rel="noreferrer" className={styles.btnLink} title="Where to find the PCO service type ID">
                      ? <ExternalLinkIcon />
                    </a>
                  </div>
                </div>
              )}
              {campuses.length > 0 && (
                <div className={styles.formGroup}>
                  <span className={styles.formLabel}>Campus</span>
                  <select className={styles.formSelect} value={stCampus} onChange={e => setStCampus(e.target.value)}>
                    <option value="">No campus</option>
                    {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              <div className={styles.formGroup}>
                <span className={styles.formLabel}>&nbsp;</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`} onClick={saveStEdit} disabled={savingSt}>
                    {savingSt ? 'Saving…' : 'Save'}
                  </button>
                  <button className={`${styles.btn} ${styles.btnSmall}`} onClick={() => { setEditingSt(false); setStName(st.name); setStCampus(st.campus_id ?? ''); setStMode(st.mode ?? 'manual'); setStPcoId(st.pco_service_type_id ?? ''); setStPcoName(st.pco_service_type_name ?? '') }}>
                    Cancel
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <span className={styles.stName}>{st.name}</span>
              <span className={isManual ? styles.modeBadgeManual : styles.modeBadgePco}>
                {isManual ? 'Manual' : 'PCO'}
              </span>
              {campus && <span className={styles.stMeta}>{campus.name}</span>}
              {mySchedules.length > 0 && (
                <span className={styles.stMeta}>
                  {mySchedules.filter(s => s.enabled).length}/{mySchedules.length} active
                </span>
              )}
            </>
          )}
        </div>
        <div className={styles.stActions} onClick={e => e.stopPropagation()}>
          {!editingSt && (
            <>
              <button className={styles.btnIcon} onClick={() => setPushOpen(true)} title="Push to screens now">
                <SendIcon /> Push
              </button>
              <button className={styles.btnIcon} onClick={() => { setEditingSt(true); setOpen(true) }} title="Edit service type">
                <EditIcon />
              </button>
            </>
          )}
          <button className={`${styles.btnIcon} ${styles.btnDanger}`} onClick={() => onDelete(st.id)} title="Delete service type">
            <TrashIcon />
          </button>
        </div>
      </div>

      {open && (
        <div className={styles.schedBody}>
          {!isManual && !pcoConnected && (
            <div className={styles.pcoNotice}>
              <div className={styles.pcoNoticeDot} />
              <div>
                <p className={styles.pcoNoticeTitle}>PCO not connected</p>
                <p className={styles.pcoNoticeHint}>Connect your Planning Center account in the Integrations page to enable sync.</p>
              </div>
            </div>
          )}

          {!isManual && pcoConnected && (
            <PcoCardBody st={st} pcoConnected={pcoConnected} />
          )}

          {isManual && (
            <ManualTeamBuilder
              serviceTypeId={st.id}
              people={people}
            />
          )}

          <div>
            <p className={styles.schedSectionLabel}>Schedules</p>
            {mySchedules.length === 0 && !adding && (
              <p className={styles.emptyHint}>No schedules yet. Add one to automatically push this team to screens on a recurring basis.</p>
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
    {pushOpen && (
      <PushModal
        st={st}
        screens={screens}
        scheduleScreenIds={[...new Set(mySchedules.flatMap(s => {
          try { return JSON.parse(s.screen_ids || '[]') } catch { return [] }
        }))]}
        onClose={() => setPushOpen(false)}
      />
    )}
    </>
  )
}

// ── Add service type modal ────────────────────────────────────────────────────

function AddServiceTypeModal({ campuses, pcoConnected, onAdd, onCancel }) {
  const [mode, setMode] = useState(pcoConnected ? 'pco' : 'manual')
  const [name, setName] = useState('')
  const [campusId, setCampusId] = useState(campuses[0]?.id ?? '')
  const [saving, setSaving] = useState(false)
  // PCO tab
  const [pcoTypes, setPcoTypes] = useState(null)
  const [pcoLoading, setPcoLoading] = useState(false)
  const [pcoError, setPcoError] = useState(null)
  const [selectedPcoType, setSelectedPcoType] = useState(null)
  const [manualPcoId, setManualPcoId] = useState('')

  useEffect(() => {
    if (mode === 'pco' && pcoConnected && !pcoTypes) { loadPcoTypes() }
  }, [mode, pcoConnected])

  async function loadPcoTypes() {
    setPcoLoading(true); setPcoError(null)
    try {
      const r = await fetch('/api/pco/service-types', { credentials: 'include' })
      const data = await r.json()
      if (data.error) throw new Error(data.error)
      setPcoTypes(data.data ?? [])
    } catch (e) { setPcoError(e.message) }
    setPcoLoading(false)
  }

  function selectPcoType(t) {
    setSelectedPcoType(t)
    setManualPcoId('')
    if (!name) setName(t.attributes?.name ?? '')
  }

  const canSave = mode === 'manual'
    ? !!name.trim()
    : !!(selectedPcoType || manualPcoId.trim())

  async function handleSave() {
    if (!canSave) return
    const pcoId   = mode === 'pco' ? (selectedPcoType?.id ?? (manualPcoId || null)) : null
    const pcoName = mode === 'pco' ? (selectedPcoType?.attributes?.name ?? null) : null
    const finalName = name.trim() || pcoName || ''
    if (!finalName) return
    setSaving(true)
    await onAdd({ name: finalName, campus_id: campusId || null, mode, pco_service_type_id: pcoId, pco_service_type_name: pcoName })
    setSaving(false)
  }

  return (
    <Modal
      title="New service type"
      onClose={onCancel}
      width={560}
      footer={
        <>
          <button className={`${styles.btn} ${styles.btnSmall}`} onClick={onCancel}>Cancel</button>
          <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`} onClick={handleSave} disabled={saving || !canSave}>
            {saving ? 'Adding…' : 'Add service type'}
          </button>
        </>
      }
    >
      {/* Mode tabs */}
      <div className={styles.modalModeTabs}>
        <button
          className={`${styles.modeTab} ${mode === 'manual' ? styles.modeTabActive : ''}`}
          onClick={() => setMode('manual')}
        >Manual</button>
        <button
          className={`${styles.modeTab} ${mode === 'pco' ? styles.modeTabActive : ''}`}
          onClick={() => setMode('pco')}
          disabled={!pcoConnected}
          title={!pcoConnected ? 'Connect Planning Center in Integrations first' : ''}
        >PCO Sync{!pcoConnected && ' (not connected)'}</button>
      </div>

      {mode === 'manual' && (
        <div className={styles.modalSection}>
          <label className={styles.modalLabel}>Service name</label>
          <input
            className={styles.addStInput}
            placeholder="e.g. Sunday Morning"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            autoFocus
          />
        </div>
      )}

      {mode === 'pco' && (
        <div className={styles.modalSection}>
          <label className={styles.modalLabel}>Choose a Planning Center service</label>
          {pcoLoading && <p className={styles.emptyHint}>Loading your PCO services…</p>}
          {pcoError && (
            <p className={styles.emptyHint} style={{ color: 'var(--red)' }}>
              {pcoError} <button className={styles.btnLink} onClick={loadPcoTypes}><RefreshIcon /> Retry</button>
            </p>
          )}
          {!pcoLoading && pcoTypes && pcoTypes.length === 0 && (
            <p className={styles.emptyHint}>No service types found in Planning Center.</p>
          )}
          {!pcoLoading && pcoTypes && pcoTypes.length > 0 && (
            <div className={styles.pcoTypeList}>
              {pcoTypes.map(t => (
                <button
                  key={t.id}
                  className={`${styles.pcoTypeRow} ${selectedPcoType?.id === t.id ? styles.pcoTypeRowSelected : ''}`}
                  onClick={() => selectPcoType(t)}
                >
                  <span className={styles.pcoTypeName}>{t.attributes?.name}</span>
                  {selectedPcoType?.id === t.id && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className={styles.modalDivider}>
            <span>or enter PCO ID manually</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              className={styles.addStInput}
              placeholder="PCO service type ID (numbers only)"
              value={manualPcoId}
              onChange={e => { setManualPcoId(e.target.value); setSelectedPcoType(null) }}
              style={{ flex: 1 }}
            />
            <a href="/docs#pco-service-id" target="_blank" rel="noreferrer" className={styles.pcoIdHelpLink} title="Where to find your PCO service type ID">
              ? <ExternalLinkIcon />
            </a>
          </div>

          {(selectedPcoType || manualPcoId.trim()) && (
            <div className={styles.modalSection} style={{ marginTop: 16 }}>
              <label className={styles.modalLabel}>Service name in Beacon</label>
              <input
                className={styles.addStInput}
                placeholder={selectedPcoType?.attributes?.name ?? 'e.g. Sunday Morning'}
                value={name}
                onChange={e => setName(e.target.value)}
              />
              <p className={styles.modalHint}>Leave blank to use the PCO service name.</p>
            </div>
          )}
        </div>
      )}

      {campuses.length > 0 && (
        <div className={styles.modalSection}>
          <label className={styles.modalLabel}>Campus (optional)</label>
          <select className={styles.formSelect} value={campusId} onChange={e => setCampusId(e.target.value)}>
            <option value="">No campus</option>
            {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}
    </Modal>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Schedules() {
  const [serviceTypes, setServiceTypes] = useState([])
  const [schedules, setSchedules] = useState([])
  const [campuses, setCampuses] = useState([])
  const [screens, setScreens] = useState([])
  const [people, setPeople] = useState([])
  const [pcoConnected, setPcoConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [addingType, setAddingType] = useState(false)

  const load = useCallback(async () => {
    try {
      const [sts, scheds, camps, screensData, peopleData, pcoStatus] = await Promise.all([
        api('/service-types'),
        api('/schedules'),
        api('/campuses'),
        api('/screens'),
        api('/people'),
        fetch(API + '/api/pco/status', { credentials: 'include' }).then(r => r.json()).catch(() => ({ connected: false })),
      ])
      setServiceTypes(Array.isArray(sts) ? sts : [])
      setSchedules(Array.isArray(scheds) ? scheds : [])
      setCampuses(Array.isArray(camps) ? camps : [])
      setScreens(Array.isArray(screensData) ? screensData : [])
      setPeople(Array.isArray(peopleData) ? peopleData : [])
      setPcoConnected(!!pcoStatus.connected)
      setLoading(false)
    } catch (e) {
      setError(e.message)
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function addServiceType({ name, campus_id, mode, pco_service_type_id, pco_service_type_name }) {
    await api('/service-types', {
      method: 'POST',
      body: JSON.stringify({ name, campus_id, mode, pco_service_type_id, pco_service_type_name }),
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

  const hasPcoTypes = serviceTypes.some(st => !st.mode || st.mode === 'pco')

  return (
    <AdminLayout title="Services">
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <h2 className={styles.pageTitle}>Services</h2>
          <InfoPopover title="Services & Schedules" docsHref="/docs#services">
            <p>A <strong>service type</strong> is a recurring service at a campus — Sunday Morning, Wednesday Night, etc. Each one has a mode that determines where its team roster comes from.</p>
            <p><strong>PCO mode</strong> pulls your team automatically from the Planning Center plan that matches today's date. Requires a PCO connection and your PCO service type ID (found in the PCO URL for that service type).</p>
            <p><strong>Manual mode</strong> lets you predefine a fixed team roster right here — no PCO needed. Great for a consistent weekly core team or services that aren't in Planning Center.</p>
            <p>Each service type can have an <strong>auto-push schedule</strong> — pick a day and time and Beacon will load the team, run your automation rules to assign mics and IEMs, and push assignments to your selected screens automatically. Use the <strong>Push</strong> button at any time to trigger it manually.</p>
          </InfoPopover>
        </div>
        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => setAddingType(true)}>
          <PlusIcon /> New service type
        </button>
      </div>

      {!pcoConnected && hasPcoTypes && (
        <div className={styles.pcoNotice}>
          <div className={styles.pcoNoticeDot} />
          <div>
            <p className={styles.pcoNoticeTitle}>Planning Center not connected</p>
            <p className={styles.pcoNoticeHint}>
              Connect your PCO account in the Integrations page to enable automatic data sync for PCO service types.
            </p>
          </div>
        </div>
      )}

      {addingType && (
        <AddServiceTypeModal
          campuses={campuses}
          pcoConnected={pcoConnected}
          onAdd={addServiceType}
          onCancel={() => setAddingType(false)}
        />
      )}

      {loading ? (
        <p className={styles.stateMsg}>Loading…</p>
      ) : error ? (
        <p className={styles.stateMsg} style={{ color: '#f87171' }}>{error}</p>
      ) : (
        <div className={styles.stList}>
          {false && null /* add modal renders outside list */}

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
              people={people}
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
