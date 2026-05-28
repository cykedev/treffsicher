import type { DisciplineForStats, StatsSession } from "@/lib/stats/actions"

export type OverviewTableRow = {
  sessionId: string
  date: Date
  // index = position - 1; null wenn an dieser Position keine gewertete Serie vorhanden
  seriesScores: (number | null)[]
  // Summe S1..S{typicalSeriesCount}; null wenn nicht alle typischen Slots gefüllt
  typicalTotal: number | null
  // Summe aller vorhandenen Wertungsserien
  grandTotal: number
}

export type OverviewSeriesGroup = {
  // Anzahl tatsächlich gewerteter Serien dieser Gruppe (Gruppierschlüssel)
  seriesCount: number
  // true wenn seriesCount < typicalSeriesCount der Disziplin
  isSubTypical: boolean
  // Maximale Spaltenanzahl in dieser Gruppe (≥ seriesCount wegen möglicher Positionslücken)
  maxSeriesCount: number
  rows: OverviewTableRow[]
  // Spaltendurchschnitte; null wenn Spalte komplett leer
  seriesAverages: (number | null)[]
  // null bei isSubTypical (typicalTotal ist in dieser Gruppe für alle Zeilen null)
  typicalTotalAverage: number | null
  grandTotalAverage: number
}

export type OverviewTableGroup = {
  disciplineId: string
  disciplineName: string
  scoringType: string
  typicalSeriesCount: number
  sessionCount: number
  // Aufsteigend nach seriesCount sortiert
  seriesGroups: OverviewSeriesGroup[]
}

interface AggregateOverviewParams {
  sessions: StatsSession[]
  hiddenDisciplineIds: string[]
  disciplineFilter: string
}

export function aggregateOverview({
  sessions,
  hiddenDisciplineIds,
  disciplineFilter,
}: AggregateOverviewParams): OverviewTableGroup[] {
  const hidden = new Set(hiddenDisciplineIds)
  const byDiscipline = new Map<
    string,
    {
      discipline: DisciplineForStats
      pendingRows: Array<{ row: OverviewTableRow; scoredCount: number }>
    }
  >()

  for (const session of sessions) {
    if (!session.discipline) continue
    if (disciplineFilter === "all" && hidden.has(session.discipline.id)) continue

    const scored = session.series
      .filter((s) => !s.isPractice && s.scoreTotal !== null)
      .sort((a, b) => a.position - b.position)

    if (scored.length === 0) continue

    const maxPosition = scored.reduce((m, s) => Math.max(m, s.position), 0)
    const seriesScores: (number | null)[] = Array(maxPosition).fill(null)
    for (const s of scored) {
      seriesScores[s.position - 1] = s.scoreTotal
    }

    const typicalCount = session.discipline.seriesCount
    const typicalSlots = seriesScores.slice(0, typicalCount)
    const typicalTotal =
      typicalSlots.length === typicalCount && typicalSlots.every((v) => v !== null)
        ? typicalSlots.reduce((sum, v) => sum + (v as number), 0)
        : null

    const grandTotal = scored.reduce((sum, s) => sum + (s.scoreTotal as number), 0)

    let bucket = byDiscipline.get(session.discipline.id)
    if (!bucket) {
      bucket = { discipline: session.discipline, pendingRows: [] }
      byDiscipline.set(session.discipline.id, bucket)
    }
    bucket.pendingRows.push({
      row: { sessionId: session.id, date: session.date, seriesScores, typicalTotal, grandTotal },
      scoredCount: scored.length,
    })
  }

  const result: OverviewTableGroup[] = []

  for (const { discipline, pendingRows } of byDiscipline.values()) {
    const typicalSeriesCount = discipline.seriesCount

    // Jede distinct Serienzahl bekommt eine eigene Gruppe und damit eine eigene Tabelle.
    const byKey = new Map<number, Array<{ row: OverviewTableRow; scoredCount: number }>>()
    for (const entry of pendingRows) {
      const key = entry.scoredCount
      const existing = byKey.get(key) ?? []
      existing.push(entry)
      byKey.set(key, existing)
    }

    const seriesGroups: OverviewSeriesGroup[] = []
    for (const [seriesCount, entries] of byKey.entries()) {
      const rows = entries.map((e) => e.row)
      const isSubTypical = seriesCount < typicalSeriesCount
      const maxSeriesCount = rows.reduce((m, r) => Math.max(m, r.seriesScores.length), seriesCount)

      for (const row of rows) {
        while (row.seriesScores.length < maxSeriesCount) row.seriesScores.push(null)
      }

      rows.sort((a, b) => {
        const d = a.date.getTime() - b.date.getTime()
        return d !== 0 ? d : a.sessionId.localeCompare(b.sessionId)
      })

      const seriesAverages: (number | null)[] = Array.from({ length: maxSeriesCount }, (_, i) => {
        const vals = rows.map((r) => r.seriesScores[i]).filter((v): v is number => v !== null)
        return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null
      })

      const typicalTotals = rows.map((r) => r.typicalTotal).filter((v): v is number => v !== null)
      const typicalTotalAverage =
        typicalTotals.length > 0
          ? typicalTotals.reduce((s, v) => s + v, 0) / typicalTotals.length
          : null

      const grandTotalAverage = rows.reduce((s, r) => s + r.grandTotal, 0) / rows.length

      seriesGroups.push({
        seriesCount,
        isSubTypical,
        maxSeriesCount,
        rows,
        seriesAverages,
        typicalTotalAverage,
        grandTotalAverage,
      })
    }

    seriesGroups.sort((a, b) => a.seriesCount - b.seriesCount)

    result.push({
      disciplineId: discipline.id,
      disciplineName: discipline.name,
      scoringType: discipline.scoringType,
      typicalSeriesCount,
      sessionCount: pendingRows.length,
      seriesGroups,
    })
  }

  result.sort((a, b) => a.disciplineName.localeCompare(b.disciplineName, "de"))
  return result
}
