import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import styles from './Setup.module.css'

const setCookie = (name, value, days = 365) => {
  const exp = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;expires=${exp};SameSite=Lax`
}

const TIMEZONES = [
  ['America/New_York',    'Eastern Time (ET)'],
  ['America/Chicago',     'Central Time (CT)'],
  ['America/Denver',      'Mountain Time (MT)'],
  ['America/Phoenix',     'Mountain Time – no DST (Phoenix)'],
  ['America/Los_Angeles', 'Pacific Time (PT)'],
  ['America/Anchorage',   'Alaska Time'],
  ['Pacific/Honolulu',    'Hawaii Time'],
  ['Europe/London',       'GMT / London'],
  ['Europe/Paris',        'Central European Time'],
  ['Asia/Tokyo',          'Japan Time'],
  ['Australia/Sydney',    'Australia Eastern Time'],
]

function slugify(str) {
  return str.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export default function Setup() {
  const navigate = useNavigate()
  const { setUser } = useAuth()
  const [checking, setChecking] = useState(true)

  const [orgName, setOrgName] = useState('')
  const [orgSlug, setOrgSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [addressStreet, setAddressStreet] = useState('')
  const [addressCity, setAddressCity] = useState('')
  const [addressState, setAddressState] = useState('')
  const [addressZip, setAddressZip] = useState('')
  const [website, setWebsite] = useState('')
  const [timezone, setTimezone] = useState('America/Chicago')

  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminConfirm, setAdminConfirm] = useState('')

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/setup/status')
      .then(r => r.json())
      .then(data => {
        if (data.complete) navigate('/org', { replace: true })
        else setChecking(false)
      })
      .catch(() => setChecking(false))
  }, [navigate])

  function handleOrgNameChange(e) {
    const val = e.target.value
    setOrgName(val)
    if (!slugTouched) setOrgSlug(slugify(val))
  }

  function handleSlugChange(e) {
    setSlugTouched(true)
    setOrgSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (adminPassword !== adminConfirm) { setError('Passwords do not match'); return }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          orgName: orgName.trim(),
          orgSlug: orgSlug.trim(),
          addressStreet: addressStreet.trim() || null,
          addressCity: addressCity.trim() || null,
          addressState: addressState.trim() || null,
          addressZip: addressZip.trim() || null,
          website: website.trim() || null,
          timezone,
          adminName: adminName.trim(),
          adminEmail: adminEmail.trim(),
          adminPassword,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Setup failed'); return }
      if (data.org) setCookie('beacon_org', JSON.stringify(data.org))
      setUser(data.user)
      navigate('/admin', { replace: true })
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (checking) {
    return (
      <div className={styles.page}>
        <div className={styles.spinner} />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>

        {/* ── Splash header ── */}
        <div className={styles.splash}>
          <div className={styles.splashBrand}>Beacon</div>
          <p className={styles.splashTagline}>The smarter way to run your worship team's tech.</p>
          <p className={styles.splashDesc}>
            Connect to Planning Center Online and automatically show every musician which
            microphone and in-ear monitor they're on — displayed live on any TV or screen
            in your building, updating itself before every service.
          </p>
          <p className={styles.splashMeta}>Everything set up here can be changed later in your admin panel.</p>
          <p className={styles.splashRequired}><span className={styles.req}>*</span> Required fields</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>

          {/* ── Organization ── */}
          <div className={styles.sectionLabel}>Your organization</div>

          <label className={styles.label}>
            <div className={styles.labelRow}>Church name <span className={styles.req}>*</span></div>
            <input
              className={styles.input}
              type="text"
              value={orgName}
              onChange={handleOrgNameChange}
              placeholder="North Community Church"
              autoFocus
              required
            />
          </label>

          <label className={styles.label}>
            <div className={styles.labelRow}>
              Organization code <span className={styles.req}>*</span>
            </div>
            <span className={styles.hint}>Display screens use this to connect — lowercase letters, numbers, and hyphens</span>
            <input
              className={styles.input}
              type="text"
              value={orgSlug}
              onChange={handleSlugChange}
              placeholder="northchurch"
              required
              pattern="[a-z0-9\-]+"
              title="Lowercase letters, numbers, and hyphens only"
            />
            {orgSlug && (
              <span className={styles.slugPreview}>Screens will enter: <strong>{orgSlug}</strong></span>
            )}
          </label>

          <label className={styles.label}>
            <div className={styles.labelRow}>Street address <span className={styles.opt}>(optional)</span></div>
            <input
              className={styles.input}
              type="text"
              value={addressStreet}
              onChange={e => setAddressStreet(e.target.value)}
              placeholder="123 Main St"
            />
          </label>

          <div className={styles.addressRow}>
            <label className={`${styles.label} ${styles.addressCity}`}>
              <div className={styles.labelRow}>City</div>
              <input
                className={styles.input}
                type="text"
                value={addressCity}
                onChange={e => setAddressCity(e.target.value)}
                placeholder="Springfield"
              />
            </label>
            <label className={`${styles.label} ${styles.addressState}`}>
              <div className={styles.labelRow}>State</div>
              <input
                className={styles.input}
                type="text"
                value={addressState}
                onChange={e => setAddressState(e.target.value)}
                placeholder="IL"
                maxLength={2}
              />
            </label>
            <label className={`${styles.label} ${styles.addressZip}`}>
              <div className={styles.labelRow}>Zip</div>
              <input
                className={styles.input}
                type="text"
                value={addressZip}
                onChange={e => setAddressZip(e.target.value)}
                placeholder="62701"
                maxLength={10}
              />
            </label>
          </div>

          <label className={styles.label}>
            <div className={styles.labelRow}>Website <span className={styles.opt}>(optional)</span></div>
            <input
              className={styles.input}
              type="url"
              value={website}
              onChange={e => setWebsite(e.target.value)}
              placeholder="https://northchurch.com"
            />
          </label>

          <label className={styles.label}>
            <div className={styles.labelRow}>Timezone <span className={styles.req}>*</span></div>
            <select className={styles.input} value={timezone} onChange={e => setTimezone(e.target.value)}>
              {TIMEZONES.map(([tz, label]) => (
                <option key={tz} value={tz}>{label}</option>
              ))}
            </select>
          </label>

          {/* ── Admin account ── */}
          <div className={styles.sectionLabel}>Admin account</div>

          <label className={styles.label}>
            <div className={styles.labelRow}>Your name <span className={styles.req}>*</span></div>
            <input
              className={styles.input}
              type="text"
              value={adminName}
              onChange={e => setAdminName(e.target.value)}
              placeholder="Kaleb Wrigley"
              required
            />
          </label>

          <label className={styles.label}>
            <div className={styles.labelRow}>Email <span className={styles.req}>*</span></div>
            <input
              className={styles.input}
              type="email"
              value={adminEmail}
              onChange={e => setAdminEmail(e.target.value)}
              placeholder="you@yourchurch.com"
              autoComplete="email"
              required
            />
          </label>

          <label className={styles.label}>
            <div className={styles.labelRow}>Password <span className={styles.req}>*</span></div>
            <span className={styles.hint}>Minimum 8 characters</span>
            <input
              className={styles.input}
              type="password"
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />
          </label>

          <label className={styles.label}>
            <div className={styles.labelRow}>Confirm password <span className={styles.req}>*</span></div>
            <input
              className={styles.input}
              type="password"
              value={adminConfirm}
              onChange={e => setAdminConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </label>

          {error && <div className={styles.errorBanner}>{error}</div>}

          <button
            className={styles.submit}
            type="submit"
            disabled={saving || !orgName || !orgSlug || !adminName || !adminEmail || !adminPassword || !adminConfirm}
          >
            {saving ? 'Setting up…' : 'Create organization & sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
