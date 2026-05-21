import { useEffect, useState } from 'react'
import AdminLayout from './_Layout'
import styles from './Organization.module.css'

const TIMEZONES = [
  ['America/New_York',      'Eastern Time (ET)'],
  ['America/Chicago',       'Central Time (CT)'],
  ['America/Denver',        'Mountain Time (MT)'],
  ['America/Phoenix',       'Mountain Time – no DST (Phoenix)'],
  ['America/Los_Angeles',   'Pacific Time (PT)'],
  ['America/Anchorage',     'Alaska Time'],
  ['Pacific/Honolulu',      'Hawaii Time'],
  ['America/Puerto_Rico',   'Atlantic Time (Puerto Rico)'],
  ['Europe/London',         'GMT / London'],
  ['Europe/Paris',          'Central European Time (CET)'],
  ['Asia/Tokyo',            'Japan Time (JST)'],
  ['Australia/Sydney',      'Australia Eastern Time (AEST)'],
]

export default function Organization() {
  const [org, setOrg] = useState(null)
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState(null)

  const [name, setName] = useState('')
  const [addressStreet, setAddressStreet] = useState('')
  const [addressCity, setAddressCity] = useState('')
  const [addressState, setAddressState] = useState('')
  const [addressZip, setAddressZip] = useState('')
  const [website, setWebsite] = useState('')
  const [phone, setPhone] = useState('')
  const [timezone, setTimezone] = useState('America/Chicago')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState(null)
  const [profileSuccess, setProfileSuccess] = useState(false)

  const [logoUploading, setLogoUploading] = useState(false)
  const [logoRemoving,  setLogoRemoving]  = useState(false)
  const [logoError,     setLogoError]     = useState(null)

  const [codeRegenLoading, setCodeRegenLoading] = useState(false)
  const [codeRegenError, setCodeRegenError] = useState(null)
  const [copiedSlug, setCopiedSlug] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('team_member')
  const [inviteStatus, setInviteStatus] = useState(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [invites, setInvites] = useState([])
  const [copiedInvite, setCopiedInvite] = useState(false)

  useEffect(() => {
    fetch('/api/org', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setOrg(data)
        populateForm(data)
      })
      .catch(e => setFetchError(e.message))
      .finally(() => setLoading(false))

    fetch('/api/admin/users/invites', { credentials: 'include' })
      .then(r => r.json())
      .then(setInvites)
      .catch(() => {})
  }, [])

  function populateForm(data) {
    setName(data.name || '')
    setAddressStreet(data.address_street || '')
    setAddressCity(data.address_city || '')
    setAddressState(data.address_state || '')
    setAddressZip(data.address_zip || '')
    setWebsite(data.website || '')
    setPhone(data.phone || '')
    setTimezone(data.timezone || 'America/Chicago')
  }

  async function handleProfileSave(e) {
    e.preventDefault()
    setProfileError(null)
    setProfileSuccess(false)
    setProfileSaving(true)
    try {
      const res = await fetch('/api/org', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: name.trim(),
          addressStreet: addressStreet.trim() || null,
          addressCity: addressCity.trim() || null,
          addressState: addressState.trim() || null,
          addressZip: addressZip.trim() || null,
          website: website.trim() || null,
          phone: phone.trim() || null,
          timezone,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setProfileError(data.error || 'Failed to save'); return }
      setOrg(data)
      populateForm(data)
      setProfileSuccess(true)
      setTimeout(() => setProfileSuccess(false), 3000)
    } catch {
      setProfileError('Connection error. Please try again.')
    } finally {
      setProfileSaving(false)
    }
  }

  async function handleLogoUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setLogoUploading(true)
    setLogoError(null)
    try {
      const fd = new FormData()
      fd.append('logo', file)
      const res = await fetch('/api/org/logo', { method: 'POST', credentials: 'include', body: fd })
      const data = await res.json()
      if (!res.ok) { setLogoError(data.error || 'Upload failed'); return }
      setOrg(prev => ({ ...prev, logo_url: data.logo_url }))
    } catch {
      setLogoError('Upload failed. Please try again.')
    } finally {
      setLogoUploading(false)
    }
  }

  async function handleLogoRemove() {
    setLogoRemoving(true)
    setLogoError(null)
    try {
      await fetch('/api/org/logo', { method: 'DELETE', credentials: 'include' })
      setOrg(prev => ({ ...prev, logo_url: null }))
    } catch {
      setLogoError('Remove failed. Please try again.')
    } finally {
      setLogoRemoving(false)
    }
  }

  async function handleRegenCode() {
    if (!confirm('Regenerate access code? All display screens will need to re-enter the new code.')) return
    setCodeRegenError(null)
    setCodeRegenLoading(true)
    try {
      const res = await fetch('/api/org/regenerate-code', { method: 'POST', credentials: 'include' })
      const data = await res.json()
      if (!res.ok) { setCodeRegenError(data.error || 'Failed to regenerate'); return }
      setOrg(data)
    } catch {
      setCodeRegenError('Connection error. Please try again.')
    } finally {
      setCodeRegenLoading(false)
    }
  }

  function copyToClipboard(text, setCopied) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  async function handleSendInvite() {
    if (!inviteEmail.trim()) return
    setInviteLoading(true)
    setInviteStatus(null)
    try {
      const res = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) { setInviteStatus({ error: data.error || 'Failed to send invite' }); return }
      setInviteStatus({ sent: data.sent, email: data.email, link: data.link })
      setInviteEmail('')
      setInvites(prev => [{ ...data, id: data.id || Date.now(), role: inviteRole }, ...prev])
    } catch {
      setInviteStatus({ error: 'Connection error. Please try again.' })
    } finally {
      setInviteLoading(false)
    }
  }

  async function handleRevokeInvite(id) {
    await fetch(`/api/admin/users/invites/${id}`, { method: 'DELETE', credentials: 'include' })
    setInvites(prev => prev.filter(i => i.id !== id))
  }

  function handleExport() {
    fetch('/api/org/export', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `beacon-backup-${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(url)
      })
  }

  if (loading) return <AdminLayout title="Organization"><p className={styles.muted}>Loading...</p></AdminLayout>
  if (fetchError) return <AdminLayout title="Organization"><p className={styles.error}>{fetchError}</p></AdminLayout>

  return (
    <AdminLayout title="Organization">
      <div className={styles.page}>

        {/* Organization Profile */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Organization Profile</h2>
          <p className={styles.sectionDesc}>Basic details about your church.</p>
          <form className={styles.form} onSubmit={handleProfileSave}>
            <div className={styles.formField}>
              <label className={styles.formLabel}>Organization Name <span className={styles.required}>*</span></label>
              <input className={styles.formInput} type="text" value={name} onChange={e => setName(e.target.value)} required />
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Street Address</label>
              <input className={styles.formInput} type="text" value={addressStreet} onChange={e => setAddressStreet(e.target.value)} placeholder="123 Main St" />
            </div>
            <div className={`${styles.formField} ${styles.addressRow}`}>
              <div className={styles.addressCity}>
                <label className={styles.formLabel}>City</label>
                <input className={styles.formInput} type="text" value={addressCity} onChange={e => setAddressCity(e.target.value)} placeholder="Springfield" />
              </div>
              <div className={styles.addressState}>
                <label className={styles.formLabel}>State</label>
                <input className={styles.formInput} type="text" value={addressState} onChange={e => setAddressState(e.target.value)} placeholder="IL" maxLength={2} />
              </div>
              <div className={styles.addressZip}>
                <label className={styles.formLabel}>Zip</label>
                <input className={styles.formInput} type="text" value={addressZip} onChange={e => setAddressZip(e.target.value)} placeholder="62701" maxLength={10} />
              </div>
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Website</label>
              <input className={styles.formInput} type="url" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://..." />
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Phone</label>
              <input className={styles.formInput} type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 555-5555" />
            </div>

            <div className={styles.formField}>
              <label className={styles.formLabel}>Timezone</label>
              <select className={styles.formSelect} value={timezone} onChange={e => setTimezone(e.target.value)}>
                {TIMEZONES.map(([tz, label]) => (
                  <option key={tz} value={tz}>{label}</option>
                ))}
              </select>
            </div>

            {profileError && <p className={styles.formError}>{profileError}</p>}
            <div className={styles.formActions}>
              <button className={styles.btnPrimary} type="submit" disabled={profileSaving}>
                {profileSaving ? 'Saving...' : 'Save Changes'}
              </button>
              {profileSuccess && <span className={styles.successMsg}>Saved!</span>}
            </div>
          </form>
        </div>

        {/* Organization Logo */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Organization Logo</h2>
          <p className={styles.sectionDesc}>If uploaded, your logo will appear in the display screen header alongside your org name.</p>
          <div className={styles.logoRow}>
            {org?.logo_url ? (
              <img src={org.logo_url} alt="Org logo" className={styles.logoPreview} />
            ) : (
              <div className={styles.logoPlaceholder}>No logo</div>
            )}
            <div className={styles.logoActions}>
              <label className={`${styles.btnPrimary} ${styles.logoUploadLabel} ${logoUploading ? styles.logoUploading : ''}`}>
                {logoUploading ? 'Uploading…' : 'Upload Logo'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} disabled={logoUploading} />
              </label>
              {org?.logo_url && (
                <button className={styles.logoRemoveBtn} type="button" onClick={handleLogoRemove} disabled={logoRemoving}>
                  {logoRemoving ? 'Removing…' : 'Remove'}
                </button>
              )}
            </div>
          </div>
          {logoError && <p className={styles.formError}>{logoError}</p>}
        </div>

        {/* Display Screen Login */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Display Screen Login</h2>
          <p className={styles.sectionDesc}>Share these with display screens to connect them to your organization. TVs can also scan a QR code on the display login page to connect automatically.</p>

          <div className={styles.formField}>
            <label className={styles.formLabel}>Organization Code</label>
            <div className={styles.copyRow}>
              <input className={`${styles.formInput} ${styles.readOnly}`} type="text" value={org?.slug || ''} readOnly />
              <button className={styles.copyBtn} type="button" onClick={() => copyToClipboard(org?.slug || '', setCopiedSlug)}>
                {copiedSlug ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel}>Access Code</label>
            <div className={styles.copyRow}>
              <input className={`${styles.formInput} ${styles.readOnly} ${styles.codeFont}`} type="text" value={org?.access_code || ''} readOnly />
              <button className={styles.copyBtn} type="button" onClick={() => copyToClipboard(org?.access_code || '', setCopiedCode)}>
                {copiedCode ? 'Copied!' : 'Copy'}
              </button>
              <button className={styles.regenBtn} type="button" onClick={handleRegenCode} disabled={codeRegenLoading}>
                {codeRegenLoading ? 'Regenerating...' : 'Regenerate'}
              </button>
            </div>
            <p className={styles.warning}>Regenerating requires all screens to re-enter the code.</p>
            {codeRegenError && <p className={styles.formError}>{codeRegenError}</p>}
          </div>
        </div>

        {/* Invite Team Members */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Invite Team Members</h2>
          <p className={styles.sectionDesc}>Send a one-time invite link to add someone to your organization. Links expire in 7 days.</p>

          <div className={styles.formField}>
            <label className={styles.formLabel}>Email address</label>
            <input
              className={styles.formInput}
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="teammate@yourchurch.com"
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.formLabel}>Role</label>
            <select className={styles.formSelect} value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
              <option value="team_member">Team Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button
            className={styles.btnPrimary}
            type="button"
            onClick={handleSendInvite}
            disabled={inviteLoading || !inviteEmail.trim()}
          >
            {inviteLoading ? 'Sending...' : 'Send invite'}
          </button>

          {inviteStatus && !inviteStatus.error && inviteStatus.sent && (
            <p className={styles.successMsg} style={{ marginTop: 10 }}>
              Invite sent to {inviteStatus.email}
            </p>
          )}
          {inviteStatus && !inviteStatus.error && !inviteStatus.sent && inviteStatus.link && (
            <div style={{ marginTop: 10 }}>
              <p className={styles.warning} style={{ marginBottom: 6 }}>
                Email not configured — share this link manually:
              </p>
              <div className={styles.inviteRow}>
                <input className={styles.inviteInput} type="text" value={inviteStatus.link} readOnly />
                <button className={styles.copyBtn} type="button" onClick={() => copyToClipboard(inviteStatus.link, setCopiedInvite)}>
                  {copiedInvite ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}
          {inviteStatus?.error && (
            <p className={styles.formError} style={{ marginTop: 10 }}>{inviteStatus.error}</p>
          )}

          {invites.length > 0 && (
            <div className={styles.inviteList}>
              <p className={styles.formLabel} style={{ marginBottom: 0, marginTop: 12 }}>Active invite links</p>
              {invites.map(invite => (
                <div key={invite.id} className={styles.inviteItem}>
                  {invite.email && <span className={styles.inviteItemEmail}>{invite.email}</span>}
                  <span className={styles.inviteItemRole}>{invite.role === 'admin' ? 'Admin' : 'Team Member'}</span>
                  <span className={styles.inviteItemExpiry}>
                    expires {new Date(invite.expires_at).toLocaleDateString()}
                  </span>
                  <button className={styles.inviteRevokeBtn} type="button" onClick={() => handleRevokeInvite(invite.id)}>
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Backup & Export */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Backup & Export</h2>
          <p className={styles.sectionDesc}>
            Download a full JSON export of your organization's data — campuses, screens, people, labels, automation rules, and users. Use it to restore after a Pi wipe or migrate to a new server.
          </p>
          <button className={styles.exportBtn} type="button" onClick={handleExport}>
            Download backup (.json)
          </button>
        </div>

        {org?.created_at && (
          <p className={styles.metaInfo}>
            Member since {new Date(org.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        )}
      </div>
    </AdminLayout>
  )
}
