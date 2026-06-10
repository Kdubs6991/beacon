import { useState, useEffect } from 'react'
import styles from './CronBuilder.module.css'

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MINUTE_OPTS = [0, 15, 30, 45]

function formatHour12(h) {
  if (h === 0) return '12 AM'
  if (h < 12) return `${h} AM`
  if (h === 12) return '12 PM'
  return `${h - 12} PM`
}

function parseCron(cron) {
  if (!cron) return { days: [], hour: 18, minute: 0 }
  const parts = cron.trim().split(/\s+/)
  if (parts.length < 5) return { days: [], hour: 18, minute: 0 }
  return {
    minute: parseInt(parts[0]) || 0,
    hour: parseInt(parts[1]) || 18,
    days: parts[4] === '*' ? [] : parts[4].split(',').map(Number).filter(n => !isNaN(n)),
  }
}

function buildCron(days, hour, minute) {
  if (!days.length) return null
  return `${minute} ${hour} * * ${[...days].sort((a, b) => a - b).join(',')}`
}

function humanReadable(days, hour, minute) {
  if (!days.length) return 'No days selected'
  const dayNames = [...days].sort((a, b) => a - b).map(d => DAY_LABELS[d])
  const pad = n => String(n).padStart(2, '0')
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
  const ampm = hour < 12 ? 'AM' : 'PM'
  return `Every ${dayNames.join(', ')} at ${h12}:${pad(minute)} ${ampm}`
}

export default function CronBuilder({ value, onChange }) {
  const parsed = parseCron(value)
  const [days, setDays] = useState(parsed.days)
  const [hour, setHour] = useState(parsed.hour)
  const [minute, setMinute] = useState(parsed.minute)

  useEffect(() => {
    const parsed = parseCron(value)
    setDays(parsed.days)
    setHour(parsed.hour)
    setMinute(parsed.minute)
  }, [value])

  function toggleDay(d) {
    const next = days.includes(d) ? days.filter(x => x !== d) : [...days, d]
    setDays(next)
    onChange(buildCron(next, hour, minute))
  }

  function onHourChange(h) {
    setHour(h)
    onChange(buildCron(days, h, minute))
  }

  function onMinuteChange(m) {
    setMinute(m)
    onChange(buildCron(days, hour, m))
  }

  return (
    <div className={styles.builder}>
      <div className={styles.row}>
        <span className={styles.label}>Days</span>
        <div className={styles.days}>
          {DAY_LABELS.map((name, i) => (
            <button
              key={i}
              type="button"
              className={`${styles.dayBtn} ${days.includes(i) ? styles.dayActive : ''}`}
              onClick={() => toggleDay(i)}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.row}>
        <span className={styles.label}>Time</span>
        <div className={styles.timeInputs}>
          <select className={styles.select} value={hour} onChange={e => onHourChange(Number(e.target.value))}>
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>{formatHour12(h)}</option>
            ))}
          </select>
          <select className={styles.select} value={minute} onChange={e => onMinuteChange(Number(e.target.value))}>
            {MINUTE_OPTS.map(m => (
              <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={styles.preview}>
        {buildCron(days, hour, minute)
          ? humanReadable(days, hour, minute)
          : <span className={styles.nodays}>Select at least one day</span>}
      </div>
    </div>
  )
}
