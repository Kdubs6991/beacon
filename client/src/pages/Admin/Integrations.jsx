import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AdminLayout from './_Layout'
import styles from './Integrations.module.css'

export default function Integrations() {
  const [status, setStatus] = useState(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    fetch('/api/auth/pco/status', { credentials: 'include' })
      .then(r => r.json())
      .then(setStatus)
      .catch(() => setStatus({ configured: false, connected: false }))
  }, [])

  useEffect(() => {
    if (searchParams.get('connected') === '1') {
      setSearchParams({}, { replace: true })
      fetch('/api/auth/pco/status', { credentials: 'include' })
        .then(r => r.json())
        .then(setStatus)
    }
  }, [])

  async function handleDisconnect() {
    if (!confirm('Disconnect Planning Center? Beacon will stop syncing PCO data.')) return
    setDisconnecting(true)
    await fetch('/api/auth/pco/disconnect', { method: 'DELETE', credentials: 'include' })
    setStatus(s => ({ ...s, connected: false, expiresAt: null }))
    setDisconnecting(false)
  }

  const configured = status?.configured
  const connected = status?.connected

  return (
    <AdminLayout title="Integrations">
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.logoWrap}>
            <span className={styles.logoText}>PCO</span>
          </div>
          <div className={styles.cardMeta}>
            <h2 className={styles.cardTitle}>Planning Center Online</h2>
            <p className={styles.cardDesc}>
              Automatically pull service plans, team members, and positions from Planning Center.
            </p>
          </div>
          {status === null ? null : connected ? (
            <span className={styles.connectedBadge}>Connected</span>
          ) : configured ? (
            <span className={styles.readyBadge}>Ready to connect</span>
          ) : (
            <span className={styles.comingSoonBadge}>Coming soon</span>
          )}
        </div>

        {status === null && (
          <div className={styles.body}>
            <p className={styles.muted}>Checking connection status…</p>
          </div>
        )}

        {status !== null && connected && (
          <div className={styles.body}>
            <div className={styles.connectedState}>
              <div className={styles.connectedIcon}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
              </div>
              <div>
                <p className={styles.connectedLabel}>Planning Center is connected</p>
                <p className={styles.muted}>Beacon can now pull team rosters from your Planning Center service plans.</p>
              </div>
            </div>
            <button className={styles.disconnectBtn} onClick={handleDisconnect} disabled={disconnecting}>
              {disconnecting ? 'Disconnecting…' : 'Disconnect'}
            </button>
          </div>
        )}

        {status !== null && !connected && configured && (
          <div className={styles.body}>
            <p style={{ marginBottom: 20 }}>
              Connect your Planning Center account to let Beacon pull team rosters directly from your service plans.
              Once connected, Beacon will be able to:
            </p>
            <ul className={styles.featureList}>
              <li>Pull your team roster directly from Planning Center plans</li>
              <li>Match team members to automation rules automatically on a schedule</li>
              <li>Sync photos and positions without any manual entry</li>
            </ul>
            <a href="/api/auth/pco/connect" className={styles.connectBtn}>
              Connect to Planning Center
            </a>
          </div>
        )}

        {status !== null && !connected && !configured && (
          <div className={styles.comingSoonBody}>
            <p>PCO integration is under active development and will be available in a future update. Once connected, Beacon will be able to:</p>
            <ul className={styles.featureList}>
              <li>Pull your team roster directly from Planning Center plans</li>
              <li>Match team members to automation rules automatically on a schedule</li>
              <li>Sync photos and positions without any manual entry</li>
            </ul>
            <p className={styles.comingSoonNote}>
              In the meantime, use <strong>Manual service types</strong> on the Services page to define your team and push assignments to your display screens.
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
