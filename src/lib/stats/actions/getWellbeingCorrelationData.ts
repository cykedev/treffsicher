import { getAuthSession } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import {
  addDateRangeFilter,
  addDisciplineFilter,
  MAX_STATS_SESSIONS,
  resolveSeriesShotCount,
} from "@/lib/stats/actions/shared"
import type { StatsFilters, WellbeingCorrelationPoint } from "@/lib/stats/types"

export async function getWellbeingCorrelationDataAction(
  filters: StatsFilters
): Promise<WellbeingCorrelationPoint[]> {
  const session = await getAuthSession()
  if (!session) return []

  const where: Record<string, unknown> = {
    userId: session.user.id,
    wellbeing: { isNot: null },
    type: filters.type && filters.type !== "all" ? filters.type : { in: ["TRAINING", "WETTKAMPF"] },
  }

  addDisciplineFilter(where, filters)
  addDateRangeFilter(where, filters)

  const sessions = await db.trainingSession.findMany({
    where,
    include: {
      wellbeing: true,
      discipline: { select: { shotsPerSeries: true } },
      series: {
        select: { scoreTotal: true, isPractice: true, shots: true },
      },
    },
    orderBy: { date: "desc" },
    take: MAX_STATS_SESSIONS,
  })

  const result: WellbeingCorrelationPoint[] = []
  for (const entry of [...sessions].reverse()) {
    if (!entry.wellbeing) continue

    const fallback = entry.discipline?.shotsPerSeries ?? 10
    let totalScore = 0
    let totalShots = 0

    for (const serie of entry.series) {
      if (serie.isPractice || serie.scoreTotal === null) continue
      const score = parseFloat(String(serie.scoreTotal))
      if (isNaN(score)) continue
      totalScore += score
      totalShots += resolveSeriesShotCount(serie.shots, fallback)
    }

    const avgPerShot = totalShots > 0 ? totalScore / totalShots : null
    if (avgPerShot === null || avgPerShot <= 0) continue

    result.push({
      sessionId: entry.id,
      avgPerShot,
      disciplineId: entry.disciplineId,
      sleep: entry.wellbeing.sleep,
      energy: entry.wellbeing.energy,
      stress: entry.wellbeing.stress,
      motivation: entry.wellbeing.motivation,
    })
  }

  return result
}
