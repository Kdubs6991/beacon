import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import styles from './InfoPopover.module.css'

export default function InfoPopover({ title, children, docsHref }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <button
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label="What's this?"
        type="button"
      >
        <span className={styles.icon}>?</span>
        <span className={styles.label}>What's this?</span>
      </button>

      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div className={styles.card} onClick={e => e.stopPropagation()}>
            <p className={styles.cardTitle}>{title}</p>
            <div className={styles.cardBody}>{children}</div>
            {docsHref && (
              <Link
                to={docsHref}
                className={styles.learnMore}
                onClick={() => setOpen(false)}
                target="_blank"
              >
                Learn more in docs →
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  )
}
