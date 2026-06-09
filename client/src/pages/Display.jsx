import { useEffect, useState, useCallback, useRef } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
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
  const [exitVisible, setExitVisible] = useState(false)
  const exitTimerRef = useRef(null)

  useEffect(() => {
    function showExit() {
      setExitVisible(true)
      clearTimeout(exitTimerRef.current)
      exitTimerRef.current = setTimeout(() => setExitVisible(false), 3000)
    }
    window.addEventListener('mousemove', showExit)
    window.addEventListener('touchstart', showExit)
    return () => {
      window.removeEventListener('mousemove', showExit)
      window.removeEventListener('touchstart', showExit)
      clearTimeout(exitTimerRef.current)
    }
  }, [])

  async function handleExit() {
    clearCookie('beacon_screen')
    try { await fetch(`/api/display/${screenToken}/leave`, { method: 'POST' }) } catch {}
    window.location.href = '/display?setup=1'
  }

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
      <button
        className={`${styles.exitBtn} ${exitVisible ? styles.exitBtnVisible : ''}`}
        type="button"
        onClick={handleExit}
        onFocus={() => { setExitVisible(true); clearTimeout(exitTimerRef.current) }}
        onBlur={() => { exitTimerRef.current = setTimeout(() => setExitVisible(false), 1500) }}
        style={{ top: '68px', bottom: 'auto' }}
      >
        Exit display
      </button>
    </div>
  )
}

export default function Display() {
  const { token } = useParams()
  if (token) return <DisplayView screenToken={token} />
  return <CookieDisplay />
}

