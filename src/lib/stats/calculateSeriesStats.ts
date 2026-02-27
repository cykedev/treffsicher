export type SeriesStats = {
  position: number
  min: number | null
  max: number | null
  avg: number | null
  // Anzahl Einheiten mit Wert an dieser Serienposition
  count: number
}

type SeriesInput = {
  position: number
  scoreTotal: unknown
  isPractice: boolean
}

type SessionInput = {
  series: SeriesInput[]
}

/**
 * Berechnet Min/Max/Durchschnitt je Serienposition über mehrere Einheiten.
 * Probeschuss-Serien werden ausgeschlossen — sie spiegeln keine Wettkampfleistung wider.
 *
 * @param sessions - Einheiten mit Serien (nur Wertungsserien werden berücksichtigt)
 * @returns Statistik je Serienposition, aufsteigend sortiert
 */
export function calculateSeriesStats(sessions: SessionInput[]): SeriesStats[] {
  // Alle Wertungsserien über alle Einheiten sammeln, gruppiert nach Position
  const byPosition = new Map<number, number[]>()

  for (const session of sessions) {
    for (const serie of session.series) {
      // Probeschüsse ausschliessen — sie dienen der Einstimmung, nicht der Wertung
      if (serie.isPractice) continue
      if (serie.scoreTotal === null || serie.scoreTotal === undefined) continue

      const value = parseFloat(String(serie.scoreTotal))
      if (isNaN(value)) continue

      const existing = byPosition.get(serie.position) ?? []
      existing.push(value)
      byPosition.set(serie.position, existing)
    }
  }

  if (byPosition.size === 0) return []

  const stats: SeriesStats[] = []
  for (const [position, values] of byPosition) {
    const min = Math.min(...values)
    const max = Math.max(...values)
    const avg = Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10

    stats.push({ position, min, max, avg, count: values.length })
  }

  // Nach Position sortieren für konsistente Chart-Reihenfolge
  return stats.sort((a, b) => a.position - b.position)
}
