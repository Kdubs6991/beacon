import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import PublicNav from '../components/PublicNav'
import CardGrid from '../components/CardGrid'
import styles from './Display.module.css'

const POLL_INTERVAL_MS = 30_000

const getCookie = (name) => {
  const m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return m ? decodeURIComponent(m[2]) : null
}
const setCookie = (name, value, days = 365) => {
  const exp = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;expires=${exp};SameSite=Lax`
}
const clearCookie = (name) => {
  document.cookie = `${name}=;path=/;expires=Thu, 01 Jan 1970 00:00:00 GMT`
}

function DisplayView({ screenToken }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [clock, setClock] = useState(() => new Date())

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/display/${screenToken}`)
      if (!res.ok) throw new Error(res.status === 404 ? 'Screen not found' : `Error ${res.status}`)
      const json = await res.json()
      setData(json)
      setError(null)
    } catch (err) {
      setError(err.message)
    }
  }, [screenToken])

  useEffect(() => {
    fetchData()
    const id = setInterval(fetchData, POLL_INTERVAL_MS)
    return () => clearInterval(id)
  }, [fetchData])

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  if (error) {
    return (
      <div className={styles.errorState}>
        <div className={styles.errorIcon}>!</div>
        <p>{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner} />
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          {data.org?.logo_url && (
            <img src={data.org.logo_url} alt="" className={styles.orgLogo} />
          )}
          {data.org?.name && (
            <span className={styles.orgName}>{data.org.name}</span>
          )}
        </div>
        <div className={styles.headerCenter}>
          {data.event_name && (
            <>
              <h1 className={styles.eventName}>{data.event_name}</h1>
              {data.event_date && <p className={styles.eventDate}>{data.event_date}</p>}
            </>
          )}
        </div>
        <div className={styles.headerRight}>
          <span className={styles.clock}>
            {clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </header>
      <main className={`${styles.main} ${data.template ? styles.mainTemplate : ''}`}>
        <CardGrid musicians={data.musicians} template={data.template} />
      </main>
    </div>
  )
}

export default function Display() {
  const { token } = useParams()
  if (token) return <DisplayView screenToken={token} />
  return <CookieDisplay />
}

function CookieDisplay() {
  const navigate = useNavigate()

  const [step, setStep] = useState('checking') // 'checking' | 'screen' | 'display'
  const [screenToken, setScreenToken] = useState(null)
  const [orgInfo, setOrgInfo] = useState(null)

  const [screenName, setScreenName] = useState('')
  const [screenError, setScreenError] = useState(null)
  const [screenLoading, setScreenLoading] = useState(false)

  const [qrSessionId, setQrSessionId] = useState(null)
  const [qrDataUrl, setQrDataUrl] = useState(null)

  // Generate QR session for phone-based screen setup
  useEffect(() => {
    if (step !== 'screen') return
    let cancelled = false
    fetch('/api/display/setup-init', { method: 'POST' })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        setQrSessionId(data.sessionId)
        const url = `${window.location.origin}/display/setup?session=${data.sessionId}`
        return QRCode.toDataURL(url, { width: 220, margin: 2, color: { dark: '#0f0f0f', light: '#ffffff' } })
      })
      .then(url => { if (url && !cancelled) setQrDataUrl(url) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [step])

  // Poll for phone completing the QR-based screen setup
  useEffect(() => {
    if (!qrSessionId) return
    const id = setInterval(async () => {
      try {
        const res = await fetch(`/api/display/setup-poll/${qrSessionId}`)
        const data = await res.json()
        if (data.ready && data.screenToken) {
          clearInterval(id)
          setCookie('beacon_screen', data.screenToken)
          setScreenToken(data.screenToken)
          setStep('display')
        }
      } catch {}
    }, 2000)
    return () => clearInterval(id)
  }, [qrSessionId])

  useEffect(() => {
    const savedScreen = getCookie('beacon_screen')
    const savedOrgRaw = getCookie('beacon_org')
    const savedOrg = savedOrgRaw
      ? (() => { try { return JSON.parse(savedOrgRaw) } catch { return null } })()
      : null

    if (savedScreen) {
      fetch(`/api/display/${savedScreen}`)
        .then(r => {
          if (r.ok) { setScreenToken(savedScreen); setStep('display') }
          else if (r.status === 404) {
            clearCookie('beacon_screen')
            if (savedOrg) { setOrgInfo(savedOrg); setStep('screen') }
            else navigate('/org', { replace: true })
          } else { setScreenToken(savedScreen); setStep('display') }
        })
        .catch(() => { setScreenToken(savedScreen); setStep('display') })
    } else if (savedOrg) {
      setOrgInfo(savedOrg)
      setStep('screen')
    } else {
      navigate('/org', { replace: true })
    }
  }, [navigate])

  async function handleScreenSubmit(e) {
    e.preventDefault()
    setScreenError(null)
    setScreenLoading(true)
    try {
      const res = await fetch('/api/display/auth/screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgInfo.id, screen_name: screenName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setScreenError(data.error || 'Screen not found'); return }
      setCookie('beacon_screen', data.screen.token)
      setScreenToken(data.screen.token)
      setStep('display')
    } catch {
      setScreenError('Connection error. Please try again.')
    } finally {
      setScreenLoading(false)
    }
  }

  function handleWrongOrg() {
    clearCookie('beacon_org')
    clearCookie('beacon_screen')
    navigate('/org', { replace: true })
  }

  if (step === 'checking') {
    return (
      <div className={styles.loadingState}>
        <div className={styles.spinner} />
      </div>
    )
  }

  if (step === 'display' && screenToken) {
    return <DisplayView screenToken={screenToken} />
  }

  return (
    <>
      <PublicNav />
      <div className={styles.loginPage}>
        <div className={styles.loginCard}>
          <div className={styles.loginBrand}>Beacon</div>
          <h1 className={styles.loginTitle}>Select a screen</h1>
          <p className={styles.loginDesc}>
            Organization: <strong>{orgInfo?.name}</strong>
          </p>
          {qrDataUrl && (
            <div className={styles.qrSection}>
              <img src={qrDataUrl} alt="Scan to set up this screen" className={styles.qrImg} />
              <p className={styles.qrHint}>Scan with your phone to set up this screen remotely</p>
            </div>
          )}
          <div className={styles.loginDivider}>or enter manually</div>
          <form className={styles.loginForm} onSubmit={handleScreenSubmit}>
            <input
              className={styles.loginInput}
              type="text"
              placeholder="Screen name (e.g. Main Stage)"
              value={screenName}
              onChange={e => setScreenName(e.target.value)}
              autoFocus
              required
            />
            {screenError && <div className={styles.loginError}>{screenError}</div>}
            <button className={styles.loginBtn} type="submit" disabled={screenLoading}>
              {screenLoading ? 'Loading...' : 'Open Screen'}
            </button>
          </form>
          <div className={styles.loginFooter}>
            <button className={styles.loginLink} type="button" onClick={handleWrongOrg}>
              Wrong organization?
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
