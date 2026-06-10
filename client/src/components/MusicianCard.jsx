import { useState } from 'react'
import styles from './MusicianCard.module.css'

function Avatar({ name, photo, size = 'md' }) {
  const [imgError, setImgError] = useState(false)
  const cls = size === 'lg' ? styles.avatarLg : styles.avatar
  const initCls = size === 'lg' ? styles.avatarInitialsLg : styles.avatarInitials
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  if (photo && !imgError) {
    return <img className={cls} src={photo} alt={name} onError={() => setImgError(true)} />
  }
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

// ── Photo-only card: large headshot, position badge overlay at bottom ─────────
function PhotoCard({ name, photo, position }) {
  const [imgError, setImgError] = useState(false)
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className={styles.cardPhoto}>
      {photo && !imgError
        ? <img className={styles.avatarLg} src={photo} alt={name} onError={() => setImgError(true)} />
        : <div className={styles.avatarInitialsFull}>{initials}</div>
      }
      {position && (
        <div className={styles.photoCardOverlay}>
          <span className={styles.position}>{position}</span>
        </div>
      )}
    </div>
  )
}

// ── Label-only card: centered, scales with label count (max 3) ───────────────
function LabelCard({ name, position, mic, iem, resolvedLabels, showName }) {
  if (resolvedLabels && resolvedLabels.length > 0) {
    const labels = resolvedLabels.slice(0, 3)
    return (
      <div className={styles.cardLabelCentered} data-count={labels.length}>
        {showName && name && (
          <div className={styles.labelScaleName}>
            <span className={styles.labelScaleNameText}>
              {name}{position ? ` · ${position}` : ''}
            </span>
          </div>
        )}
        <div className={styles.labelScaleList}>
          {labels.map((label, i) => (
            <div key={i} className={styles.labelScaleRow}>
              <span className={styles.labelScaleIcon}>
                {label.type === 'mic' ? <MicIcon /> : <IemIcon />}
              </span>
              <span
                className={styles.labelScaleValue}
                style={{ color: `var(--${label.type}-color)` }}
              >
                {label.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    )
  }
  // Legacy fallback when no slot labels configured
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

// ── Name-only card: large name text, no position ─────────────────────────────
function NameCard({ name }) {
  return (
    <div className={styles.cardName}>
      <span className={styles.cardNameText}>{name}</span>
    </div>
  )
}

// ── Empty slot placeholder ────────────────────────────────────────────────────
function EmptyCard() {
  return <div className={styles.cardEmpty} />
}

// ── Public export ─────────────────────────────────────────────────────────────
export default function MusicianCard({ name, position, photo, mic, iem, mode = 'full', empty = false, resolvedLabels, showName }) {
  if (empty) return <EmptyCard />
  if (mode === 'photo') return <PhotoCard name={name} photo={photo} position={position} />
  if (mode === 'name') return <NameCard name={name} position={position} />
  if (mode === 'label') return <LabelCard name={name} position={position} mic={mic} iem={iem} resolvedLabels={resolvedLabels} showName={showName} />
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
