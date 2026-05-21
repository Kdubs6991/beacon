import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import PublicNav from '../components/PublicNav'
import styles from './Display.module.css'

export default function DisplayMobileSetup() {
  const [searchParams] = useSearchParams()
  const sessionId = searchParams.get('session')

  const [step, setStep] = useState('org') // 'org' | 'screen' | 'done' | 'error'
  const [orgInfo, setOrgInfo] = useState(null)

  const [orgSlug, setOrgSlug] = useState('')
  const [orgCode, setOrgCode] = useState('')
  const [orgError, setOrgError] = useState(null)
  const [orgLoading, setOrgLoading] = useState(false)

  const [screenName, setScreenName] = useState('')
  const [screenError, setScreenError] = useState(null)
  const [screenLoading, setScreenLoading] = useState(false)

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

      // Notify the TV
      const completeRes = await fetch('/api/display/setup-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, screenToken: data.screen.token }),
      })
      if (!completeRes.ok) {
        setScreenError('Setup session expired. Please scan the QR code again.')
        return
      }
      setStep('done')
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
            <div className={styles.loginBrand}>Beacon</div>
            <h1 className={styles.loginTitle}>Done!</h1>
            <p className={styles.loginDesc}>
              The TV should now show the <strong>{screenName}</strong> display. You can close this page.
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

  return (
    <>
      <PublicNav />
      <div className={styles.loginPage}>
        <div className={styles.loginCard}>
          <div className={styles.loginBrand}>Beacon — Mobile Setup</div>
          <h1 className={styles.loginTitle}>Select a screen</h1>
          <p className={styles.loginDesc}>Organization: <strong>{orgInfo?.name}</strong></p>
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
              {screenLoading ? 'Setting up...' : 'Set up this TV'}
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