function CookieDisplay() {
  const [searchParams] = useSearchParams()
  const isSetupMode = searchParams.get('setup') === '1'

  // 'checking' | 'org-auth' | 'screen-pick' | 'screen-created' | 'display'
  const [step, setStep] = useState('checking')
  const [screenToken, setScreenToken] = useState(null)
  const [orgInfo, setOrgInfo] = useState(null)

  // Org auth
  const [orgSlug, setOrgSlug] = useState('')
  const [orgCode, setOrgCode] = useState('')
  const [orgError, setOrgError] = useState(null)
  const [orgLoading, setOrgLoading] = useState(false)

  // Screen picker
  const [screens, setScreens] = useState([])
  const [screensLoading, setScreensLoading] = useState(false)

  // New screen
  const [newScreenName, setNewScreenName] = useState('')
  const [newScreenLoading, setNewScreenLoading] = useState(false)
  const [newScreenError, setNewScreenError] = useState(null)
  const [createdScreen, setCreatedScreen] = useState(null)

  // QR codes
  const [qrSessionId, setQrSessionId] = useState(null)
  const [remoteQrUrl, setRemoteQrUrl] = useState(null)
  const [adminQrUrl, setAdminQrUrl] = useState(null)

  // Initial cookie check
  useEffect(() => {
    const savedScreen = getCookie('beacon_screen')
    const savedOrgRaw = getCookie('beacon_org')
    const savedOrg = savedOrgRaw ? (() => { try { return JSON.parse(savedOrgRaw) } catch { return null } })() : null

    if (isSetupMode) {
      clearCookie('beacon_screen')
      if (savedOrg) { setOrgInfo(savedOrg); setStep('screen-pick') }
      else setStep('org-auth')
      return
    }

    if (savedScreen) {
      fetch(`/api/display/${savedScreen}`)
        .then(r => {
          if (r.ok) { setScreenToken(savedScreen); setStep('display') }
          else if (r.status === 404) {
            clearCookie('beacon_screen')
            if (savedOrg) { setOrgInfo(savedOrg); setStep('screen-pick') }
            else setStep('org-auth')
          } else { setScreenToken(savedScreen); setStep('display') }
        })
        .catch(() => { setScreenToken(savedScreen); setStep('display') })
    } else if (savedOrg) {
      setOrgInfo(savedOrg)
      setStep('screen-pick')
    } else {
      setStep('org-auth')
    }
  }, [isSetupMode])

  // Fetch screens list when entering screen-pick
  useEffect(() => {
    if (step !== 'screen-pick' || !orgInfo) return
    setScreensLoading(true)
    fetch(`/api/display/auth/screens?org_id=${orgInfo.id}`)
      .then(r => r.json())
      .then(data => setScreens(data.screens ?? []))
      .catch(() => setScreens([]))
      .finally(() => setScreensLoading(false))
  }, [step, orgInfo])

  // QR for remote phone-based setup (existing flow — lets a phone set up this device)
  useEffect(() => {
    if (step !== 'screen-pick') return
    let cancelled = false
    fetch('/api/display/setup-init', { method: 'POST' })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        setQrSessionId(data.sessionId)
        const url = `${window.location.origin}/display/setup?session=${data.sessionId}`
        return QRCode.toDataURL(url, { width: 160, margin: 2, color: { dark: '#0f0f0f', light: '#ffffff' } })
      })
      .then(url => { if (url && !cancelled) setRemoteQrUrl(url) })
      .catch(() => {})
    return () => { cancelled = true }
  }, [step])

  // Poll for phone completing QR setup
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

  // Admin QR after screen creation
  useEffect(() => {
    if (step !== 'screen-created') return
    const adminUrl = `${window.location.origin}/org`
    QRCode.toDataURL(adminUrl, { width: 160, margin: 2, color: { dark: '#0f0f0f', light: '#ffffff' } })
      .then(setAdminQrUrl)
      .catch(() => {})
  }, [step])

  async function handleOrgSubmit(e) {
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
      setOrgInfo(data.org)
      setStep('screen-pick')
    } catch {
      setOrgError('Connection error. Please try again.')
    } finally {
      setOrgLoading(false)
    }
  }

  function selectScreen(token) {
    setCookie('beacon_screen', token)
    setScreenToken(token)
    setStep('display')
  }

  async function handleCreateScreen(e) {
    e.preventDefault()
    if (!newScreenName.trim()) return
    setNewScreenError(null)
    setNewScreenLoading(true)
    try {
      const res = await fetch('/api/display/auth/screen/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgInfo.id, screen_name: newScreenName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setNewScreenError(data.error || 'Failed to create screen'); return }
      setCreatedScreen(data.screen)
      setCookie('beacon_screen', data.screen.token)
      setScreenToken(data.screen.token)
      setStep('screen-created')
    } catch {
      setNewScreenError('Connection error. Please try again.')
    } finally {
      setNewScreenLoading(false)
    }
  }

  function handleWrongOrg() {
    clearCookie('beacon_org')
    clearCookie('beacon_screen')
    setOrgInfo(null)
    setOrgSlug('')
    setOrgCode('')
    setStep('org-auth')
  }

  if (step === 'checking') {
    return <div className={styles.loadingState}><div className={styles.spinner} /></div>
  }

  if (step === 'display' && screenToken) {
    return <DisplayView screenToken={screenToken} />
  }

  if (step === 'org-auth') {
    return (
      <>
        <PublicNav />
        <div className={styles.loginPage}>
          <div className={styles.loginCard}>
            <div className={styles.loginBrand}>Beacon — Display Setup</div>
            <h1 className={styles.loginTitle}>Connect to your organization</h1>
            <p className={styles.loginDesc}>Enter your org credentials to get started.</p>
            <form className={styles.loginForm} onSubmit={handleOrgSubmit}>
              <input
                className={styles.loginInput}
                type="text"
                placeholder="Organization code (e.g. mychurch)"
                value={orgSlug}
                onChange={e => setOrgSlug(e.target.value.toLowerCase().replace(/ /g, '-').replace(/[^a-z0-9-]/g, ''))}
                autoFocus
                autoCapitalize="none"
                autoCorrect="off"
                required
              />
              <input
                className={styles.loginInput}
                type="text"
                placeholder="Access code (e.g. ABC123)"
                value={orgCode}
                onChange={e => setOrgCode(e.target.value.toUpperCase())}
                autoCapitalize="characters"
                autoCorrect="off"
                required
              />
              {orgError && <div className={styles.loginError}>{orgError}</div>}
              <button className={styles.loginBtn} type="submit" disabled={orgLoading}>
                {orgLoading ? 'Connecting…' : 'Continue'}
              </button>
            </form>
          </div>
        </div>
      </>
    )
  }

  if (step === 'screen-pick') {
    return (
      <>
        <PublicNav />
        <div className={styles.loginPage}>
          <div className={`${styles.loginCard} ${styles.loginCardWide}`}>
            <div className={styles.loginBrand}>Beacon — Display Setup</div>
            <h1 className={styles.loginTitle}>Choose a screen</h1>
            <p className={styles.loginDesc}>Organization: <strong>{orgInfo?.short_name || orgInfo?.name}</strong></p>

            {screensLoading ? (
              <div className={styles.screenListLoading}><div className={styles.spinner} /></div>
            ) : screens.length > 0 && (
              <ul className={styles.screenList}>
                {screens.map(s => (
                  <li key={s.id} className={styles.screenItem}>
                    <div className={styles.screenItemInfo}>
                      <span className={styles.screenItemName}>{s.name}</span>
                      {!!s.is_active && <span className={styles.screenItemLive}>Live</span>}
                    </div>
                    <button className={styles.screenItemBtn} type="button" onClick={() => selectScreen(s.token)}>
                      Use this screen
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className={styles.loginDivider}>{screens.length > 0 ? 'or create new' : 'create a screen'}</div>

            <form className={styles.loginForm} onSubmit={handleCreateScreen}>
              <input
                className={styles.loginInput}
                type="text"
                placeholder="Screen name (e.g. Main Stage, Green Room)"
                value={newScreenName}
                onChange={e => setNewScreenName(e.target.value)}
                autoFocus={screens.length === 0}
              />
              {newScreenError && <div className={styles.loginError}>{newScreenError}</div>}
              <button className={styles.loginBtn} type="submit" disabled={newScreenLoading || !newScreenName.trim()}>
                {newScreenLoading ? 'Creating…' : 'Create new screen'}
              </button>
            </form>

            {remoteQrUrl && (
              <>
                <div className={styles.loginDivider}>or set up from another device</div>
                <div className={styles.qrRow}>
                  <img src={remoteQrUrl} alt="Scan to set up from another device" className={styles.qrImgSmall} />
                  <p className={styles.qrHint}>Scan with a phone to configure this display remotely</p>
                </div>
              </>
            )}

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

  if (step === 'screen-created') {
    return (
      <>
        <PublicNav />
        <div className={styles.loginPage}>
          <div className={styles.loginCard}>
            <div className={styles.loginBrand}>Beacon — Display Setup</div>
            <div className={styles.createdCheck}>✓</div>
            <h1 className={styles.loginTitle}>Screen created!</h1>
            <p className={styles.loginDesc}>
              <strong>{createdScreen?.name}</strong> is ready. Open the display now, or sign in to the admin panel to configure its layout and push schedule.
            </p>
            <button className={styles.loginBtn} type="button" onClick={() => setStep('display')}>
              Open display on this screen →
            </button>
            <div className={styles.loginDivider}>admin access</div>
            <div className={styles.adminLinkRow}>
              <a href="/org" className={styles.loginLink} style={{ whiteSpace: 'nowrap' }}>Sign in to Admin →</a>
              {adminQrUrl && (
                <div className={styles.adminQrWrap}>
                  <img src={adminQrUrl} alt="Admin login QR" className={styles.qrImgSmall} />
                  <p className={styles.qrHint}>Opens the Beacon admin panel</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </>
    )
  }

  return null
}
