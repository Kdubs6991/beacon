import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminLayout from './_Layout'
import InfoPopover from '../../components/InfoPopover'
import styles from './Dashboard.module.css'

const API = import.meta.env.VITE_API_URL ?? ''
const api = (path) =>
  fetch(API + '/api/admin' + path, { credentials: 'include', headers: { 'Content-Type': 'application/json' } }).then(r => r.json())

function formatDate(str) {
  if (!str) return null
  const d = new Date(str + 'T12:00:00')
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
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
  if (photo) {
    return <img src={photo} alt={name} className={styles.miniAvatar} />
  }
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() ?? '?'
  return <div className={`${styles.miniAvatar} ${styles.miniAvatarInitials}`}>{initials}</div>
}

// ── Labels card ───────────────────────────────────────────────────────────────

function LabelsCard({ labels }) {
  const { count = 0, micCount = 0, iemCount = 0, items = [] } = labels ?? {}
  const preview = items.slice(0, 4)

  return (
    <DashCard icon={<LabelIcon />} title="Labels" to="/admin/labels">
      {count === 0 ? (
        <p className={styles.emptyMsg}>No labels yet. Add your mic and IEM inventory in the Labels page.</p>
      ) : (
        <>
          <div className={styles.cardSummary}>
            <span className={styles.summaryChip}>{count} total</span>
            <span className={styles.summaryMeta}>{micCount} mic · {iemCount} IEM</span>
          </div>
          <ul className={styles.itemList}>
            {preview.map(l => (
              <li key={l.id} className={styles.labelItem}>
                <span className={`${styles.labelDot} ${l.type === 'mic' ? styles.labelDotMic : styles.labelDotIem}`} />
                <div className={styles.itemBody}>
                  <span className={styles.itemName}>{l.name}</span>
                  {l.group_name && <span className={styles.itemSub}>{l.group_name}</span>}
                </div>
                <span className={styles.labelTypeTag}>{l.type === 'mic' ? 'Mic' : l.type === 'iem' ? 'IEM' : l.type}</span>
              </li>
            ))}
            {count > 4 && <li className={styles.moreRow}>+{count - 4} more</li>}
          </ul>
        </>
      )}
    </DashCard>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [screens, setScreens] = useState([])
  const [people, setPeople] = useState(null)
  const [labels, setLabels] = useState(null)
  const [pcoConnected, setPcoConnected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    Promise.all([
      api('/dashboard'),
      fetch(API + '/api/pco/status', { credentials: 'include' }).then(r => r.json()).catch(() => ({ connected: false })),
    ])
      .then(([dash, pcoStatus]) => {
        setScreens(dash.screens ?? [])
        setPeople(dash.people ?? null)
        setLabels(dash.labels ?? null)
        setPcoConnected(!!pcoStatus.connected)
        setLoading(false)
      })
      .catch(e => { setError(e.message); setLoading(false) })
  }, [])

  return (
    <AdminLayout title="Dashboard">
      <div className={styles.topBar}>
        <div className={styles.topBarLeft}>
          <h2 className={styles.pageTitle}>Dashboard</h2>
          <InfoPopover docsHref="/docs#dashboard">
            An at-a-glance overview of your active screens, upcoming services, and team roster.
            Click any card header to go to its full management page.
          </InfoPopover>
        </div>
      </div>

      {loading ? (
        <p className={styles.stateMsg}>Loading…</p>
      ) : error ? (
        <p className={styles.stateMsg} style={{ color: '#f87171' }}>{error}</p>
      ) : (
        <div className={styles.cardGrid}>
          <ScreensCard screens={screens} />
          <ServicesCard screens={screens} pcoConnected={pcoConnected} />
          <PeopleCard people={people} pcoConnected={pcoConnected} />
          <LabelsCard labels={labels} />
        </div>
      )}
    </AdminLayout>
  )
}
