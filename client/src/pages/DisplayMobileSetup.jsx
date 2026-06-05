import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import PublicNav from '../components/PublicNav'
import styles from './Display.module.css'

export default function DisplayMobileSetup() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session')

  const [step, setStep] = useState('org') // 'org' | 'screen' | 'done'
  const [orgInfo, setOrgInfo] = useState(null)

  const [orgSlug, setOrgSlug] = useState('')
  const [orgCode, setOrgCode] = useState('')
  const [orgError, setOrgError] = useState(null)
  const [orgLoading, setOrgLoading] = useState(false)

  const [screens, setScreens] = useState([])
  const [screensLoading, setScreensLoading] = useState(false)
  const [newScreenName, setNewScreenName] = useState('')
  const [screenError, setScreenError] = useState(null)
  const [screenLoading, setScreenLoading] = useState(false)
  const [completedScreenName, setCompletedScreenName] = useState('')

  useEffect(() => {
    if (step !== 'screen' || !orgInfo) return
    setScreensLoading(true)
    fetch(`/api/display/auth/screens?org_id=${orgInfo.id}`)
      .then(r => r.json())
      .then(data => setScreens(data.screens ?? []))
      .catch(() => setScreens([]))
      .finally(() => setScreensLoading(false))
  }, [step, orgInfo])

  if (!sessionId) {
    return (
      <>
        <PublicNav />
        <div className={styles.loginPage}>
          <div className={styles.loginCard}>
            <div className={styles.loginBrand}>Beacon</div>
            <p className={styles.loginDesc}>Invalid setup link. Please scan the QR code on the TV again.</p>
            <Link to="/display" className={styles.loginBtn} style={{ textAlign: 'center', display: 'block' }}>Go to display login</Link>
          </div>
        </div>
      </>
    )
  }

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
      setOrgInfo(data.org)
      setStep('screen')
    } catch {
      setOrgError('Connection error. Please try again.')
    } finally {
      setOrgLoading(false)
    }
  }

  async function completeWithToken(token, name) {
    const completeRes = await fetch('/api/display/setup-complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, screenToken: token }),
    })
    if (!completeRes.ok) {
      setScreenError('Setup session expired. Please scan the QR code again.')
      return false
    }
    setCompletedScreenName(name)
    setStep('done')
    return true
  }

  async function handleSelectScreen(screen) {
    setScreenError(null)
    setScreenLoading(true)
    try {
      await completeWithToken(screen.token, screen.name)
    } catch {
      setScreenError('Connection error. Please try again.')
    } finally {
      setScreenLoading(false)
    }
  }

  async function handleCreateScreen(e) {
    e.preventDefault()
    if (!newScreenName.trim()) return
    setScreenError(null)
    setScreenLoading(true)
    try {
      const res = await fetch('/api/display/auth/screen/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgInfo.id, screen_name: newScreenName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setScreenError(data.error || 'Failed to create screen'); return }
      await completeWithToken(data.screen.token, data.screen.name)
    } catch {
      setScreenError('Connection error. Please try again.')
    } finally {
      setScreenLoading(false)
    }
  }

  if (step === 'done') {
    return (
      <>
        <PublicNav />
        <div className={styles.loginPage}>
          <div className={styles.loginCard}>
            <div className={styles.loginBrand}>Beacon — Mobile Setup</div>
            <div className={styles.createdCheck}>✓</div>
            <h1 className={styles.loginTitle}>Done!</h1>
            <p className={styles.loginDesc}>
              The TV should now show the <strong>{completedScreenName}</strong> display. You can close this page.
            </p>
          </div>
        </div>
      </>
    )
  }

  if (step === 'org') {
    return (
      <>
        <PublicNav />
        <div className={styles.loginPage}>
          <div className={styles.loginCard}>
            <div className={styles.loginBrand}>Beacon — Mobile Setup</div>
            <h1 className={styles.loginTitle}>Connect the TV</h1>
            <p className={styles.loginDesc}>Enter your organization credentials to set up this display screen.</p>
            <form className={styles.loginForm} onSubmit={handleOrgSubmit}>
              <input
                className={styles.loginInput}
                type="text"
                placeholder="Organization code (e.g. mychurch)"
                value={orgSlug}
                onChange={e => setOrgSlug(e.target.value)}
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
                onChange={e => setOrgCode(e.target.value)}
                autoCapitalize="characters"
                autoCorrect="off"
                required
              />
              {orgError && <div className={styles.loginError}>{orgError}</div>}
              <button className={styles.loginBtn} type="submit" disabled={orgLoading}>
                {orgLoading ? 'Connecting...' : 'Continue'}
              </button>
            </form>
          </div>
        </div>
      </>
    )
  }

  // step === 'screen'
  return (
    <>
      <PublicNav />
      <div className={styles.loginPage}>
        <div className={`${styles.loginCard} ${styles.loginCardWide}`}>
          <div className={styles.loginBrand}>Beacon — Mobile Setup</div>
          <h1 className={styles.loginTitle}>Choose a screen for this TV</h1>
          <p className={styles.loginDesc}>Organization: <strong>{orgInfo?.name}</strong></p>

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
                  <button
                    className={styles.screenItemBtn}
                    type="button"
                    disabled={screenLoading}
                    onClick={() => handleSelectScreen(s)}
                  >
                    Select
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
              placeholder="New screen name (e.g. Main Stage)"
              value={newScreenName}
              onChange={e => setNewScreenName(e.target.value)}
              autoFocus={screens.length === 0}
            />
            {screenError && <div className={styles.loginError}>{screenError}</div>}
            <button className={styles.loginBtn} type="submit" disabled={screenLoading || !newScreenName.trim()}>
              {screenLoading ? 'Setting up…' : 'Create & use this screen'}
            </button>
          </form>

          <div className={styles.loginFooter}>
            <button className={styles.loginLink} type="button" onClick={() => { setOrgInfo(null); setStep('org') }}>
              Wrong organization?
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
