import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import PublicNav from '../components/PublicNav'
import styles from './OrgLogin.module.css'

const getCookie = (name) => {
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return m ? decodeURIComponent(m[2]) : null
}
const setCookie = (name, value, days = name === 'beacon_screen' ? 3650 : 365) => {
  const exp = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;expires=${exp};SameSite=Lax`
}

export default function OrgLogin() {
  const navigate = useNavigate()
  const [setupComplete, setSetupComplete] = useState(true)

  // Already signed into an org — skip this page
  useEffect(() => {
    if (getCookie('beacon_org')) navigate('/login', { replace: true })
  }, [navigate])

  useEffect(() => {
    fetch('/api/setup/status')
      .then(r => r.json())
      .then(d => setSetupComplete(d.complete))
      .catch(() => {})
  }, [])

  const [orgSlug, setOrgSlug] = useState('')
  const [orgCode, setOrgCode] = useState('')
  const [orgError, setOrgError] = useState(null)
  const [orgLoading, setOrgLoading] = useState(false)

  const [sessionId, setSessionId] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState(null)

  const [showRecovery, setShowRecovery] = useState(false)
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoveryPassword, setRecoveryPassword] = useState('')
  const [recoveryError, setRecoveryError] = useState(null)
  const [recoveryLoading, setRecoveryLoading] = useState(false)
  const [recoveryResult, setRecoveryResult] = useState(null)

  // Generate scan-to-login session for TV setup
  useEffect(() => {
    let cancelled = false
    fetch('/api/display/setup-init', { method: 'POST' })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        const sid = data.sessionId
        setSessionId(sid)
        const url = `${window.location.origin}/display/setup?session=${sid}`
        return QRCode.toDataURL(url, { width: 200, margin: 3, color: { dark: '#0f0f0f', light: '#ffffff' } })
      })
      .then(url => { if (url && !cancelled) setQrDataUrl(url) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  // Poll for TV QR scan completion
  useEffect(() => {
    if (!sessionId) return
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/display/setup-poll/${sessionId}`)
        const data = await res.json()
        if (data.ready && data.screenToken) {
          clearInterval(id)
          setCookie('beacon_screen', data.screenToken)
          navigate('/display', { replace: true })
        }
      } catch {}
    }, 2000)
    return () => clearInterval(id)
  }, [sessionId, navigate])

  async function handleSubmit(e) {
    e.preventDefault()
    setOrgError(null)
    setOrgLoading(true)
    try {
      const res = await fetch('/api/display/auth/org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug: orgSlug.trim(), access_code: orgCode.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setOrgError(data.error || 'Invalid credentials'); return }
      setCookie('beacon_org', JSON.stringify(data.org))
      navigate('/login', { replace: true })
    } catch {
      setOrgError('Connection error. Please try again.')
    } finally {
      setOrgLoading(false)
    }
  }

  async function handleRecovery(e) {
    e.preventDefault()
    setRecoveryError(null)
    setRecoveryLoading(true)
    try {
      const res = await fetch('/api/auth/recover-org', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail.trim(), password: recoveryPassword }),
      })
      const data = await res.json()
      if (!res.ok) { setRecoveryError(data.error || 'Invalid credentials'); return }
      setRecoveryResult(data)
    } catch {
      setRecoveryError('Connection error. Please try again.')
    } finally {
      setRecoveryLoading(false)
    }
  }

  function handleUseRecovered() {
    setOrgSlug(recoveryResult.slug)
    setOrgCode(recoveryResult.access_code)
    setShowRecovery(false)
    setRecoveryResult(null)
    setRecoveryEmail('')
    setRecoveryPassword('')
  }

  return (
    <>
    <PublicNav />
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.brand}>Beacon</div>
        <h1 className={styles.title}>Sign in to your organization</h1>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.label}>
            Organization code
            <input
              className={styles.input}
              type="text"
              placeholder="e.g. mychurch"
              value={orgSlug}
              onChange={e => setOrgSlug(e.target.value.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, ''))}
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              required
            />
          </label>
          <label className={styles.label}>
            Access code
            <input
              className={styles.input}
              type="text"
              placeholder="e.g. ABC123"
              value={orgCode}
              onChange={e => setOrgCode(e.target.value.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect="off"
              required
            />
          </label>
          {orgError && <div className={styles.error}>{orgError}</div>}
          <button className={styles.submit} type="submit" disabled={orgLoading}>
            {orgLoading ? 'Signing in…' : 'Continue'}
          </button>
          <button
            type="button"
            className={styles.forgotBtn}
            onClick={() => { setShowRecovery(v => !v); setRecoveryResult(null); setRecoveryError(null) }}
          >
            Forgot access code?
          </button>
        </form>

        {showRecovery && (
          <div className={styles.recovery}>
            <p className={styles.recoveryTitle}>Recover access code</p>
            {recoveryResult ? (
              <div className={styles.recoveryResult}>
                <div className={styles.recoveryRow}>
                  <span className={styles.recoveryKey}>Organization code</span>
                  <strong className={styles.recoveryVal}>{recoveryResult.slug}</strong>
                </div>
                <div className={styles.recoveryRow}>
                  <span className={styles.recoveryKey}>Access code</span>
                  <strong className={styles.recoveryVal}>{recoveryResult.access_code}</strong>
                </div>
                <button className={styles.recoveryUseBtn} type="button" onClick={handleUseRecovered}>
                  Fill in and sign in
                </button>
              </div>
            ) : (
              <form className={styles.recoveryForm} onSubmit={handleRecovery}>
                <label className={styles.label}>
                  Admin email
                  <input
                    className={styles.input}
                    type="email"
                    value={recoveryEmail}
                    onChange={e => setRecoveryEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </label>
                <label className={styles.label}>
                  Admin password
                  <input
                    className={styles.input}
                    type="password"
                    value={recoveryPassword}
                    onChange={e => setRecoveryPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </label>
                {recoveryError && <div className={styles.error}>{recoveryError}</div>}
                <button className={styles.submit} type="submit" disabled={recoveryLoading}>
                  {recoveryLoading ? 'Checking…' : 'Look up my codes'}
                </button>
              </form>
            )}
          </div>
        )}

        {qrDataUrl && (
          <div className={styles.qrSection}>
            <p className={styles.qrLabel}>Setting up a TV?</p>
            <img src={qrDataUrl} alt="TV setup QR code" className={styles.qrImg} />
            <p className={styles.qrHint}>Scan with your phone to connect a display screen</p>
          </div>
        )}

        <div className={styles.footer}>
          <Link to="/display?setup=1" className={styles.footerLink}>Set up this device as a display screen →</Link>
        </div>
        {!setupComplete && (
          <div className={styles.footer}>
            <Link to="/setup" className={styles.footerLink}>Create an organization</Link>
          </div>
        )}
      </div>
    </div>
    </>
  )
}
