import { useEffect, useState } from 'react'
import AdminLayout from './_Layout'
import Modal from '../../components/Modal'
import InfoPopover from '../../components/InfoPopover'
import styles from './Automation.module.css'

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

function describeAction(rule, labels) {
  const typeName = rule.action_type === 'mic' ? 'Mic' : 'IEM'
  const v = rule.action_value
  if (v === 'next_available') return `${typeName}: next available`
  if (v.startsWith('next_available:')) return `${typeName}: next available · ${v.slice('next_available:'.length)}`
  const lbl = labels.find(l => String(l.id) === String(v))
  return `${typeName}: ${lbl?.name ?? v}`
}

// ── Rule modal ────────────────────────────────────────────────────────────────

function RuleModal({ initial, labels, rulesCount, onSave, onClose }) {
  const [condField, setCondField]   = useState(initial?.condition_field ?? 'position')
  const [condOp, setCondOp]         = useState(initial?.condition_op ?? 'contains')
  const [condValue, setCondValue]   = useState(initial?.condition_value ?? '')
  const [actionType, setActionType] = useState(initial?.action_type ?? 'mic')
  const [actionValue, setActionValue] = useState(initial?.action_value ?? 'next_available')
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)

  const typeLabels = labels.filter(l => l.type === actionType)
  const groups = [...new Set(typeLabels.filter(l => l.group_name).map(l => l.group_name))]

  function handleTypeChange(t) {
    setActionType(t)
    const isLabelId = actionValue && !actionValue.startsWith('next_available')
    if (isLabelId) {
      const lbl = labels.find(l => String(l.id) === actionValue)
      if (!lbl || lbl.type !== t) setActionValue('next_available')
    }
  }

  async function submit(e) {
    e.preventDefault()
    if (!condValue.trim() || !actionValue) return
    setSaving(true)
    setError(null)
    try {
      const body = {
        condition_field: condField,
        condition_op: condOp,
        condition_value: condValue.trim(),
        action_type: actionType,
        action_value: actionValue,
        priority: initial?.priority ?? rulesCount,
      }
      const method = initial ? 'PUT' : 'POST'
      const path   = initial ? `/automation-rules/${initial.id}` : '/automation-rules'
      const saved  = await api(path, { method, body: JSON.stringify(body) })
      onSave(saved)
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  const canSave = condValue.trim() && actionValue

  return (
    <Modal
      title={initial ? 'Edit Rule' : 'Add Rule'}
      onClose={onClose}
      width={480}
      footer={
        <>
          <button className={styles.btnGhost} onClick={onClose}>Cancel</button>
          <button className={styles.btnPrimary} onClick={submit} disabled={saving || !canSave}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      {error && <p className={styles.formError}>{error}</p>}

      <p className={styles.modalClause}>If…</p>

      <div className={styles.formRow}>
        <div className={styles.formField}>
          <label className={styles.formLabel}>Field</label>
          <div className={styles.segmented}>
            {[['name', 'Name'], ['position', 'Position']].map(([v, l]) => (
              <button
                key={v}
                type="button"
                className={`${styles.segBtn} ${condField === v ? styles.segBtnActive : ''}`}
                onClick={() => setCondField(v)}
              >{l}</button>
            ))}
          </div>
          {condField === 'position' && (
            <p className={styles.formHint}>Matches the PCO team position name <em>or</em> the position set on a Manual service team member.</p>
          )}
        </div>
        <div className={styles.formField}>
          <label className={styles.formLabel}>Match</label>
          <div className={styles.segmented}>
            {[['is', 'is'], ['contains', 'contains']].map(([v, l]) => (
              <button
                key={v}
                type="button"
                className={`${styles.segBtn} ${condOp === v ? styles.segBtnActive : ''}`}
                onClick={() => setCondOp(v)}
              >{l}</button>
            ))}
          </div>
        </div>
      </div>

      <div className={`${styles.formField} ${styles.formFieldSpaced}`}>
        <label className={styles.formLabel}>Value <span className={styles.req}>*</span></label>
        <input
          className={styles.formInput}
          value={condValue}
          onChange={e => setCondValue(e.target.value)}
          autoFocus
          placeholder={condField === 'name' ? 'e.g. John Smith' : 'e.g. Vocalist, Worship Leader'}
        />
      </div>

      <p className={styles.modalClause}>Then assign…</p>

      <div className={styles.formField}>
        <label className={styles.formLabel}>Device</label>
        <div className={styles.segmented}>
          {[['mic', 'Microphone'], ['iem', 'In-Ear Monitor']].map(([v, l]) => (
            <button
              key={v}
              type="button"
              className={`${styles.segBtn} ${actionType === v ? styles.segBtnActive : ''}`}
              onClick={() => handleTypeChange(v)}
            >{l}</button>
          ))}
        </div>
      </div>

      <div className={styles.formField}>
        <label className={styles.formLabel}>Label</label>
        <select
          className={styles.formSelect}
          value={actionValue}
          onChange={e => setActionValue(e.target.value)}
        >
          <option value="next_available">Next available</option>
          {groups.map(g => (
            <option key={g} value={`next_available:${g}`}>Next available — {g} group</option>
          ))}
          {typeLabels.length > 0 && (
            <optgroup label="Specific label">
              {typeLabels.map(l => (
                <option key={l.id} value={String(l.id)}>
                  {l.name}{l.group_name ? ` (${l.group_name})` : ''}
                </option>
              ))}
            </optgroup>
          )}
        </select>
        {typeLabels.length === 0 && (
          <p className={styles.formHint}>No {actionType === 'mic' ? 'microphone' : 'IEM'} labels defined yet — add some on the Labels page first.</p>
        )}
      </div>
    </Modal>
  )
}

// ── Rule row ──────────────────────────────────────────────────────────────────

function RuleRow({ rule, labels, isDragging, isOver, onDragStart, onDragOver, onDrop, onDragEnd, onEdit, onDelete }) {
  const condField = rule.condition_field === 'name' ? 'Name' : 'Position'

  return (
    <div
      className={`${styles.ruleRow} ${isDragging ? styles.ruleRowDragging : ''} ${isOver ? styles.ruleRowOver : ''}`}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className={styles.dragHandle}><GripIcon /></div>
      <div className={styles.ruleBody}>
        <span className={styles.ruleCondition}>
          <span className={styles.condField}>{condField}</span>
          {' '}<span className={styles.condOp}>{rule.condition_op}</span>{' '}
          <span className={styles.condValue}>"{rule.condition_value}"</span>
        </span>
        <span className={styles.ruleArrow}>→</span>
        <span className={styles.ruleAction}>{describeAction(rule, labels)}</span>
      </div>
      <div className={styles.ruleActions}>
        <button className={styles.menuBtn} onClick={() => onEdit(rule)}>Edit</button>
        <button className={`${styles.menuBtn} ${styles.menuDanger}`} onClick={() => onDelete(rule.id)}>Delete</button>
      </div>
    </div>
  )
}

function WandIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden="true">
      {/* Wand stick — solid filled, rounded ends */}
      <line x1="2" y1="14" x2="7.5" y2="8.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
      {/* Large 4-pointed sparkle */}
      <path fill="currentColor" d="M11 1.5 L11.7 3.3 L13.5 4 L11.7 4.7 L11 6.5 L10.3 4.7 L8.5 4 L10.3 3.3 Z"/>
      {/* Medium 4-pointed sparkle */}
      <path fill="currentColor" d="M10 8 L10.45 9.05 L11.5 9.5 L10.45 9.95 L10 11 L9.55 9.95 L8.5 9.5 L9.55 9.05 Z"/>
      {/* Small 4-pointed sparkle */}
      <path fill="currentColor" d="M13.5 7 L13.8 7.8 L14.6 8.1 L13.8 8.4 L13.5 9.2 L13.2 8.4 L12.4 8.1 L13.2 7.8 Z"/>
    </svg>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Automation() {
  const [rules, setRules]     = useState([])
  const [labels, setLabels]   = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal]     = useState(null)
  const [dragIdx, setDragIdx] = useState(null)
  const [overIdx, setOverIdx] = useState(null)
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState(null)

  useEffect(() => {
    Promise.all([api('/automation-rules'), api('/labels')])
      .then(([r, l]) => { setRules(r); setLabels(l) })
      .finally(() => setLoading(false))
  }, [])

  async function handleReorder(reordered) {
    setRules(reordered)
    await api('/automation-rules/reorder', {
      method: 'PUT',
      body: JSON.stringify({ ids: reordered.map(r => r.id) }),
    })
  }

  function handleDragStart(i) { setDragIdx(i) }
  function handleDragOver(e, i) { e.preventDefault(); setOverIdx(i) }
  function handleDrop(i) {
    if (dragIdx === null || dragIdx === i) { resetDrag(); return }
    const next = [...rules]
    const [item] = next.splice(dragIdx, 1)
    next.splice(i, 0, item)
    handleReorder(next)
    resetDrag()
  }
  function handleDragEnd() { resetDrag() }
  function resetDrag() { setDragIdx(null); setOverIdx(null) }

  async function deleteRule(id) {
    if (!confirm('Delete this rule?')) return
    await api(`/automation-rules/${id}`, { method: 'DELETE' })
    setRules(prev => prev.filter(r => r.id !== id))
  }

  async function runAutomation() {
    setRunning(true)
    setRunResult(null)
    try {
      const res = await api('/run-automation', { method: 'POST' })
      setRunResult({ ok: true, updated: res.updated })
    } catch {
      setRunResult({ ok: false })
    } finally {
      setRunning(false)
      setTimeout(() => setRunResult(null), 3500)
    }
  }

  function onSaved(rule) {
    setRules(prev => {
      const idx = prev.findIndex(r => r.id === rule.id)
      if (idx >= 0) { const next = [...prev]; next[idx] = rule; return next }
      return [...prev, rule]
    })
    setModal(null)
  }

  return (
    <AdminLayout title="Automation">
      <div className={styles.topBar}>
        <InfoPopover title="Automation Rules" docsHref="/docs#automation">
          <p>Rules auto-assign mics and IEMs when a schedule fires. They run <strong>top-to-bottom</strong> — each person matches the first rule that fits.</p>
          <p>Set a condition (match by name or position) and an action (assign a specific label, or "next available" from the queue). The <strong>Position</strong> field matches both PCO team positions and Manual service positions.</p>
          <p>Drag rows to change priority order. Rules higher up run first.</p>
        </InfoPopover>
        <div className={styles.topBarRight}>
          <button
            className={`${styles.btnRun} ${runResult?.ok ? styles.btnRunDone : ''}`}
            onClick={runAutomation}
            disabled={running || rules.length === 0}
            title="Re-run all automation rules against current assignments"
          >
            <WandIcon />
            {running ? 'Running…' : runResult?.ok ? `Done · ${runResult.updated} updated` : runResult?.ok === false ? 'Error' : 'Run automation'}
          </button>
          <button className={styles.btnPrimary} onClick={() => setModal({})}>
            + Add Rule
          </button>
        </div>
      </div>

      {loading && <p className={styles.muted}>Loading…</p>}

      {!loading && rules.length === 0 && (
        <div className={styles.empty}>
          <p className={styles.emptyTitle}>No rules yet</p>
          <p className={styles.emptyHint}>Add a rule to start auto-assigning mics and IEMs when a plan loads.</p>
        </div>
      )}

      {!loading && rules.length > 0 && (
        <div className={styles.ruleList}>
          {rules.map((rule, i) => (
            <RuleRow
              key={rule.id}
              rule={rule}
              labels={labels}
              isDragging={dragIdx === i}
              isOver={overIdx === i && dragIdx !== i}
              onDragStart={() => handleDragStart(i)}
              onDragOver={e => handleDragOver(e, i)}
              onDrop={() => handleDrop(i)}
              onDragEnd={handleDragEnd}
              onEdit={() => setModal({ rule })}
              onDelete={deleteRule}
            />
          ))}
          <p className={styles.listHint}>Evaluated top-to-bottom · each person matches the first rule that applies</p>
        </div>
      )}

      {modal !== null && (
        <RuleModal
          initial={modal.rule}
          labels={labels}
          rulesCount={rules.length}
          onSave={onSaved}
          onClose={() => setModal(null)}
        />
      )}
    </AdminLayout>
  )
}
