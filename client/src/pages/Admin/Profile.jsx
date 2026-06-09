import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import AdminLayout from './_Layout'
import styles from './Profile.module.css'

const TIMEZONE_LABELS = {
  'America/New_York':    'Eastern (ET)',
  'America/Chicago':     'Central (CT)',
  'America/Denver':      'Mountain (MT)',
  'America/Phoenix':     'Mountain – no DST',
  'America/Los_Angeles': 'Pacific (PT)',
  'America/Anchorage':   'Alaska',
  'Pacific/Honolulu':    'Hawaii',
  'America/Puerto_Rico': 'Atlantic',
  'Europe/London':       'GMT / London',
  'Europe/Paris':        'Central European',
  'Asia/Tokyo':          'Japan (JST)',
  'Australia/Sydney':    'Australia Eastern',
}

function useTheme() {
  const [theme, setThemeState] = useState(() => localStorage.getItem('beacon-theme') || 'dark')
  function setTheme(val) {
    setThemeState(val)
    if (val === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    localStorage.setItem('beacon-theme', val)
  }
  return { theme, setTheme }
}

function authApi(path, opts = {}) {
  return fetch(`/api/auth${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  }).then(async r => {
    const data = await r.json()
    if (!r.ok) throw new Error(data.error || 'Request failed')
    return data
  })
}

const SECTIONS = [
  { id: 'account',      label: 'Account' },
  { id: 'security',     label: 'Security' },
  { id: 'appearance',   label: 'Appearance' },
  { id: 'dashboard',    label: 'Dashboard' },
  { id: 'connections',  label: 'Connections' },
  { id: 'organization', label: 'Organization' },
]

const DASH_CARD_META = {
  screens:      { label: 'Screens',          desc: 'Active displays and live status' },
  services:     { label: 'Services',         desc: 'Recent assignments and services' },
  people:       { label: 'People',           desc: 'Worship team roster overview' },
  labels:       { label: 'Labels',           desc: 'Mic and IEM label inventory' },
  schedules:    { label: 'Schedules',        desc: 'Upcoming auto-sync schedule status' },
  templates:    { label: 'Templates',        desc: 'Display layout templates in use' },
  quickactions: { label: 'Quick Push',       desc: 'Push a service to screens instantly' },
  activity:     { label: 'Recent Activity',  desc: 'Latest screen assignment updates' },
}

const DEFAULT_DASH_CARDS = [
  { id: 'screens',      visible: true },
  { id: 'services',     visible: true },
  { id: 'people',       visible: true },
  { id: 'labels',       visible: true },
  { id: 'schedules',    visible: true },
  { id: 'templates',    visible: true },
  { id: 'quickactions', visible: true },
  { id: 'activity',     visible: true },
]

function scrollTo(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  )
}

function AccountSection({ user, onUpdate }) {
  const [name, setName]   = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState(null)
  const [success, setSuccess] = useState(false)
  const dirty = name !== user.name || email !== user.email

  async function save(e) {
    e.preventDefault()
    if (!dirty) return
    setSaving(true); setError(null); setSuccess(false)
    try {
      const { user: updated } = await authApi('/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      })
      onUpdate(updated)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div id="account" className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Account</h2>
        <span className={`${styles.roleBadge} ${user.role === 'admin' ? styles.roleBadgeAdmin : ''}`}>
          {user.role === 'admin' ? 'Admin' : 'Team Member'}
        </span>
      </div>
      <form onSubmit={save} className={styles.form}>
        {error && <p className={styles.formError}>{error}</p>}
        <div className={styles.formRow}>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Name</label>
            <input className={styles.formInput} value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Email</label>
            <input className={styles.formInput} type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
        </div>
        <div className={styles.formActions}>
          <button className={styles.btnPrimary} type="submit" disabled={saving || !dirty}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
          {success && <span className={styles.successMsg}>Saved</span>}
        </div>
      </form>
    </div>
  )
}

function SecuritySection() {
  const [current, setCurrent]   = useState('')
  const [next, setNext]         = useState('')
  const [confirm, setConfirm]   = useState('')
  const [saving, setSaving]     = useState(false)
  const [error, setError]       = useState(null)
  const [success, setSuccess]   = useState(false)

  async function save(e) {
    e.preventDefault()
    if (next !== confirm) { setError('New passwords do not match'); return }
    setSaving(true); setError(null); setSuccess(false)
    try {
      await authApi('/password', { method: 'PUT', body: JSON.stringify({ current, next }) })
      setCurrent(''); setNext(''); setConfirm('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) { setError(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div id="security" className={styles.section}>
      <h2 className={styles.sectionTitle}>Security</h2>
      <form onSubmit={save} className={styles.form}>
        {error && <p className={styles.formError}>{error}</p>}
        <div className={styles.formField}>
          <label className={styles.formLabel}>Current password</label>
          <input className={styles.formInput} type="password" value={current} onChange={e => setCurrent(e.target.value)} required autoComplete="current-password" />
        </div>
        <div className={styles.formRow}>
          <div className={styles.formField}>
            <label className={styles.formLabel}>New password <span className={styles.hint}>min 8 chars</span></label>
            <input className={styles.formInput} type="password" value={next} onChange={e => setNext(e.target.value)} required minLength={8} autoComplete="new-password" />
          </div>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Confirm new password</label>
            <input className={styles.formInput} type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required autoComplete="new-password" />
          </div>
        </div>
        <div className={styles.formActions}>
          <button className={styles.btnPrimary} type="submit" disabled={saving || !current || !next || !confirm}>
            {saving ? 'Updating…' : 'Update password'}
          </button>
          {success && <span className={styles.successMsg}>Password updated</span>}
        </div>
      </form>
    </div>
  )
}

function AppearanceSection() {
  const { theme, setTheme } = useTheme()
  return (
    <div id="appearance" className={styles.section}>
      <h2 className={styles.sectionTitle}>Appearance</h2>
      <p className={styles.sectionDesc}>Color scheme preference — saved in this browser only.</p>
      <div className={styles.themeRow}>
        <button
          type="button"
          className={`${styles.themeCard} ${theme === 'dark' ? styles.themeCardActive : ''}`}
          onClick={() => setTheme('dark')}
        >
          <MoonIcon />
          <span>Dark</span>
        </button>
        <button
          type="button"
          className={`${styles.themeCard} ${theme === 'light' ? styles.themeCardActive : ''}`}
          onClick={() => setTheme('light')}
        >
          <SunIcon />
          <span>Light</span>
        </button>
      </div>
    </div>
  )
}

function ConnectionsSection({ isAdmin }) {
  const [pcoConnected, setPcoConnected] = useState(null)

  useEffect(() => {
    fetch('/api/pco/status', { credentials: 'include' })
      .then(r => r.json())
      .then(data => setPcoConnected(!!data.connected))
      .catch(() => setPcoConnected(false))
  }, [])

  return (
    <div id="connections" className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Connections</h2>
        {isAdmin && (
          <Link to="/admin/integrations" className={styles.editLink}>Manage →</Link>
        )}
      </div>
      <div className={styles.connectionRow}>
        <span className={`${styles.connDot} ${pcoConnected ? styles.connDotOn : styles.connDotOff}`} />
        <div className={styles.connBody}>
          <span className={styles.connName}>Planning Center</span>
          <span className={styles.connStatus}>
            {pcoConnected === null ? 'Checking…' : pcoConnected ? 'Connected' : 'Not connected'}
          </span>
        </div>
        {!pcoConnected && pcoConnected !== null && isAdmin && (
          <Link to="/admin/integrations" className={styles.connAction}>Connect →</Link>
        )}
      </div>
    </div>
  )
}

function OrgRow({ label, value, mono }) {
  return (
    <div className={styles.orgRow}>
      <span className={styles.orgLabel}>{label}</span>
      <span className={`${styles.orgValue} ${mono ? styles.orgValueMono : ''}`}>{value || '—'}</span>
    </div>
  )
}

function OrgSection({ isAdmin }) {
  const [org, setOrg] = useState(null)

  useEffect(() => {
    fetch('/api/org', { credentials: 'include' })
      .then(r => r.json())
      .then(data => { if (!data.error) setOrg(data) })
  }, [])

  const address = org
    ? [org.address_street, org.address_city, org.address_state, org.address_zip].filter(Boolean).join(', ')
    : null

  return (
    <div id="organization" className={styles.section}>
      <div className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>Organization</h2>
        {isAdmin && (
          <Link to="/admin/organization" className={styles.editLink}>Edit settings →</Link>
        )}
      </div>
      {!org ? (
        <p className={styles.muted}>Loading…</p>
      ) : (
        <div className={styles.orgGrid}>
          <OrgRow label="Name"     value={org.name} />
          <OrgRow label="Slug"     value={org.slug} mono />
          <OrgRow label="Timezone" value={TIMEZONE_LABELS[org.timezone] ?? org.timezone} />
          {address && <OrgRow label="Address" value={address} />}
        </div>
      )}
    </div>
  )
}

function GripIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="5" r="1" fill="currentColor" stroke="none"/>
      <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none"/>
      <circle cx="9" cy="19" r="1" fill="currentColor" stroke="none"/>
      <circle cx="15" cy="5" r="1" fill="currentColor" stroke="none"/>
      <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none"/>
      <circle cx="15" cy="19" r="1" fill="currentColor" stroke="none"/>
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}

function DashboardSection() {
  const [cards, setCards] = useState(DEFAULT_DASH_CARDS)
  const [dragIndex, setDragIndex] = useState(null)
  const [overIndex, setOverIndex] = useState(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [saveError, setSaveError] = useState(null)

  useEffect(() => {
    authApi('/dashboard-config')
      .then(({ config }) => {
        if (config?.length) {
          const merged = config.filter(c => DEFAULT_DASH_CARDS.some(d => d.id === c.id))
          const missing = DEFAULT_DASH_CARDS.filter(d => !merged.some(m => m.id === d.id))
          setCards([...merged, ...missing])
        }
      })
      .catch(() => {})
  }, [])

  function toggleVisible(id) {
    setCards(prev => prev.map(c => c.id === id ? { ...c, visible: !c.visible } : c))
  }

  const touchDragRef = useRef({ active: false, startIdx: null, overIdx: null })

  function handleDragStart(i) { setDragIndex(i) }
  function handleDragOver(e, i) { e.preventDefault(); setOverIndex(i) }
  function handleDrop(i) {
    if (dragIndex === null || dragIndex === i) { setDragIndex(null); setOverIndex(null); return }
    const next = [...cards]
    const [moved] = next.splice(dragIndex, 1)
    next.splice(i, 0, moved)
    setCards(next)
    setDragIndex(null)
    setOverIndex(null)
  }
  function handleDragEnd() { setDragIndex(null); setOverIndex(null) }

  function handleTouchDragStart(e, i) {
    touchDragRef.current = { active: true, startIdx: i, overIdx: i }
    setDragIndex(i)
    setOverIndex(i)
  }
  function handleTouchDragMove(e) {
    if (!touchDragRef.current.active) return
    const touch = e.touches[0]
    const el = document.elementFromPoint(touch.clientX, touch.clientY)
    const row = el?.closest('[data-card-idx]')
    if (row) {
      const idx = parseInt(row.dataset.cardIdx, 10)
      if (!isNaN(idx) && idx !== touchDragRef.current.overIdx) {
        touchDragRef.current.overIdx = idx
        setOverIndex(idx)
      }
    }
  }
  function handleTouchDragEnd() {
    if (!touchDragRef.current.active) return
    const { startIdx, overIdx: endIdx } = touchDragRef.current
    touchDragRef.current = { active: false, startIdx: null, overIdx: null }
    if (startIdx !== null && endIdx !== null && startIdx !== endIdx) {
      const next = [...cards]
      const [moved] = next.splice(startIdx, 1)
      next.splice(endIdx, 0, moved)
      setCards(next)
    }
    setDragIndex(null)
    setOverIndex(null)
  }

  async function save() {
    setSaving(true); setSaveError(null); setSuccess(false)
    try {
      await authApi('/dashboard-config', { method: 'PUT', body: JSON.stringify({ config: cards }) })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) { setSaveError(err.message) }
    finally { setSaving(false) }
  }

  return (
    <div id="dashboard" className={styles.section}>
      <h2 className={styles.sectionTitle}>Dashboard Layout</h2>
      <p className={styles.sectionDesc}>Drag to reorder cards and toggle visibility. Settings are saved to your account.</p>
      <div
        className={styles.dashList}
        onTouchMove={handleTouchDragMove}
        onTouchEnd={handleTouchDragEnd}
        onTouchCancel={handleTouchDragEnd}
      >
        {cards.map((card, i) => {
          const meta = DASH_CARD_META[card.id]
          const isDragging = dragIndex === i
          const isOver = overIndex === i && dragIndex !== i
          return (
            <div
              key={card.id}
              data-card-idx={i}
              className={`${styles.dashRow}${isDragging ? ` ${styles.dashRowDragging}` : ''}${isOver ? ` ${styles.dashRowOver}` : ''}`}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={e => handleDragOver(e, i)}
              onDrop={() => handleDrop(i)}
              onDragEnd={handleDragEnd}
            >
              <span
                className={styles.dragHandle}
                onTouchStart={e => { if (e.cancelable) e.preventDefault(); handleTouchDragStart(e, i) }}
                style={{ touchAction: 'none' }}
              ><GripIcon /></span>
              <div className={styles.dashRowInfo}>
                <span className={styles.dashRowLabel}>{meta.label}</span>
                <span className={styles.dashRowDesc}>{meta.desc}</span>
              </div>
              <button
                type="button"
                className={`${styles.dashToggle}${card.visible ? ` ${styles.dashToggleOn}` : ''}`}
                onClick={() => toggleVisible(card.id)}
                title={card.visible ? 'Hide card' : 'Show card'}
              >
                {card.visible ? <EyeIcon /> : <EyeOffIcon />}
              </button>
            </div>
          )
        })}
      </div>
      <div className={styles.formActions}>
        <button
          className={`${styles.btnPrimary}${success ? ` ${styles.btnSuccess}` : ''}`}
          type="button"
          onClick={save}
          disabled={saving || success}
        >
          {saving ? 'Saving…' : success ? '✓ Saved' : 'Save layout'}
        </button>
        {saveError && <span className={styles.errMsg}>{saveError}</span>}
      </div>
    </div>
  )
}

export default function Profile() {
  const { user, setUser, logout } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const hash = window.location.hash.slice(1)
    if (hash) {
      setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150)
    }
  }, [])

  async function handleSignOut() {
    await logout()
    navigate('/login')
  }

  return (
    <AdminLayout title="Settings">
      <nav className={styles.sectionNav}>
        {SECTIONS.map(s => (
          <button key={s.id} type="button" className={styles.sectionNavBtn} onClick={() => scrollTo(s.id)}>
            {s.label}
          </button>
        ))}
      </nav>

      <div className={styles.page}>
        <AccountSection user={user} onUpdate={setUser} />
        <SecuritySection />
        <AppearanceSection />
        <DashboardSection />
        <ConnectionsSection isAdmin={user?.role === 'admin'} />
        <OrgSection isAdmin={user?.role === 'admin'} />

        <div className={styles.signOutRow}>
          <button type="button" className={styles.btnDanger} onClick={handleSignOut}>
            Sign out
          </button>
          <span className={styles.signOutHint}>Signs you out of the admin panel on this device.</span>
        </div>
      </div>
    </AdminLayout>
  )
}
