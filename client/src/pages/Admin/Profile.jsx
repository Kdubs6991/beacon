import { useState, useEffect } from 'react'
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
  { id: 'connections',  label: 'Connections' },
  { id: 'organization', label: 'Organization' },
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

export default function Profile() {
  const { user, setUser, logout } = useAuth()
  const navigate = useNavigate()

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
