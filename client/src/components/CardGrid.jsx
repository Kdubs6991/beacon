import MusicianCard from './MusicianCard'
import styles from './CardGrid.module.css'

// ── Template-based grid ───────────────────────────────────────────────────────

function TemplateGrid({ musicians, template }) {
  const rows = template.rows ?? []
  const slotConfig = template.slots ?? {}
  const emptyBehavior = template.emptySlots ?? 'reserve'

  // Pass 1: build a 2D grid — rowGrid[ri][ci] = { slotNum, mode, musician }
  let globalSlot = 0
  const rowGrid = rows.map(row => {
    const colCount = row.cols ?? row.columns ?? 0
    return Array.from({ length: colCount }, () => {
      globalSlot++
      const slotNum = globalSlot
      const cfg = slotConfig[slotNum] ?? {}
      const mode = cfg.mode ?? 'full'
      // Routing: use first resolvedLabel name if no linkedTo
      const routingLabel = cfg.resolvedLabels?.[0]?.name ?? cfg.labelName ?? null
      let musician
      if (cfg.linkedTo) {
        musician = musicians.find(m => m.slot === cfg.linkedTo - 1) ?? null
      } else if (routingLabel) {
        musician = musicians.find(m => m.mic === routingLabel || m.iem === routingLabel) ?? null
      } else {
        musician = musicians.find(m => m.slot === slotNum - 1) ?? null
      }
      return { slotNum, mode, musician, resolvedLabels: cfg.resolvedLabels ?? [], showName: cfg.showName ?? false }
    })
  })

  // Pass 2 (collapse only): find which column indices have at least one musician
  // A column index is "visible" if ANY row has a musician at that position.
  // Columns with nothing but empty slots are removed entirely.
  let visibleCols = null
  if (emptyBehavior === 'collapse') {
    const maxCols = Math.max(...rowGrid.map(r => r.length), 0)
    visibleCols = new Set()
    for (let ci = 0; ci < maxCols; ci++) {
      if (rowGrid.some(row => row[ci]?.musician != null)) visibleCols.add(ci)
    }
  }

  return (
    <div className={styles.templateGrid}>
      {rowGrid.map((rowCells, ri) => {
        const row = rows[ri]
        // Reserve: show every cell. Collapse: keep only columns that have a musician somewhere.
        const cells = visibleCols
          ? rowCells.filter((_, ci) => visibleCols.has(ci))
          : rowCells

        if (cells.length === 0) return null
        if (visibleCols && cells.every(c => c.musician == null)) return null

        return (
          <div key={ri} className={styles.templateRow} style={{ flex: row.height ?? 1 }}>
            {row.showLabel && row.label && (
              <div className={styles.rowLabel}>{row.label}</div>
            )}
            <div className={styles.templateRowCells}>
              {cells.map(cell => (
                <div key={cell.slotNum} className={styles.templateCell}>
                  {cell.musician
                    ? <MusicianCard
                        name={cell.musician.name}
                        position={cell.musician.position}
                        photo={cell.musician.photo}
                        mic={cell.musician.mic}
                        iem={cell.musician.iem}
                        mode={cell.mode}
                        resolvedLabels={cell.resolvedLabels}
                        showName={cell.showName}
                      />
                    : <MusicianCard empty />
                  }
                </div>
              ))}
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
