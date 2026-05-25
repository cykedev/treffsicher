import type { DisciplineForStats, StatsSession } from "@/lib/stats/actions"

export type OverviewShotGroup = {
  // Anzahl Wertungsschüsse pro Einheit innerhalb dieser Gruppe.
  totalShots: number
  // Anzahl Wertungsserien pro Einheit (typischer Wert für Anzeige).
  seriesCount: number
  sessionCount: number
  minScore: number
  avgScore: number
  maxScore: number
}

export type OverviewDisciplineGroup = {
  disciplineId: string
  disciplineName: string
  scoringType: string
  sessionCount: number
  shotGroups: OverviewShotGroup[]
}

interface AggregateOverviewParams {
  sessions: StatsSession[]
  hiddenDisciplineIds: string[]
  disciplineFilter: string
}

// Verdichtet die Sessions zu Disziplin-Karten mit Subgruppen pro Wertungsschuss-Zahl.
// Sessions ohne Disziplin oder ohne gültiges Ergebnis werden ignoriert, weil sie
// keinen min/avg/max-Beitrag leisten können.
export function aggregateOverview({
  sessions,
  hiddenDisciplineIds,
  disciplineFilter,
}: AggregateOverviewParams): OverviewDisciplineGroup[] {
  const hidden = new Set(hiddenDisciplineIds)
  const byDiscipline = new Map<
    string,
    {
      discipline: DisciplineForStats
      shots: Map<number, { seriesCount: number; scores: number[] }>
    }
  >()

  for (const session of sessions) {
    if (!session.discipline) continue
    if (session.totalScore === null) continue
    if (session.totalNonPracticeShots <= 0) continue
    // Ausgeblendete Disziplinen nur dann anzeigen, wenn sie aktiv ausgewählt sind.
    if (disciplineFilter === "all" && hidden.has(session.discipline.id)) continue

    const scoredSeriesCount = session.series.filter(
      (serie) => !serie.isPractice && serie.scoreTotal !== null
    ).length

    let bucket = byDiscipline.get(session.discipline.id)
    if (!bucket) {
      bucket = { discipline: session.discipline, shots: new Map() }
      byDiscipline.set(session.discipline.id, bucket)
    }

    const shotKey = session.totalNonPracticeShots
    let shotEntry = bucket.shots.get(shotKey)
    if (!shotEntry) {
      shotEntry = { seriesCount: scoredSeriesCount, scores: [] }
      bucket.shots.set(shotKey, shotEntry)
    }
    shotEntry.scores.push(session.totalScore)
  }

  const result: OverviewDisciplineGroup[] = []
  for (const { discipline, shots } of byDiscipline.values()) {
    const shotGroups: OverviewShotGroup[] = []
    for (const [totalShots, entry] of shots.entries()) {
      const scores = entry.scores
      if (scores.length === 0) continue
      let min = scores[0]
      let max = scores[0]
      let sum = 0
      for (const score of scores) {
        if (score < min) min = score
        if (score > max) max = score
        sum += score
      }
      shotGroups.push({
        totalShots,
        seriesCount: entry.seriesCount,
        sessionCount: scores.length,
        minScore: min,
        avgScore: sum / scores.length,
        maxScore: max,
      })
    }

    // Innerhalb einer Disziplin: aufsteigende Schusszahl, damit kürzere Formate oben stehen.
    shotGroups.sort((a, b) => a.totalShots - b.totalShots)

    const sessionCount = shotGroups.reduce((acc, group) => acc + group.sessionCount, 0)
    result.push({
      disciplineId: discipline.id,
      disciplineName: discipline.name,
      scoringType: discipline.scoringType,
      sessionCount,
      shotGroups,
    })
  }

  result.sort((a, b) => a.disciplineName.localeCompare(b.disciplineName, "de"))
  return result
}
