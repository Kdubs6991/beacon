import { useNavigate, useLocation } from 'react-router-dom'
import PublicNav from '../components/PublicNav'
import { useAuth } from '../context/AuthContext'
import styles from './Auth.module.css'

export default function NotFound() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user, loading } = useAuth()

  const destination = user ? '/admin' : '/login'
  const label = user ? 'Go to Dashboard' : 'Go to Sign In'

  return (
    <>
      <PublicNav />
      <div className={styles.page}>
        <div className={styles.card}>
          <div className={styles.brand}>Beacon</div>
          <h1 className={styles.title}>Page not found</h1>
          <p className={styles.subtitle}>
            <code style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: 4 }}>{pathname}</code>
            {' '}doesn't exist. It may have been moved or the URL may be incorrect.
          </p>
          {!loading && (
            <button className={styles.submit} onClick={() => navigate(destination)}>
              {label}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
