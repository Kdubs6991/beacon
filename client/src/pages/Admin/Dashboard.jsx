import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import AdminLayout from './_Layout'
import InfoPopover from '../../components/InfoPopover'
import styles from './Dashboard.module.css'

const API = import.meta.env.VITE_API_URL ?? ''
const api = (path, opts = {}) =>
  fetch(API + '/api/admin' + path, { credentials: 'include', headers: { 'Content-Type': 'application/json' }, ...opts }).then(r => r.json())

const DEFAULT_CARDS = [
  { id: 'screens',      visible: true },
  { id: 'services',     visible: true },
  { id: 'people',       visible: true },
  { id: 'labels',       visible: true },
  { id: 'schedules',    visible: true },
  { id: 'templates',    visible: true },
  { id: 'quickactions', visible: true },
  { id: 'activity',     visible: true },
]

function formatDate(str) {
  if (!str) return null
  const d = new Date(str + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function describeCron(expr) {
  const parts = expr?.trim().split(/\s+/)
  if (!parts || parts.length !== 5) return expr ?? ''
  const [min, hour, , , dow] = parts
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  const dayName = days[parseInt(dow, 10)] ?? '?'
  const h = parseInt(hour, 10)
  const m = parseInt(min, 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  const minStr = m === 0 ? '' : `:${String(m).padStart(2, '0')}`
  return `${dayName} at ${h12}${minStr} ${ampm}`
}

function timeAgo(ts) {
  if (!ts) return null
  const diff = Date.now() - new Date(ts).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// ── Icons ────────────────────────────────────────────────────────────────────

function ChevronRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/>
      <line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )
}

function PeopleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="7" r="3"/>
      <path d="M3 20c0-3.3 2.7-6 6-6h0c3.3 0 6 2.7 6 6"/>
      <circle cx="17" cy="8" r="2.5"/>
      <path d="M17 14c2.8 0 5 2.2 5 5"/>
    </svg>
  )
}

function LabelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  )
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  )
}

function LayersIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="12 2 2 7 12 12 22 7 12 2"/>
      <polyline points="2 17 12 22 22 17"/>
      <polyline points="2 12 12 17 22 12"/>
    </svg>
  )
}

function ZapIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
    </svg>
  )
}

function ActivityIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
    </svg>
  )
}

// TV icon with animated green dot for active screens
function LiveScreenIcon({ active }) {
  return (
    <span className={styles.tvWrap}>
      <svg width="18" height="16" viewBox="0 0 22 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="1" y="1" width="20" height="13" rx="2"/>
        <path d="M7 17h8M11 14v3"/>
      </svg>
      {active && <span className={styles.tvDot} aria-label="Live" />}
    </span>
  )
}

// ── Shared card shell ────────────────────────────────────────────────────────

function DashCard({ icon, title, to, children }) {
  const navigate = useNavigate()
  return (
    <div className={styles.card}>
      <button className={styles.cardHeader} onClick={() => navigate(to)}>
        <div className={styles.cardHeaderLeft}>
          <span className={styles.cardIcon}>{icon}</span>
          <span className={styles.cardTitle}>{title}</span>
        </div>
        <span className={styles.cardChevron}><ChevronRightIcon /></span>
      </button>
      <div className={styles.cardBody}>{children}</div>
    </div>
  )
}

// ── Tab toggle shared component ───────────────────────────────────────────────

