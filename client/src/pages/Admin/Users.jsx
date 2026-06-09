import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import AdminLayout from './_Layout'
import Modal from '../../components/Modal'
import styles from './Users.module.css'

function EditUserModal({ user, onSave, onClose }) {
  const [name, setName] = useState(user.name)
  const [email, setEmail] = useState(user.email)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!name.trim() || !email.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Failed to save'); return }
      onSave(data)
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title="Edit User"
      onClose={onClose}
      footer={
        <>
          <button className={styles.btnGhost} onClick={onClose}>Cancel</button>
          <button className={styles.btnPrimary} onClick={submit} disabled={saving || !name.trim() || !email.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </>
      }
    >
      {error && <p className={styles.formError}>{error}</p>}
      <div className={styles.modalField}>
        <label className={styles.modalLabel}>Name</label>
        <input className={styles.modalInput} value={name} onChange={e => setName(e.target.value)} placeholder="Full name" />
      </div>
      <div className={styles.modalField}>
        <label className={styles.modalLabel}>Email</label>
        <input className={styles.modalInput} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
      </div>
    </Modal>
  )
}

export default function Users() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [editModal, setEditModal] = useState(null)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('team_member')
  const [inviteStatus, setInviteStatus] = useState(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [invites, setInvites] = useState([])
  const [copiedInvite, setCopiedInvite] = useState(false)

  useEffect(() => {
    fetch('/api/admin/users', { credentials: 'include' })
      .then(r => r.json())
      .then(setUsers)
      .catch(() => setError('Failed to load users'))
      .finally(() => setLoading(false))

    fetch('/api/admin/users/invites', { credentials: 'include' })
      .then(r => r.json())
      .then(setInvites)
      .catch(() => {})
  }, [])

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

  async function changeRole(userId, role) {
    const res = await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ role }),
    })
    const data = await res.json()
    if (!res.ok) return alert(data.error)
    setUsers(prev => prev.map(u => (u.id === userId ? data : u)))
  }

  async function deleteUser(userId, name) {
    if (!confirm(`Delete account for ${name}? This cannot be undone.`)) return
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: 'DELETE',
      credentials: 'include',
    })
    const data = await res.json()
    if (!res.ok) return alert(data.error)
    setUsers(prev => prev.filter(u => u.id !== userId))
  }

  return (
    <AdminLayout title="Users">
      <div className={styles.page}>

        {/* Invite */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Invite Team Members</h2>
          <p className={styles.sectionDesc}>Send a one-time invite link to add someone to your organization. Links expire in 7 days.</p>

          <div className={styles.inviteForm}>
            <input
              className={styles.formInput}
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="teammate@yourchurch.com"
              onKeyDown={e => e.key === 'Enter' && handleSendInvite()}
            />
            <select className={styles.formSelect} value={inviteRole} onChange={e => setInviteRole(e.target.value)}>
              <option value="team_member">Team Member</option>
              <option value="admin">Admin</option>
            </select>
            <button
              className={styles.btnPrimary}
              type="button"
              onClick={handleSendInvite}
              disabled={inviteLoading || !inviteEmail.trim()}
            >
              {inviteLoading ? 'Sending…' : 'Send invite'}
            </button>
          </div>

          {inviteStatus && !inviteStatus.error && inviteStatus.sent && (
            <p className={styles.successMsg}>Invite sent to {inviteStatus.email}</p>
          )}
          {inviteStatus && !inviteStatus.error && !inviteStatus.sent && inviteStatus.link && (
            <div className={styles.inviteLinkWrap}>
              <p className={styles.warning}>Email not configured — share this link manually:</p>
              <div className={styles.inviteRow}>
                <input className={styles.inviteInput} type="text" value={inviteStatus.link} readOnly />
                <button className={styles.copyBtn} type="button" onClick={() => copyToClipboard(inviteStatus.link, setCopiedInvite)}>
                  {copiedInvite ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}
          {inviteStatus?.error && <p className={styles.formError}>{inviteStatus.error}</p>}

          {invites.length > 0 && (
            <div className={styles.inviteList}>
              <p className={styles.inviteListLabel}>Active invite links</p>
              {invites.map(invite => (
                <div key={invite.id} className={styles.inviteItem}>
                  {invite.email && <span className={styles.inviteItemEmail}>{invite.email}</span>}
                  <span className={styles.inviteItemRole}>{invite.role === 'admin' ? 'Admin' : 'Team Member'}</span>
                  <span className={styles.inviteItemExpiry}>expires {new Date(invite.expires_at).toLocaleDateString()}</span>
                  <button className={styles.inviteRevokeBtn} type="button" onClick={() => handleRevokeInvite(invite.id)}>Revoke</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Users table */}
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Team</h2>
          {loading && <p className={styles.muted}>Loading…</p>}
          {error && <p className={styles.formError}>{error}</p>}
          {!loading && !error && (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Joined</th>
                    <th></th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className={u.id === me?.id ? styles.selfRow : ''}>
                      <td>
                        <span className={styles.name}>{u.name}</span>
                        {u.id === me?.id && <span className={styles.youBadge}>you</span>}
                      </td>
                      <td className={styles.email}>{u.email}</td>
                      <td>
                        <select
                          className={`${styles.roleSelect} ${styles[u.role]}`}
                          value={u.role}
                          onChange={e => changeRole(u.id, e.target.value)}
                          disabled={u.id === me?.id}
                        >
                          <option value="admin">Admin</option>
                          <option value="team_member">Team Member</option>
                        </select>
                      </td>
                      <td className={styles.muted}>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>
                        <button className={styles.editBtn} onClick={() => setEditModal(u)}>Edit</button>
                      </td>
                      <td>
                        {u.id !== me?.id && (
                          <button className={styles.deleteBtn} onClick={() => deleteUser(u.id, u.name)}>
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {editModal && (
        <EditUserModal
          user={editModal}
          onSave={updated => {
            setUsers(prev => prev.map(u => u.id === updated.id ? updated : u))
            setEditModal(null)
          }}
          onClose={() => setEditModal(null)}
        />
      )}
    </AdminLayout>
  )
}
