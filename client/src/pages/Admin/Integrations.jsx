import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import AdminLayout from './_Layout'
import styles from './Integrations.module.css'

export default function Integrations() {
  const [status, setStatus] = useState(null)
  const [disconnecting, setDisconnecting] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const [disconnectModal, setDisconnectModal] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  function loadStatus() {
    return fetch('/api/auth/pco/status', { credentials: 'include' })
      .then(r => r.json())
      .then(setStatus)
      .catch(() => setStatus({ configured: false, connected: false }))
  }

  useEffect(() => { loadStatus() }, [])

  // Handle OAuth callback — if we're in a popup, notify parent and close
  useEffect(() => {
    if (searchParams.get('connected') === '1') {
      setSearchParams({}, { replace: true })
      if (searchParams.get('popup') === '1' && window.opener) {
        try { window.opener.postMessage({ pcoConnected: true }, window.location.origin) } catch {}
        window.close()
        return
      }
      loadStatus()
    }
  }, [])

  // Listen for popup completing
  useEffect(() => {
    function handleMessage(e) {
      if (e.origin !== window.location.origin) return
      if (e.data?.pcoConnected) loadStatus()
    }
    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  function handleConnect() {
    const popup = window.open(
      '/api/auth/pco/connect',
      'pco_oauth',
      'width=640,height=720,left=200,top=100,noopener=no'
    )
    if (!popup) {
      window.location.href = '/api/auth/pco/connect'
    }
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const r = await fetch('/api/pco/test-connection', { credentials: 'include' })
      const data = await r.json()
      setTestResult(data)
    } catch {
      setTestResult({ ok: false, error: 'Request failed' })
    }
    setTesting(false)
  }

  async function handleDisconnect(mode) {
    setDisconnecting(true)
    await fetch(`/api/auth/pco/disconnect?mode=${mode}`, { method: 'DELETE', credentials: 'include' })
    setStatus(s => ({ ...s, connected: false, expiresAt: null }))
    setTestResult(null)
    setDisconnecting(false)
    setDisconnectModal(false)
  }

  function renderTestResult() {
    if (!testResult) return null
    if (testResult.ok) {
      return (
        <div className={styles.testOk}>
          Connection verified — found {testResult.serviceTypeCount} service type{testResult.serviceTypeCount !== 1 ? 's' : ''} in your PCO account.
        </div>
      )
    }
    const scopeIssue = testResult.peopleOk === true && testResult.servicesOk === false
    return (
      <div className={styles.testErr}>
        {scopeIssue ? (
          <>
            <strong>Token valid, but Services access was denied.</strong> Your PCO authorization doesn't include the Services scope. To fix: go to <strong>app.planningcenteronline.com/profile/connected_apps</strong>, find "Beacon Screen" and remove it, then come back and reconnect. PCO will show the full permission screen and grant Services access.
          </>
        ) : (
          `Test failed: ${testResult.error}`
        )}
      </div>
    )
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

            {renderTestResult()}

            <div className={styles.actions}>
              <button className={styles.btnPrimary} onClick={handleTest} disabled={testing}>
                {testing ? 'Testing…' : 'Test connection'}
              </button>
              <button className={styles.disconnectBtn} onClick={() => setDisconnectModal(true)} disabled={disconnecting}>
                Disconnect
              </button>
            </div>
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
            <button className={styles.connectBtn} onClick={handleConnect}>
              Connect to Planning Center
            </button>
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

      {/* Disconnect confirmation modal */}
      {disconnectModal && (
        <div className={styles.modalOverlay} onClick={() => setDisconnectModal(false)}>
          <div className={styles.modalBox} onClick={e => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Disconnect Planning Center?</h3>
            <p className={styles.modalDesc}>
              Choose what happens to people that were imported from Planning Center:
            </p>
            <div className={styles.disconnectOptions}>
              <button
                className={styles.disconnectOption}
                onClick={() => handleDisconnect('keep')}
                disabled={disconnecting}
              >
                <div className={styles.disconnectOptionTitle}>Keep imported people</div>
                <div className={styles.disconnectOptionDesc}>
                  People stay in your roster but become manual — their PCO link is removed and any changes you made in Beacon are preserved.
                </div>
              </button>
              <button
                className={`${styles.disconnectOption} ${styles.disconnectOptionDanger}`}
                onClick={() => handleDisconnect('remove')}
                disabled={disconnecting}
              >
                <div className={styles.disconnectOptionTitle}>Remove imported people</div>
                <div className={styles.disconnectOptionDesc}>
                  Deletes everyone who was originally imported from Planning Center. Manual people are not affected.
                </div>
              </button>
            </div>
            <div className={styles.modalFooter}>
              <button className={styles.btnSecondary} onClick={() => setDisconnectModal(false)} disabled={disconnecting}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