function TabRow({ tabs, active, onChange }) {
  return (
    <div className={styles.tabRow}>
      {tabs.map(([val, label]) => (
        <button
          key={val}
          className={`${styles.tabBtn} ${active === val ? styles.tabBtnActive : ''}`}
          onClick={() => onChange(val)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function NotConnected({ hint }) {
  return (
    <div className={styles.notConnected}>
      <div className={styles.notConnectedDot} />
      <div>
        <p className={styles.notConnectedTitle}>Planning Center not connected</p>
        <p className={styles.notConnectedHint}>{hint}</p>
      </div>
    </div>
  )
}

// ── Screens card ─────────────────────────────────────────────────────────────

function ScreensCard({ screens }) {
  const activeCount = screens.filter(s => s.is_active).length

  return (
    <DashCard
      icon={<LiveScreenIcon active={false} />}
      title="Screens"
      to="/admin/screens"
    >
      {screens.length === 0 ? (
        <p className={styles.emptyMsg}>No screens configured yet. Head to the Screens page to add one.</p>
      ) : (
        <>
          <div className={styles.cardSummary}>
            <span className={`${styles.summaryChip} ${activeCount > 0 ? styles.summaryChipActive : ''}`}>
              {activeCount} active
            </span>
            <span className={styles.summaryMeta}>of {screens.length} total</span>
          </div>
          <ul className={styles.itemList}>
            {screens.slice(0, 4).map(s => (
              <li key={s.id} className={styles.screenItem}>
                <LiveScreenIcon active={s.is_active} />
                <div className={styles.itemBody}>
                  <div className={styles.itemRow}>
                    <span className={styles.itemName}>{s.name}</span>
                    {s.campus_name && (
                      <span className={styles.locationTag}>{s.campus_name}</span>
                    )}
                  </div>
                  <span className={styles.itemSub}>
                    {s.event_name
                      ? `${s.event_name}${s.musicians?.length ? ` · ${s.musicians.length} musicians` : ''}`
                      : 'No assignments'
                    }
                  </span>
                </div>
                {s.is_active && <span className={styles.livePill}>Live</span>}
              </li>
            ))}
            {screens.length > 4 && <li className={styles.moreRow}>+{screens.length - 4} more</li>}
          </ul>
        </>
      )}
    </DashCard>
  )
}

// ── Services card ────────────────────────────────────────────────────────────

function ServicesCard({ screens, pcoConnected }) {
  const [tab, setTab] = useState('manual')
  const manualServices = screens.filter(s => s.musicians?.length > 0)

  return (
    <DashCard icon={<CalendarIcon />} title="Services" to="/admin/screens">
      <TabRow tabs={[['manual', 'Manual'], ['pco', 'PCO']]} active={tab} onChange={setTab} />

      {tab === 'manual' && (
        manualServices.length === 0 ? (
          <p className={styles.emptyMsg}>No active assignments. Push musicians to a screen to see them here.</p>
        ) : (
          <ul className={styles.itemList}>
            {manualServices.slice(0, 4).map(s => (
              <li key={s.id} className={styles.serviceItem}>
                <div className={styles.serviceTop}>
                  <span className={styles.itemName}>{s.event_name ?? 'Unnamed Service'}</span>
                  {s.event_date && <span className={styles.dateChip}>{formatDate(s.event_date)}</span>}
                </div>
                <span className={styles.itemSub}>
                  {s.name}{s.campus_name ? ` · ${s.campus_name}` : ''} · {s.musicians.length} musician{s.musicians.length !== 1 ? 's' : ''}
                </span>
              </li>
            ))}
            {manualServices.length > 4 && <li className={styles.moreRow}>+{manualServices.length - 4} more</li>}
          </ul>
        )
      )}

      {tab === 'pco' && (
        pcoConnected === null ? (
          <p className={styles.emptyMsg}>Checking connection…</p>
        ) : pcoConnected ? (
          <p className={styles.emptyMsg}>PCO connected — upcoming services coming soon.</p>
        ) : (
          <NotConnected hint="Connect your PCO account in Settings to pull upcoming services automatically." />
        )
      )}
    </DashCard>
  )
}

// ── People card ───────────────────────────────────────────────────────────────

function PeopleCard({ people, pcoConnected }) {
  const [tab, setTab] = useState('manual')
  const { count = 0, pcoCount = 0, preview = [] } = people ?? {}
  const manualCount = count - pcoCount

  return (
    <DashCard icon={<PeopleIcon />} title="People" to="/admin/people">
      <TabRow tabs={[['manual', 'Manual'], ['pco', 'PCO']]} active={tab} onChange={setTab} />

      {tab === 'manual' && (
        count === 0 ? (
          <p className={styles.emptyMsg}>No people added yet. Go to the People page to add your worship team.</p>
        ) : (
          <>
            <div className={styles.cardSummary}>
              <span className={styles.summaryChip}>{count} people</span>
              {pcoCount > 0 && <span className={styles.summaryMeta}>{pcoCount} from PCO</span>}
            </div>
            <ul className={styles.itemList}>
              {preview.slice(0, 4).map(p => (
                <li key={p.id} className={styles.personItem}>
                  <MiniAvatar name={p.name} photo={p.photo_override ?? p.photo_url} />
                  <div className={styles.itemBody}>
                    <span className={styles.itemName}>{p.name}</span>
                    {p.position && <span className={styles.itemSub}>{p.position}</span>}
                  </div>
                </li>
              ))}
              {count > 4 && (
                <li className={styles.moreRow}>+{count - 4} more</li>
              )}
            </ul>
          </>
        )
      )}

      {tab === 'pco' && (
        pcoConnected === null ? (
          <p className={styles.emptyMsg}>Checking connection…</p>
        ) : pcoConnected ? (
          <div>
            <div className={styles.cardSummary}>
              <span className={styles.summaryChip}>{pcoCount} from PCO</span>
              <span className={styles.summaryMeta}>{manualCount} manual</span>
            </div>
            <p className={styles.emptyMsg}>PCO sync management coming soon.</p>
          </div>
        ) : (
          <NotConnected hint="Connect your PCO account in Settings to sync your team roster automatically." />
        )
      )}
    </DashCard>
  )
}

function MiniAvatar({ name, photo }) {
  const [imgError, setImgError] = useState(false)
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'
  if (photo && !imgError) {
    return <img src={photo} alt={name} className={styles.miniAvatar} onError={() => setImgError(true)} />
  }
  return <div className={`${styles.miniAvatar} ${styles.miniAvatarInitials}`}>{initials}</div>
}

// ── Labels card ───────────────────────────────────────────────────────────────

function LabelsCard({ labels }) {
  const { count = 0, micCount = 0, iemCount = 0, positionCount = 0, items = [], total = 0 } = labels ?? {}

  return (
    <DashCard icon={<LabelIcon />} title="Labels" to="/admin/labels">
      {total === 0 ? (
        <p className={styles.emptyMsg}>No labels yet. Add your mic and IEM inventory in the Labels page.</p>
      ) : (
        <>
          <div className={styles.cardSummary}>
            <span className={styles.summaryChip}>{count} labels</span>
            <span className={styles.summaryMeta}>
              {micCount} mic · {iemCount} IEM{positionCount > 0 ? ` · ${positionCount} positions` : ''}
            </span>
          </div>
          <ul className={styles.itemList}>
            {items.map(l => (
              <li key={`${l.type}-${l.id}`} className={styles.labelItem}>
                <span className={`${styles.labelDot} ${l.type === 'mic' ? styles.labelDotMic : l.type === 'iem' ? styles.labelDotIem : styles.labelDotPosition}`} />
                <div className={styles.itemBody}>
                  <span className={styles.itemName}>{l.name}</span>
                  {l.group_name && <span className={styles.itemSub}>{l.group_name}</span>}
                </div>
                <span className={styles.labelTypeTag}>{l.type === 'mic' ? 'Mic' : l.type === 'iem' ? 'IEM' : 'Position'}</span>
              </li>
            ))}
            {total > items.length && <li className={styles.moreRow}>+{total - items.length} more</li>}
          </ul>
        </>
      )}
    </DashCard>
  )
}

// ── Schedules card ────────────────────────────────────────────────────────────

function SchedulesCard({ schedules }) {
  const enabledCount = schedules.filter(s => s.enabled).length
  return (
    <DashCard icon={<ClockIcon />} title="Schedules" to="/admin/schedules">
      {schedules.length === 0 ? (
        <p className={styles.emptyMsg}>No schedules configured yet. Go to Services to set up auto-sync.</p>
      ) : (
        <>
          <div className={styles.cardSummary}>
            <span className={`${styles.summaryChip} ${enabledCount > 0 ? styles.summaryChipActive : ''}`}>
              {enabledCount} active
            </span>
            <span className={styles.summaryMeta}>of {schedules.length} total</span>
          </div>
          <ul className={styles.itemList}>
            {schedules.slice(0, 4).map(s => (
              <li key={s.id} className={styles.scheduleItem}>
                <div className={styles.itemBody}>
                  <span className={styles.itemName}>{s.service_type_name}</span>
                  <div className={styles.itemRow}>
                    <span className={styles.itemSub}>{describeCron(s.cron_expr)}</span>
                    {s.last_run && <span className={styles.itemSub}>· {timeAgo(s.last_run)}</span>}
                  </div>
                </div>
                <span className={`${styles.scheduleStatus} ${s.enabled ? styles.scheduleStatusOn : styles.scheduleStatusOff}`}>
                  {s.enabled ? 'On' : 'Off'}
                </span>
              </li>
            ))}
            {schedules.length > 4 && <li className={styles.moreRow}>+{schedules.length - 4} more</li>}
          </ul>
        </>
      )}
    </DashCard>
  )
}

// ── Templates card ────────────────────────────────────────────────────────────

function TemplatesCard({ templates }) {
  const totalScreens = templates.reduce((n, t) => n + (t.screen_count ?? 0), 0)
  return (
    <DashCard icon={<LayersIcon />} title="Templates" to="/admin/templates">
      {templates.length === 0 ? (
        <p className={styles.emptyMsg}>No templates yet. Create one to customize your display layout.</p>
      ) : (
        <>
          <div className={styles.cardSummary}>
            <span className={styles.summaryChip}>{templates.length} template{templates.length !== 1 ? 's' : ''}</span>
            <span className={styles.summaryMeta}>{totalScreens} screen{totalScreens !== 1 ? 's' : ''} using</span>
          </div>
          <ul className={styles.itemList}>
            {templates.slice(0, 4).map(t => (
              <li key={t.id} className={styles.templateItem}>
                <div className={styles.itemBody}>
                  <span className={styles.itemName}>{t.name}</span>
                </div>
                {t.screen_count > 0 && (
                  <span className={styles.screenCountTag}>{t.screen_count} screen{t.screen_count !== 1 ? 's' : ''}</span>
                )}
              </li>
            ))}
            {templates.length > 4 && <li className={styles.moreRow}>+{templates.length - 4} more</li>}
          </ul>
        </>
      )}
    </DashCard>
  )
}

// ── Quick push card ───────────────────────────────────────────────────────────

function QuickActionsCard({ serviceTypes, screens }) {
  const [pushingId, setPushingId] = useState(null)
  const [resultId, setResultId] = useState(null)
  const [pushMsg, setPushMsg] = useState(null)

  async function push(st) {
    if (pushingId) return
    setPushingId(st.id); setResultId(null); setPushMsg(null)
    let screenIds
    if (st.schedule_screen_ids) {
      try { screenIds = JSON.parse(st.schedule_screen_ids) } catch { screenIds = null }
    }
    if (!screenIds?.length) screenIds = screens.map(s => s.id)
    try {
      const result = await api(`/service-types/${st.id}/push`, { method: 'POST', body: JSON.stringify({ screen_ids: screenIds }) })
      if (result.error) throw new Error(result.error)
      const msg = result.pushed > 0
        ? `✓ ${result.pushed} musician${result.pushed !== 1 ? 's' : ''} pushed`
        : '⚠ Pushed but no musicians found'
      setResultId(st.id)
      setPushMsg(msg)
      setTimeout(() => { setResultId(null); setPushMsg(null) }, 4000)
    } catch (err) {
      setResultId(st.id)
      setPushMsg(`✕ ${err.message}`)
      setTimeout(() => { setResultId(null); setPushMsg(null) }, 6000)
    }
    finally { setPushingId(null) }
  }

  return (
    <DashCard icon={<ZapIcon />} title="Quick Push" to="/admin/schedules">
      {serviceTypes.length === 0 ? (
        <p className={styles.emptyMsg}>No service types configured. Add one in Services.</p>
      ) : (
        <>
          {resultId && pushMsg && (
            <p className={`${styles.pushResult} ${pushMsg.startsWith('✕') ? styles.pushResultErr : pushMsg.startsWith('⚠') ? styles.pushResultWarn : styles.pushResultOk}`}>
              {pushMsg}
            </p>
          )}
          <ul className={styles.itemList}>
            {serviceTypes.slice(0, 5).map(st => (
              <li key={st.id} className={styles.qaItem}>
                <div className={styles.itemBody}>
                  <span className={styles.itemName}>{st.name}</span>
                  <span className={styles.itemSub}>{st.mode === 'pco' ? 'PCO sync' : 'Manual'}</span>
                </div>
                <button
                  type="button"
                  className={styles.btnPush}
                  onClick={() => push(st)}
                  disabled={pushingId !== null}
                >
                  {pushingId === st.id ? '…' : 'Push'}
                </button>
              </li>
            ))}
            {serviceTypes.length > 5 && <li className={styles.moreRow}>+{serviceTypes.length - 5} more</li>}
          </ul>
        </>
      )}
    </DashCard>
  )
}

// ── Recent activity card ──────────────────────────────────────────────────────

function ActivityCard({ screens }) {
  const withActivity = screens
    .filter(s => s.updated_at)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))

  return (
    <DashCard icon={<ActivityIcon />} title="Recent Activity" to="/admin/screens">
      {withActivity.length === 0 ? (
        <p className={styles.emptyMsg}>No recent activity. Push a service to a screen to see updates here.</p>
      ) : (
        <ul className={styles.itemList}>
          {withActivity.slice(0, 5).map(s => (
            <li key={s.id} className={styles.activityItem}>
              <div className={styles.itemBody}>
                <span className={styles.itemName}>{s.name}</span>
                {s.event_name && <span className={styles.itemSub}>{s.event_name}</span>}
              </div>
              <span className={styles.activityTime}>{timeAgo(s.updated_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </DashCard>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [screens, setScreens] = useState([])
  const [people, setPeople] = useState(null)
  const [labels, setLabels] = useState(null)
  const [schedules, setSchedules] = useState([])
  const [templates, setTemplates] = useState([])
  const [serviceTypes, setServiceTypes] = useState([])
  const [pcoConnected, setPcoConnected] = useState(null)
  const [cardConfig, setCardConfig] = useState(DEFAULT_CARDS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([
      api('/dashboard'),
      fetch(API + '/api/pco/status', { credentials: 'include' }).then(r => r.json()).catch(() => ({ connected: false })),
      fetch(API + '/api/auth/dashboard-config', { credentials: 'include' }).then(r => r.json()).catch(() => ({ config: null })),
    ])
      .then(([dash, pcoStatus, configRes]) => {
        setScreens(dash.screens ?? [])
        setPeople(dash.people ?? null)
        setLabels(dash.labels ?? null)
        setSchedules(dash.schedules ?? [])
        setTemplates(dash.templates ?? [])
        setServiceTypes(dash.serviceTypes ?? [])
        setPcoConnected(!!pcoStatus.connected)
        const saved = configRes.config
        if (saved?.length) {
          const merged = saved.filter(c => DEFAULT_CARDS.some(d => d.id === c.id))
          const missing = DEFAULT_CARDS.filter(d => !merged.some(m => m.id === d.id))
          setCardConfig([...merged, ...missing])
        }
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  function renderCard(card) {
    if (card.id === 'screens')      return <ScreensCard      key="screens"      screens={screens} />
    if (card.id === 'services')     return <ServicesCard     key="services"     screens={screens} pcoConnected={pcoConnected} />
    if (card.id === 'people')       return <PeopleCard       key="people"       people={people} pcoConnected={pcoConnected} />
    if (card.id === 'labels')       return <LabelsCard       key="labels"       labels={labels} />
    if (card.id === 'schedules')    return <SchedulesCard    key="schedules"    schedules={schedules} />
    if (card.id === 'templates')    return <TemplatesCard    key="templates"    templates={templates} />
    if (card.id === 'quickactions') return <QuickActionsCard key="quickactions" serviceTypes={serviceTypes} screens={screens} />
    if (card.id === 'activity')     return <ActivityCard     key="activity"     screens={screens} />
    return null
  }

  return (
    <AdminLayout title="Dashboard">
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <h2 className={styles.pageTitle}>Dashboard</h2>
          <InfoPopover title="Dashboard" docsHref="/docs#dashboard">
            <p>Your at-a-glance view of everything running in Beacon. Eight cards each show a live snapshot of one area — click any card's title bar to go to its full management page.</p>
            <p><strong>Screens</strong> shows which TVs are live right now. <strong>Services</strong> shows what's currently pushed to those screens. <strong>Quick Push</strong> lets you push a service's team to screens immediately — useful before a service or when the roster changes mid-week. <strong>Schedules</strong> shows your auto-push timers and when they last fired. <strong>Recent Activity</strong> shows which screens were updated most recently.</p>
            <p>Hide cards or drag them into a different order using <strong>Customize dashboard →</strong> above.</p>
          </InfoPopover>
        </div>
        <Link to="/admin/profile#dashboard" className={styles.customizeLink}>Customize dashboard →</Link>
      </div>

      {loading ? (
        <p className={styles.stateMsg}>Loading…</p>
      ) : error ? (
        <p className={styles.stateMsg} style={{ color: '#f87171' }}>{error}</p>
      ) : (
        <div className={styles.cardGrid}>
          {cardConfig.filter(c => c.visible).map(renderCard)}
        </div>
      )}
    </AdminLayout>
  )
}
