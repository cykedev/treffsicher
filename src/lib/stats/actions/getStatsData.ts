import { getAuthSession } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import {
  addDateRangeFilter,
  addDisciplineFilter,
  MAX_STATS_SESSIONS,
  resolveSeriesShotCount,
} from "@/lib/stats/actions/shared"
import type { SeriesForStats, StatsFilters, StatsSession } from "@/lib/stats/types"

export async function getStatsDataAction(filters: StatsFilters): Promise<StatsSession[]> {
  const session = await getAuthSession()
  if (!session) return []

  const where: Record<string, unknown> = {
    userId: session.user.id,
  }

  if (filters.type && filters.type !== "all") {
    where.type = filters.type
  }

  addDisciplineFilter(where, filters)
  addDateRangeFilter(where, filters)

  const sessions = await db.trainingSession.findMany({
    where,
    include: {
      discipline: {
        select: {
          id: true,
          name: true,
          seriesCount: true,
          shotsPerSeries: true,
          scoringType: true,
        },
      },
      series: {
        select: {
          position: true,
          scoreTotal: true,
          isPractice: true,
          shots: true,
          executionQuality: true,
        },
        orderBy: { position: "asc" },
      },
    },
    orderBy: { date: "desc" },
    take: MAX_STATS_SESSIONS,
  })

  const orderedSessions = [...sessions].reverse()
  return orderedSessions.map((entry) => {
    const fallback = entry.discipline?.shotsPerSeries ?? 10

    const series: SeriesForStats[] = entry.series.map((serie) => ({
      position: serie.position,
      scoreTotal: serie.scoreTotal !== null ? parseFloat(String(serie.scoreTotal)) : null,
      isPractice: serie.isPractice,
      shotCount: resolveSeriesShotCount(serie.shots, fallback),
      executionQuality: serie.executionQuality,
    }))

    const scoredNonPractice = series.filter(
      (serie) => !serie.isPractice && serie.scoreTotal !== null
    )
    const totalScore = scoredNonPractice.reduce((sum, serie) => sum + (serie.scoreTotal ?? 0), 0)
    const totalNonPracticeShots = scoredNonPractice.reduce((sum, serie) => sum + serie.shotCount, 0)

    return {
      id: entry.id,
      date: entry.date,
      type: entry.type,
      disciplineId: entry.disciplineId,
      discipline: entry.discipline ?? null,
      hitLocationHorizontalMm: entry.hitLocationHorizontalMm,
      hitLocationHorizontalDirection: entry.hitLocationHorizontalDirection,
      hitLocationVerticalMm: entry.hitLocationVerticalMm,
      hitLocationVerticalDirection: entry.hitLocationVerticalDirection,
      totalScore: scoredNonPractice.length > 0 ? totalScore : null,
      avgPerShot: totalNonPracticeShots > 0 ? totalScore / totalNonPracticeShots : null,
      totalNonPracticeShots,
      series,
    }
  })
}
