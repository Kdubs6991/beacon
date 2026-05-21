import MusicianCard from './MusicianCard'
import styles from './CardGrid.module.css'

// ── Template-based grid ───────────────────────────────────────────────────────

function TemplateGrid({ musicians, template }) {
  const rows = template.rows ?? []
  const slotConfig = template.slots ?? {}
  const emptyBehavior = template.emptySlots ?? 'show'

  let slotCounter = 0

  return (
    <div className={styles.templateGrid}>
      {rows.map((row, ri) => {
        const cells = []
        for (let col = 0; col < row.columns; col++) {
          slotCounter++
          const slotNum = slotCounter
          const cfg = slotConfig[slotNum] ?? {}
          const mode = cfg.mode ?? 'full'
          // if linkedTo is set, show data from the linked slot instead
          const sourceSn = cfg.linkedTo ?? slotNum
          const musician = musicians.find(m => m.slot === sourceSn - 1) ?? null

          if (!musician && emptyBehavior === 'hide') continue

          cells.push(
            <div key={slotNum} className={styles.templateCell}>
              {musician
                ? <MusicianCard
                    name={musician.name}
                    position={musician.position}
                    photo={musician.photo}
                    mic={musician.mic}
                    iem={musician.iem}
                    mode={mode}
                  />
                : <MusicianCard empty />
              }
            </div>
          )
        }

        if (cells.length === 0) return null

        return (
          <div key={ri} className={styles.templateRow} style={{ flex: row.height ?? 1 }}>
            {row.showLabel && row.label && (
              <div className={styles.rowLabel}>{row.label}</div>
            )}
            <div className={styles.templateRowCells}>
              {cells}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Flat auto-fill grid (preset layouts) ─────────────────────────────────────

export default function CardGrid({ musicians, template }) {
  if (!musicians || musicians.length === 0) {
    return (
      <div className={styles.empty}>
        <span>No assignments yet</span>
      </div>
    )
  }

  if (template?.rows?.length) {
    return <TemplateGrid musicians={musicians} template={template} />
  }

  return (
    <div className={styles.grid}>
      {musicians.map(m => (
        <MusicianCard
          key={m.id}
          name={m.name}
          position={m.position}
          photo={m.photo}
          mic={m.mic}
          iem={m.iem}
        />
      ))}
    </div>
  )
}
