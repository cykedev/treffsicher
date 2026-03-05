import type { Discipline } from "@/generated/prisma/client"
import type { SessionDetail, SerializedSeries } from "@/lib/sessions/actions"
import { createSeriesDefaults } from "@/components/app/session-form/utils"

export interface InitialSeriesSnapshot {
  disciplineId: string
  sortedInitialSeries: SerializedSeries[]
  showShots: boolean
  shots: string[][]
  totalSeries: number
  shotCounts: number[]
  seriesTotals: string[]
  seriesIsPractice: boolean[]
  seriesKeys: string[]
}

interface BuildInitialSeriesSnapshotParams {
  initialData?: SessionDetail
  disciplines: Discipline[]
  initialDisciplineId: string
}

function sortSeriesWithPracticeFirst(series: SerializedSeries[]): SerializedSeries[] {
  return [...series].sort((a, b) => {
    if (a.isPractice === b.isPractice) return 0
    return a.isPractice ? -1 : 1
  })
}

function toShotArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((entry) => String(entry))
}

export function buildInitialSeriesSnapshot({
  initialData,
  disciplines,
  initialDisciplineId,
}: BuildInitialSeriesSnapshotParams): InitialSeriesSnapshot {
  const initialDiscipline = disciplines.find((discipline) => discipline.id === initialDisciplineId)
  const defaults = createSeriesDefaults(initialDiscipline)

  if (!initialData) {
    return {
      disciplineId: initialDisciplineId,
      sortedInitialSeries: [],
      showShots: false,
      shots: [],
      totalSeries: defaults.totalSeries,
      shotCounts: defaults.shotCounts,
      seriesTotals: defaults.seriesTotals,
      seriesIsPractice: defaults.seriesIsPractice,
      seriesKeys: defaults.seriesKeys,
    }
  }

  const sortedInitialSeries = sortSeriesWithPracticeFirst(initialData.series)
  const hasRecordedShots = sortedInitialSeries.some(
    (series) => toShotArray(series.shots).length > 0
  )
  const initialSeriesDiscipline = disciplines.find((entry) => entry.id === initialData.disciplineId)

  return {
    disciplineId: initialDisciplineId,
    sortedInitialSeries,
    showShots: hasRecordedShots,
    shots: hasRecordedShots ? sortedInitialSeries.map((series) => toShotArray(series.shots)) : [],
    totalSeries: sortedInitialSeries.length,
    shotCounts: sortedInitialSeries.map((series) => {
      const parsedShots = toShotArray(series.shots)
      if (parsedShots.length > 0) {
        return parsedShots.length
      }
      return initialSeriesDiscipline?.shotsPerSeries ?? 10
    }),
    seriesTotals: sortedInitialSeries.map((series) =>
      series.scoreTotal != null ? String(series.scoreTotal) : ""
    ),
    seriesIsPractice: sortedInitialSeries.map((series) => series.isPractice),
    seriesKeys: sortedInitialSeries.map((series) => series.id),
  }
}
