import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import AdminLayout from './_Layout'
import styles from './Profile.module.css'

function api(path, opts = {}) {
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

function AccountInfo({ user, onUpdate }) {
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const dirty = name !== user.name || email !== user.email

  async function save(e) {
    e.preventDefault()
    if (!dirty) return
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const { user: updated } = await api('/profile', {
        method: 'PUT',
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      })
      onUpdate(updated)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Account info</h2>
      <form onSubmit={save} className={styles.form}>
        {error && <p className={styles.formError}>{error}</p>}
        <div className={styles.formField}>
          <label className={styles.formLabel}>Name</label>
          <input
            className={styles.formInput}
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </div>
        <div className={styles.formField}>
          <label className={styles.formLabel}>Email</label>
          <input
            className={styles.formInput}
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
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

function ChangePassword() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  async function save(e) {
    e.preventDefault()
    if (next !== confirm) { setError('New passwords do not match'); return }
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      await api('/password', { method: 'PUT', body: JSON.stringify({ current, next }) })
      setCurrent('')
      setNext('')
      setConfirm('')
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Change password</h2>
      <form onSubmit={save} className={styles.form}>
        {error && <p className={styles.formError}>{error}</p>}
        <div className={styles.formField}>
          <label className={styles.formLabel}>Current password</label>
          <input
            className={styles.formInput}
            type="password"
            value={current}
            onChange={e => setCurrent(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        <div className={styles.formField}>
          <label className={styles.formLabel}>New password <span className={styles.hint}>min 8 characters</span></label>
          <input
            className={styles.formInput}
            type="password"
            value={next}
            onChange={e => setNext(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <div className={styles.formField}>
          <label className={styles.formLabel}>Confirm new password</label>
          <input
            className={styles.formInput}
            type="password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
          />
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

export default function Profile() {
  const { user, setUser } = useAuth()

  return (
    <AdminLayout title="My Account">
      <div className={styles.page}>
        <AccountInfo user={user} onUpdate={setUser} />
        <ChangePassword />
      </div>
    </AdminLayout>
  )
}
