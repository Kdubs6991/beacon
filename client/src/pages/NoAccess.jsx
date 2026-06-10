import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import PublicNav from '../components/PublicNav'
import styles from './Auth.module.css'

export default function NoAccess() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/login')
  }

  return (
    <>
      <PublicNav />
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.brand}>Beacon</div>
          <h1 className={styles.title}>Access denied</h1>
          <p style={{ color: 'var(--text-sec)', fontSize: '0.875rem', lineHeight: 1.5, marginTop: 8 }}>
            You don't have permission to view this page. Contact an admin if you think this is a mistake.
          </p>
          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button onClick={() => navigate('/admin')} className={styles.submit} style={{ margin: 0, flex: 1 }}>
              Go to dashboard
            </button>
            <button onClick={handleLogout} className={styles.submit} style={{ margin: 0, flex: 1, background: 'var(--bg-page)', color: 'var(--text-sec)', border: '1px solid var(--border)' }}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
