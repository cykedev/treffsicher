import { getAuthSession } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import {
  addDateRangeFilter,
  addDisciplineFilter,
  MAX_STATS_SESSIONS,
} from "@/lib/stats/actions/shared"
import type { ShotDistributionPoint, StatsFilters } from "@/lib/stats/types"

export async function getShotDistributionDataAction(
  filters: StatsFilters
): Promise<ShotDistributionPoint[]> {
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
    select: {
      id: true,
      date: true,
      disciplineId: true,
      discipline: { select: { scoringType: true } },
      series: {
        select: { shots: true, isPractice: true },
      },
    },
    orderBy: { date: "desc" },
    take: MAX_STATS_SESSIONS,
  })

  const result: ShotDistributionPoint[] = []

  for (const entry of [...sessions].reverse()) {
    const isDecimal = entry.discipline?.scoringType === "TENTH"
    const allShots: number[] = []

    for (const serie of entry.series) {
      if (serie.isPractice) continue
      if (!Array.isArray(serie.shots)) continue
      for (const shot of serie.shots as unknown[]) {
        if (typeof shot !== "string") continue
        const value = parseFloat(shot)
        if (isNaN(value)) continue
        allShots.push(value)
      }
    }

    const totalShots = allShots.length
    if (totalShots === 0) continue

    const counts = new Array(11).fill(0)
    for (const value of allShots) {
      const bucket = isDecimal ? Math.floor(value) : Math.round(value)
      const clamped = Math.max(0, Math.min(10, bucket))
      counts[clamped]++
    }

    const toPercent = (count: number) => Math.round((count / totalShots) * 1000) / 10

    result.push({
      date: entry.date,
      sessionId: entry.id,
      disciplineId: entry.disciplineId,
      totalShots,
      r0: toPercent(counts[0]),
      r1: toPercent(counts[1]),
      r2: toPercent(counts[2]),
      r3: toPercent(counts[3]),
      r4: toPercent(counts[4]),
      r5: toPercent(counts[5]),
      r6: toPercent(counts[6]),
      r7: toPercent(counts[7]),
      r8: toPercent(counts[8]),
      r9: toPercent(counts[9]),
      r10: toPercent(counts[10]),
    })
  }

  return result
}
