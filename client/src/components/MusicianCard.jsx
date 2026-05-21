import styles from './MusicianCard.module.css'

function Avatar({ name, photo, size = 'md' }) {
  const cls = size === 'lg' ? styles.avatarLg : styles.avatar
  const initCls = size === 'lg' ? styles.avatarInitialsLg : styles.avatarInitials
  if (photo) {
    return <img className={cls} src={photo} alt={name} />
  }
  const initials = name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  return <div className={initCls}>{initials}</div>
}

// ── Full card (default): photo + name + mic + IEM ─────────────────────────────
function FullCard({ name, position, photo, mic, iem }) {
  return (
    <div className={styles.card}>
      {photo ? (
        <div className={styles.top}>
          <Avatar name={name} photo={photo} />
          <div className={styles.identity}>
            <span className={styles.name}>{name}</span>
            {position && <span className={styles.position}>{position}</span>}
          </div>
        </div>
      ) : (
        <div className={styles.nameOnly}>
          <span className={styles.nameOnlyText}>{name}</span>
          {position && <span className={styles.position}>{position}</span>}
        </div>
      )}
      <div className={styles.divider} />
      <div className={styles.assignments}>
        <AssignmentRow icon={<MicIcon />} label="Mic" value={mic} colorVar="--mic-color" />
        <AssignmentRow icon={<IemIcon />} label="IEM" value={iem} colorVar="--iem-color" />
      </div>
    </div>
  )
}

// ── Photo-only card: large headshot, no text ──────────────────────────────────
function PhotoCard({ name, photo }) {
  return (
    <div className={styles.cardPhoto}>
      <Avatar name={name} photo={photo} size="lg" />
    </div>
  )
}

// ── Label-only card: name + assignments, no photo ─────────────────────────────
function LabelCard({ name, position, mic, iem }) {
  return (
    <div className={styles.cardLabel}>
      <div className={styles.labelTop}>
        <span className={styles.name}>{name}</span>
        {position && <span className={styles.position}>{position}</span>}
      </div>
      <div className={styles.divider} />
      <div className={styles.assignments}>
        <AssignmentRow icon={<MicIcon />} label="Mic" value={mic} colorVar="--mic-color" />
        <AssignmentRow icon={<IemIcon />} label="IEM" value={iem} colorVar="--iem-color" />
      </div>
    </div>
  )
}

// ── Name-only card: large name text, no photo ─────────────────────────────────
function NameCard({ name, position }) {
  return (
    <div className={styles.cardName}>
      <span className={styles.cardNameText}>{name}</span>
      {position && <span className={styles.nameCardPos}>{position}</span>}
    </div>
  )
}

// ── Empty slot placeholder ────────────────────────────────────────────────────
function EmptyCard() {
  return <div className={styles.cardEmpty} />
}

// ── Public export ─────────────────────────────────────────────────────────────
export default function MusicianCard({ name, position, photo, mic, iem, mode = 'full', empty = false }) {
  if (empty) return <EmptyCard />
  if (mode === 'photo') return <PhotoCard name={name} photo={photo} />
  if (mode === 'name') return <NameCard name={name} position={position} />
  if (mode === 'label') return <LabelCard name={name} position={position} mic={mic} iem={iem} />
  return <FullCard name={name} position={position} photo={photo} mic={mic} iem={iem} />
}

function AssignmentRow({ icon, label, value, colorVar }) {
  return (
    <div className={styles.assignRow}>
      <span className={styles.assignIcon}>{icon}</span>
      <span className={styles.assignLabel}>{label}</span>
      <span
        className={styles.assignValue}
        style={{ color: value ? `var(${colorVar})` : 'var(--text-muted)' }}
      >
        {value ?? '—'}
      </span>
    </div>
  )
}

function MicIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  )
}

function IemIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 18v-6a9 9 0 0 1 18 0v6"/>
      <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z"/>
      <path d="M3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/>
    </svg>
  )
}
