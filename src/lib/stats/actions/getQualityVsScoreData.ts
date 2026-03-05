import { getAuthSession } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import {
  addDateRangeFilter,
  addDisciplineFilter,
  MAX_STATS_SERIES_POINTS,
  resolveSeriesShotCount,
} from "@/lib/stats/actions/shared"
import type { QualityVsScorePoint, StatsFilters } from "@/lib/stats/types"

export async function getQualityVsScoreDataAction(
  filters: StatsFilters
): Promise<QualityVsScorePoint[]> {
  const session = await getAuthSession()
  if (!session) return []

  const sessionFilter: Record<string, unknown> = {
    userId: session.user.id,
    type: filters.type && filters.type !== "all" ? filters.type : { in: ["TRAINING", "WETTKAMPF"] },
  }

  addDisciplineFilter(sessionFilter, filters)
  addDateRangeFilter(sessionFilter, filters)

  const series = await db.series.findMany({
    where: {
      session: sessionFilter,
      executionQuality: { not: null },
      isPractice: false,
      scoreTotal: { not: null },
    },
    select: {
      executionQuality: true,
      scoreTotal: true,
      shots: true,
      session: {
        select: {
          id: true,
          disciplineId: true,
          discipline: { select: { shotsPerSeries: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: MAX_STATS_SERIES_POINTS,
  })

  return series
    .filter((entry) => entry.executionQuality !== null && entry.scoreTotal !== null)
    .map((entry) => {
      const score = parseFloat(String(entry.scoreTotal))
      const fallback = entry.session.discipline?.shotsPerSeries ?? 10
      const shotCount = resolveSeriesShotCount(entry.shots, fallback)
      return {
        sessionId: entry.session.id,
        quality: entry.executionQuality!,
        scorePerShot: score / shotCount,
        disciplineId: entry.session.disciplineId,
      }
    })
}
