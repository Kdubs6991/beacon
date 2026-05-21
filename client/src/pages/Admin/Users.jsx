import { useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import AdminLayout from './_Layout'
import styles from './Users.module.css'

export default function Users() {
  const { user: me } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/admin/users', { credentials: 'include' })
      .then(r => r.json())
      .then(setUsers)
      .catch(() => setError('Failed to load users'))
      .finally(() => setLoading(false))
  }, [])

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
      {loading && <p className={styles.muted}>Loading…</p>}
      {error && <p className={styles.error}>{error}</p>}

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
                    >
                      <option value="admin">Admin</option>
                      <option value="team_member">Team Member</option>
                    </select>
                  </td>
                  <td className={styles.muted}>
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td>
                    {u.id !== me?.id && (
                      <button
                        className={styles.deleteBtn}
                        onClick={() => deleteUser(u.id, u.name)}
                      >
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
    </AdminLayout>
  )
}
