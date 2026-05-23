import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'
import PublicNav from '../components/PublicNav'
import CardGrid from '../components/CardGrid'
import styles from './Display.module.css'

const POLL_INTERVAL_MS = 30_000

const DISPLAY_THEMES = {
  // blue uses :root defaults — no overrides needed
  green: {
    '--bg-page': '#020c04', '--bg-card': '#071209', '--bg-card-hover': '#0d1f10',
    '--bg-header': 'rgba(3, 14, 6, 0.96)',
    '--border': '#0c2810',
    '--accent': '#22c55e', '--accent-dim': '#052e16',
    '--mic-color': '#4ade80', '--iem-color': '#22d3ee',
  },
  purple: {
    '--bg-page': '#060209', '--bg-card': '#0d0617', '--bg-card-hover': '#160a26',
    '--bg-header': 'rgba(9, 3, 20, 0.96)',
    '--border': '#1a083a',
    '--accent': '#a855f7', '--accent-dim': '#2e1065',
    '--mic-color': '#f472b6', '--iem-color': '#a78bfa',
  },
  red: {
    '--bg-page': '#0c0202', '--bg-card': '#170505', '--bg-card-hover': '#220808',
    '--bg-header': 'rgba(16, 3, 3, 0.96)',
    '--border': '#2d0808',
    '--accent': '#ef4444', '--accent-dim': '#3b0909',
    '--mic-color': '#fb923c', '--iem-color': '#f472b6',
  },
  yellow: {
    '--bg-page': '#0c0a01', '--bg-card': '#171302', '--bg-card-hover': '#221c03',
    '--bg-header': 'rgba(15, 12, 1, 0.96)',
    '--border': '#2e2403',
    '--accent': '#fbbf24', '--accent-dim': '#3b2d00',
    '--mic-color': '#fbbf24', '--iem-color': '#fb923c',
  },
  black: {
    '--bg-page': '#0a0a0a', '--bg-card': '#141414', '--bg-card-hover': '#1e1e1e',
    '--bg-header': 'rgba(6, 6, 6, 0.97)',
    '--border': 'rgba(255,255,255,0.08)',
    '--accent': '#94a3b8', '--accent-dim': '#334155',
    '--mic-color': '#f1f5f9', '--iem-color': '#94a3b8',
  },
  white: {
    '--bg-page': '#f0f4f8', '--bg-card': '#ffffff', '--bg-card-hover': '#f1f5f9',
    '--bg-header': 'rgba(240, 244, 248, 0.95)',
    '--border': '#d1dae6',
    '--accent': '#2563eb', '--accent-dim': '#dbeafe',
    '--text-pri': '#0f172a', '--text-sec': '#475569', '--text-muted': '#94a3b8',
    '--mic-color': '#16a34a', '--iem-color': '#0369a1',
  },
}

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
      fetch(`/api/display/${screenToken}/heartbeat`, { method: 'POST' }).catch(() => {})
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

  const showLogo  = !data.template || data.template.showLogo  !== false
  const showTitle = !data.template || data.template.showTitle !== false
  const themeVars = DISPLAY_THEMES[data.template?.theme] ?? {}

  return (
    <div className={styles.page} style={themeVars}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          {showLogo && data.org?.logo_url && (
            <img src={data.org.logo_url} alt="" className={styles.orgLogo} />
          )}
          {showLogo && data.org?.name && (
            <span className={styles.orgName}>{data.org.name}</span>
          )}
        </div>
        <div className={styles.headerCenter}>
          {showTitle && data.event_name && (
            <>
              <h1 className={styles.eventName}>{data.event_name}</h1>
              {data.screen?.name && <p className={styles.eventDate}>{data.screen.name}</p>}
            </>
          )}
        </div>
        <div className={styles.headerRight}>
          <div className={styles.clockStack}>
            <span className={styles.clock}>
              {clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
            <span className={styles.clockDate}>
              {clock.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
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
