import { useEffect, useState } from 'react'
import AdminLayout from './_Layout'
import styles from './Integrations.module.css'

export default function Integrations() {
  const [pco, setPco] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/pco/status', { credentials: 'include' })
      .then(r => r.json())
      .then(setPco)
      .finally(() => setLoading(false))
  }, [])

  async function disconnect() {
    if (!confirm('Disconnect Planning Center? Scheduled auto-fetch will stop working.')) return
    await fetch('/api/auth/pco/disconnect', { method: 'DELETE', credentials: 'include' })
    setPco(prev => ({ ...prev, connected: false, expiresAt: null }))
  }

  return (
    <AdminLayout title="Integrations">
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.logoWrap}>
            <span className={styles.logoText}>PCO</span>
          </div>
          <div>
            <h2 className={styles.cardTitle}>Planning Center Online</h2>
            <p className={styles.cardDesc}>
              Connect to automatically pull service plans, team members, and positions.
            </p>
          </div>
        </div>

        {loading ? (
          <p className={styles.muted}>Checking connection…</p>
        ) : (
          <>
            <div className={styles.statusRow}>
              <span className={`${styles.dot} ${pco?.connected ? styles.dotGreen : styles.dotGray}`} />
              <span className={styles.statusLabel}>
                {pco?.connected
                  ? `Connected · token expires ${new Date(pco.expiresAt).toLocaleString()}`
                  : 'Not connected'}
              </span>
            </div>

            {pco?.mockMode && (
              <div className={styles.notice}>
                Mock mode is ON — the app is using local test data. PCO API calls are disabled.
                Set <code>USE_MOCK_DATA=false</code> in your <code>.env</code> to enable live data.
              </div>
            )}

            {!pco?.configured && (
              <div className={styles.notice}>
                PCO OAuth credentials are not set. Add <code>PCO_CLIENT_ID</code> and{' '}
                <code>PCO_CLIENT_SECRET</code> to <code>server/.env</code> to enable this.
              </div>
            )}

            <div className={styles.actions}>
              {pco?.connected ? (
                <button className={styles.btnDanger} onClick={disconnect}>
                  Disconnect
                </button>
              ) : (
                <a
                  href="/api/auth/pco/connect"
                  className={`${styles.btnPrimary} ${!pco?.configured ? styles.btnDisabled : ''}`}
                  onClick={e => { if (!pco?.configured) e.preventDefault() }}
                >
                  Connect to Planning Center
                </a>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
