import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import styles from './InfoPopover.module.css'

export default function InfoPopover({ title, children, docsHref }) {
  const [open, setOpen] = useState(false)
  const btnRef = useRef(null)
  const cardRef = useRef(null)

  useEffect(() => {
    if (!open) return
    function onDown(e) {
      if (!cardRef.current?.contains(e.target) && !btnRef.current?.contains(e.target)) {
        setOpen(false)
      }
    }
    function onKey(e) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Flip card to right-anchored if it would overflow the right viewport edge
  useEffect(() => {
    if (!open || !cardRef.current) return
    const card = cardRef.current
    card.style.left = '0'
    card.style.right = 'auto'
    const rect = card.getBoundingClientRect()
    if (rect.right > window.innerWidth - 16) {
      card.style.left = 'auto'
      card.style.right = '0'
    }
  }, [open])

  return (
    <div className={styles.wrap}>
      <button
        ref={btnRef}
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        onClick={() => setOpen(o => !o)}
        aria-label="What's this?"
      >
        <span className={styles.icon}>?</span>
        <span className={styles.label}>What's this?</span>
      </button>

      {open && (
        <div ref={cardRef} className={styles.card}>
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
      )}
    </div>
  )
}
