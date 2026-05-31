import type { DisciplineForStats, StatsSession } from "@/lib/stats/actions"

export type OverviewTableRow = {
  sessionId: string
  date: Date
  // index = position - 1; null wenn an dieser Position keine gewertete Serie vorhanden
  seriesScores: (number | null)[]
  // Summe der vorhandenen Serien mit Position <= typicalSeriesCount (Teilsummen erlaubt, nie null)
  typicalRangeTotal: number
  // Summe aller vorhandenen Wertungsserien
  grandTotal: number
}

export type OverviewSeriesGroup = {
  // Anzahl tatsächlich gewerteter Serien dieser Gruppe (Gruppierschlüssel)
  seriesCount: number
  // true wenn seriesCount < typicalSeriesCount der Disziplin
  isSubTypical: boolean
  // Maximale Spaltenanzahl in dieser Gruppe (>= seriesCount wegen möglicher Positionslücken)
  maxSeriesCount: number
  rows: OverviewTableRow[]
  // Spaltendurchschnitte; null wenn Spalte komplett leer
  seriesAverages: (number | null)[]
  // Mittel der typicalRangeTotal der Zeilen (nie null bei >= 1 Zeile)
  typicalRangeTotalAverage: number
  grandTotalAverage: number
}

export type OverviewTableGroup = {
  disciplineId: string
  disciplineName: string
  scoringType: string
  typicalSeriesCount: number
  // Maximale Serienzahl über alle Gruppen dieser Disziplin (für das gemeinsame Spaltenraster)
  maxSeriesCount: number
  sessionCount: number
  // Ø über alle gewerteten Serien aller Einheiten der Disziplin
  // (Summe aller Serien ÷ Anzahl Serien); null wenn keine Serien vorhanden
  allSeriesAverage: number | null
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
    const typicalRangeTotal = seriesScores
      .slice(0, typicalCount)
      .reduce((sum: number, v) => sum + (v ?? 0), 0)

    const grandTotal = scored.reduce((sum, s) => sum + (s.scoreTotal as number), 0)

    let bucket = byDiscipline.get(session.discipline.id)
    if (!bucket) {
      bucket = { discipline: session.discipline, pendingRows: [] }
      byDiscipline.set(session.discipline.id, bucket)
    }
    bucket.pendingRows.push({
      row: {
        sessionId: session.id,
        date: session.date,
        seriesScores,
        typicalRangeTotal,
        grandTotal,
      },
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

      const typicalRangeTotalAverage =
        rows.reduce((s, r) => s + r.typicalRangeTotal, 0) / rows.length

      const grandTotalAverage = rows.reduce((s, r) => s + r.grandTotal, 0) / rows.length

      seriesGroups.push({
        seriesCount,
        isSubTypical,
        maxSeriesCount,
        rows,
        seriesAverages,
        typicalRangeTotalAverage,
        grandTotalAverage,
      })
    }

    seriesGroups.sort((a, b) => a.seriesCount - b.seriesCount)

    const maxSeriesCount = seriesGroups.reduce((m, g) => Math.max(m, g.maxSeriesCount), 0)

    const totalSeriesScore = pendingRows.reduce((s, e) => s + e.row.grandTotal, 0)
    const totalSeriesCount = pendingRows.reduce((s, e) => s + e.scoredCount, 0)
    const allSeriesAverage = totalSeriesCount > 0 ? totalSeriesScore / totalSeriesCount : null

    result.push({
      disciplineId: discipline.id,
      disciplineName: discipline.name,
      scoringType: discipline.scoringType,
      typicalSeriesCount,
      maxSeriesCount,
      sessionCount: pendingRows.length,
      allSeriesAverage,
      seriesGroups,
    })
  }

  result.sort((a, b) => a.disciplineName.localeCompare(b.disciplineName, "de"))
  return result
}
