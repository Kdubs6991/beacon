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
  const [viewPlan, setViewPlan]         = useState(null)
  const [viewPreview, setViewPreview]   = useState(null)
  const [viewLoading, setViewLoading]   = useState(false)
  const [viewTeamFilter, setViewTeamFilter] = useState('all')

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

  async function openViewOverlay(plan) {
    setViewPlan(plan); setViewPreview(null); setViewLoading(true); setViewTeamFilter('all')
    try {
      const r = await fetch(
        `/api/pco/service-types/${st.pco_service_type_id}/plans/${plan.id}/team-preview?service_type_id=${st.id}`,
        { credentials: 'include' }
      )
      const data = await r.json()
      setViewPreview(data.preview ?? [])
    } catch { setViewPreview([]) }
    setViewLoading(false)
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
            return (
              <div key={plan.id} className={styles.planRow}>
                <div className={styles.planRowLeft}>
                  <span className={styles.planTitle}>{title}</span>
                  {date && <span className={styles.planDate}>{date}</span>}
                </div>
                <button
                  className={styles.btnIcon}
                  onClick={() => openViewOverlay(plan)}
                  title="View plan details"
                >View team</button>
              </div>
            )
          })}
        </div>
      )}

      {/* Plan view overlay */}
      {viewPlan && (
        <div className={styles.planViewOverlay} onClick={() => setViewPlan(null)}>
          <div className={styles.planViewModal} onClick={e => e.stopPropagation()}>
            <div className={styles.planViewHeader}>
              <div>
                <h3 className={styles.planViewTitle}>{viewPlan.attributes?.title || '(No title)'}</h3>
                <p className={styles.planViewDate}>{formatPlanDate(viewPlan.attributes?.sort_date)}</p>
              </div>
              <button className={styles.planViewClose} onClick={() => setViewPlan(null)}>✕</button>
            </div>

            {viewLoading && <p className={styles.emptyHint} style={{ padding: '12px 0' }}>Loading team…</p>}

            {viewPreview && !viewLoading && (() => {
              const teams = [...new Set(viewPreview.map(m => m.teamName).filter(Boolean))]
              const filtered = viewTeamFilter === 'all' ? viewPreview : viewPreview.filter(m => m.teamName === viewTeamFilter)
              return (
                <>
                  {teams.length > 1 && (
                    <div className={styles.planViewTeamTabs}>
                      <button
                        className={`${styles.planViewTeamTab} ${viewTeamFilter === 'all' ? styles.planViewTeamTabActive : ''}`}
                        onClick={() => setViewTeamFilter('all')}
                      >All</button>
                      {teams.map(t => (
                        <button
                          key={t}
                          className={`${styles.planViewTeamTab} ${viewTeamFilter === t ? styles.planViewTeamTabActive : ''}`}
                          onClick={() => setViewTeamFilter(t)}
                        >{t}</button>
                      ))}
                    </div>
                  )}
                  <div className={styles.planViewBody}>
                    {filtered.length === 0 && <p className={styles.emptyHint}>No team members in this team.</p>}
                    {filtered.map((m, i) => (
                      <div key={i} className={styles.planViewRow}>
                        {m.photo
                          ? <img src={m.photo} alt="" className={styles.planViewAvatar} />
                          : <div className={styles.planViewAvatarInitials}>{(m.displayName || m.name || '?')[0].toUpperCase()}</div>
                        }
                        <div className={styles.planViewInfo}>
                          <span className={styles.planViewName}>{m.displayName ?? m.name}</span>
                          <span className={styles.planViewPos}>{m.position || 'No position'}{m.teamName ? ` · ${m.teamName}` : ''}</span>
                        </div>
                        {m.inBeacon && <span className={styles.previewInBeacon}>In Beacon</span>}
                      </div>
                    ))}
                  </div>
                </>
              )
            })()}
          </div>
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
  const [planMode, setPlanMode]     = useState('today')  // 'today' | 'nextup' | 'pick'
  const [plans, setPlans]           = useState(null)
  const [plansLoading, setPlansLoading] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState('')

  useEffect(() => {
    if (isPco && st.pco_service_type_id && (planMode === 'pick' || planMode === 'nextup') && !plans) {
      setPlansLoading(true)
      fetch(`/api/pco/service-types/${st.pco_service_type_id}/plans`, { credentials: 'include' })
        .then(r => r.json())
        .then(data => {
          const list = data.data ?? []
          setPlans(list)
          setPlansLoading(false)
          if (planMode === 'nextup' && list.length > 0) {
            setSelectedPlanId(list[0].id)
          }
        })
        .catch(() => { setPlans([]); setPlansLoading(false) })
    }
    if (planMode === 'nextup' && plans && plans.length > 0 && !selectedPlanId) {
      setSelectedPlanId(plans[0].id)
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

  function handleSetPlanMode(mode) {
    setPlanMode(mode)
    if (mode === 'today') setSelectedPlanId('')
  }

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
            Push succeeded but no people were sent — no team members matched any automation rules. Check your rules on the Automation page.
          </p>
        ) : (
          <p className={styles.pushSuccess}>
            Pushed {result.pushed} {result.pushed !== 1 ? 'people' : 'person'} to {result.screens} screen{result.screens !== 1 ? 's' : ''}.
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
                  onClick={() => handleSetPlanMode('today')}
                >Today&apos;s plan</button>
                <button
                  className={`${styles.pushPlanTab} ${planMode === 'nextup' ? styles.pushPlanTabActive : ''}`}
                  onClick={() => handleSetPlanMode('nextup')}
                >Next up</button>
                <button
                  className={`${styles.pushPlanTab} ${planMode === 'pick' ? styles.pushPlanTabActive : ''}`}
                  onClick={() => handleSetPlanMode('pick')}
                >Choose a plan</button>
              </div>
              {(planMode === 'nextup' || planMode === 'pick') && (
                <div style={{ marginTop: 10 }}>
                  {plansLoading && <p className={styles.pushHint}>Loading plans…</p>}
                  {!plansLoading && plans && plans.length === 0 && (
                    <p className={styles.pushHint}>No upcoming plans found in Planning Center.</p>
                  )}
                  {!plansLoading && plans && plans.length > 0 && planMode === 'nextup' && (
                    <p className={styles.pushHint}>
                      Will push: <strong>{plans[0].attributes?.title || '(No title)'}</strong> — {formatPlanDate(plans[0].attributes?.sort_date)}
                    </p>
                  )}
                  {!plansLoading && plans && plans.length > 0 && planMode === 'pick' && (
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
  const [stTeamIds, setStTeamIds] = useState(() => { try { return st.pco_team_ids ? JSON.parse(st.pco_team_ids) : [] } catch { return [] } })
  const [pcoTypes, setPcoTypes] = useState(null)
  const [pcoTypesLoading, setPcoTypesLoading] = useState(false)
  const [pcoTeams, setPcoTeams] = useState(null)
  const [pcoTeamsLoading, setPcoTeamsLoading] = useState(false)
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

  async function loadPcoTeamsForEdit(pcoId) {
    if (!pcoId) return
    setPcoTeamsLoading(true)
    try {
      const r = await fetch(`/api/pco/service-types/${pcoId}/teams`, { credentials: 'include' })
      const data = await r.json()
      setPcoTeams(data.data ?? [])
    } catch { setPcoTeams([]) }
    setPcoTeamsLoading(false)
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
        pco_team_ids: stMode === 'pco' && stTeamIds.length > 0 ? stTeamIds : null,
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
          <span className={`${styles.stChevron} ${open || editingSt ? styles.stChevronOpen : ''}`}>
            <ChevronIcon />
          </span>
          <span className={styles.stName}>{st.name}</span>
          {!editingSt && (
            <>
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
          {editingSt && <span className={styles.stEditingBadge}>Editing</span>}
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

      {editingSt && (
        <div className={styles.stEditForm}>
          <div className={styles.stEditRow}>
            <div className={styles.stEditField}>
              <label className={styles.formLabel}>Name</label>
              <input
                className={styles.addStInput}
                value={stName}
                onChange={e => setStName(e.target.value)}
              />
            </div>
            <div className={styles.stEditField}>
              <label className={styles.formLabel}>Mode</label>
              <select className={styles.formSelect} value={stMode} onChange={e => {
                setStMode(e.target.value)
                if (e.target.value === 'pco' && pcoConnected) loadPcoTypesForEdit()
              }}>
                <option value="manual">Manual</option>
                {pcoConnected && <option value="pco">PCO Sync</option>}
              </select>
            </div>
            {campuses.length > 0 && (
              <div className={styles.stEditField}>
                <label className={styles.formLabel}>Campus</label>
                <select className={styles.formSelect} value={stCampus} onChange={e => setStCampus(e.target.value)}>
                  <option value="">No campus</option>
                  {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {stMode === 'pco' && pcoConnected && (
            <div className={styles.stEditPcoSection}>
              <div className={styles.stEditField} style={{ maxWidth: 480 }}>
                <label className={styles.formLabel}>PCO service type</label>
                {pcoTypesLoading && <span className={styles.emptyHint}>Loading…</span>}
                {!pcoTypesLoading && pcoTypes && pcoTypes.length > 0 && (
                  <select
                    className={styles.formSelect}
                    value={stPcoId}
                    onChange={e => {
                      const picked = pcoTypes.find(t => t.id === e.target.value)
                      setStPcoId(e.target.value)
                      setStPcoName(picked?.attributes?.name ?? '')
                      if (picked && !stName) setStName(picked.attributes?.name ?? '')
                      if (e.target.value) { setPcoTeams(null); loadPcoTeamsForEdit(e.target.value) }
                    }}
                  >
                    <option value="">Select from PCO…</option>
                    {pcoTypes.map(t => <option key={t.id} value={t.id}>{t.attributes?.name}</option>)}
                  </select>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: pcoTypes?.length ? 8 : 0 }}>
                  <input
                    className={styles.addStInput}
                    value={stPcoId}
                    onChange={e => {
                      setStPcoId(e.target.value); setStPcoName('')
                      if (e.target.value) { setPcoTeams(null); loadPcoTeamsForEdit(e.target.value) }
                    }}
                    placeholder="Or enter PCO service type ID…"
                    style={{ flex: 1 }}
                  />
                  <InfoPopover title="Finding your PCO service type ID" docsHref="/docs#pco-service-id">
                    <p>Go to Planning Center Services, open a service type, and look at the URL. The number after <strong>/service_types/</strong> is the ID.</p>
                    <p>Example: <code style={{ fontSize: '0.8em', background: 'rgba(255,255,255,0.08)', padding: '1px 4px', borderRadius: 3 }}>…/service_types/<strong>12345</strong></code></p>
                  </InfoPopover>
                </div>
              </div>

              {stPcoId && (
                <div className={styles.stEditField}>
                  <label className={styles.formLabel}>Teams to include <span className={styles.formLabelHint}>(leave all unchecked for all teams)</span></label>
                  {pcoTeamsLoading && <span className={styles.emptyHint}>Loading teams…</span>}
                  {!pcoTeamsLoading && pcoTeams && pcoTeams.length === 0 && <span className={styles.emptyHint}>No teams found.</span>}
                  {!pcoTeamsLoading && pcoTeams && pcoTeams.length > 0 && (
                    <div className={styles.teamChecklist}>
                      <label className={styles.teamCheckItem} key="all">
                        <input type="checkbox" checked={stTeamIds.length === 0}
                          onChange={() => setStTeamIds([])} />
                        <span>All teams</span>
                      </label>
                      {pcoTeams.map(t => (
                        <label key={t.id} className={styles.teamCheckItem}>
                          <input type="checkbox"
                            checked={stTeamIds.includes(t.id)}
                            onChange={e => setStTeamIds(prev =>
                              e.target.checked ? [...prev, t.id] : prev.filter(id => id !== t.id)
                            )}
                          />
                          <span>{t.attributes?.name ?? t.id}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className={styles.stEditActions}>
            <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSmall}`} onClick={saveStEdit} disabled={savingSt}>
              {savingSt ? 'Saving…' : 'Save changes'}
            </button>
            <button className={`${styles.btn} ${styles.btnSmall}`} onClick={() => { setEditingSt(false); setStName(st.name); setStCampus(st.campus_id ?? ''); setStMode(st.mode ?? 'manual'); setStPcoId(st.pco_service_type_id ?? ''); setStPcoName(st.pco_service_type_name ?? '') }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {open && !editingSt && (
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
  // Team selection
  const [pcoTeams, setPcoTeams] = useState(null)
  const [pcoTeamsLoading, setPcoTeamsLoading] = useState(false)
  const [selectedTeamIds, setSelectedTeamIds] = useState([])

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

  async function loadTeams(pcoTypeId) {
    if (!pcoTypeId) { setPcoTeams(null); return }
    setPcoTeamsLoading(true)
    try {
      const r = await fetch(`/api/pco/service-types/${pcoTypeId}/teams`, { credentials: 'include' })
      const data = await r.json()
      setPcoTeams(data.data ?? [])
    } catch { setPcoTeams([]) }
    setPcoTeamsLoading(false)
    setSelectedTeamIds([])
  }

  function selectPcoType(t) {
    setSelectedPcoType(t)
    setManualPcoId('')
    if (!name) setName(t.attributes?.name ?? '')
    loadTeams(t.id)
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
    await onAdd({
      name: finalName,
      campus_id: campusId || null,
      mode,
      pco_service_type_id: pcoId,
      pco_service_type_name: pcoName,
      pco_team_ids: mode === 'pco' && selectedTeamIds.length > 0 ? selectedTeamIds : null,
    })
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
              {pcoError?.includes('403')
                ? 'Permission denied — the PCO connection may be missing the Services scope. Try disconnecting and reconnecting on the Integrations page.'
                : pcoError
              }{' '}
              <button className={styles.btnLink} onClick={loadPcoTypes}><RefreshIcon /> Retry</button>
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
            <InfoPopover title="Finding your PCO service type ID" docsHref="/docs#pco-service-id">
              <p>Open Planning Center Services and click a service type. Look at the URL — the number after <strong>/service_types/</strong> is the ID.</p>
              <p>Example: <code style={{ fontSize: '0.8em', background: 'rgba(255,255,255,0.08)', padding: '1px 4px', borderRadius: 3 }}>…/service_types/<strong>12345</strong></code></p>
            </InfoPopover>
          </div>

          {(selectedPcoType || manualPcoId.trim()) && (
            <div className={styles.modalSection} style={{ marginTop: 16 }}>
              <label className={styles.modalLabel}>Service name in Beacon</label>
              <input
                className={styles.addStInput}
                placeholder={selectedPcoType?.attributes?.name ?? 'e.g. Sunday Morning'}
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ width: '100%' }}
              />
              <p className={styles.modalHint}>Leave blank to use the PCO service name.</p>
            </div>
          )}

          {selectedPcoType && (
            <div className={styles.modalSection} style={{ marginTop: 16 }}>
              <label className={styles.modalLabel}>Teams to include</label>
              {pcoTeamsLoading && <p className={styles.emptyHint}>Loading teams…</p>}
              {!pcoTeamsLoading && pcoTeams && pcoTeams.length === 0 && (
                <p className={styles.emptyHint}>No teams found for this service.</p>
              )}
              {!pcoTeamsLoading && pcoTeams && pcoTeams.length > 0 && (
                <div className={styles.teamChecklist}>
                  <label className={styles.teamCheckItem}>
                    <input type="checkbox" checked={selectedTeamIds.length === 0}
                      onChange={() => setSelectedTeamIds([])} />
                    <span>All teams</span>
                  </label>
                  {pcoTeams.map(t => (
                    <label key={t.id} className={styles.teamCheckItem}>
                      <input type="checkbox"
                        checked={selectedTeamIds.includes(t.id)}
                        onChange={e => setSelectedTeamIds(prev =>
                          e.target.checked ? [...prev, t.id] : prev.filter(id => id !== t.id)
                        )}
                      />
                      <span>{t.attributes?.name ?? t.id}</span>
                    </label>
                  ))}
                </div>
              )}
              <p className={styles.modalHint}>Leave all unchecked to include all teams.</p>
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
