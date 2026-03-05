import { getAuthSession } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import {
  addDateRangeFilter,
  addDisciplineFilter,
  MAX_STATS_SESSIONS,
} from "@/lib/stats/actions/shared"
import type { RadarComparisonSession, StatsFilters } from "@/lib/stats/types"

export async function getRadarComparisonDataAction(
  filters: StatsFilters
): Promise<RadarComparisonSession[]> {
  const session = await getAuthSession()
  if (!session) return []

  const where: Record<string, unknown> = {
    userId: session.user.id,
    prognosis: { isNot: null },
    feedback: { isNot: null },
  }

  if (filters.type && filters.type !== "all") {
    where.type = filters.type
  } else {
    where.type = { in: ["TRAINING", "WETTKAMPF"] }
  }

  addDisciplineFilter(where, filters)
  addDateRangeFilter(where, filters)

  const sessions = await db.trainingSession.findMany({
    where,
    select: {
      id: true,
      date: true,
      disciplineId: true,
      prognosis: {
        select: {
          fitness: true,
          nutrition: true,
          technique: true,
          tactics: true,
          mentalStrength: true,
          environment: true,
          equipment: true,
        },
      },
      feedback: {
        select: {
          fitness: true,
          nutrition: true,
          technique: true,
          tactics: true,
          mentalStrength: true,
          environment: true,
          equipment: true,
        },
      },
    },
    orderBy: { date: "desc" },
    take: MAX_STATS_SESSIONS,
  })

  return [...sessions]
    .reverse()
    .filter((entry) => entry.prognosis !== null && entry.feedback !== null)
    .map((entry) => ({
      sessionId: entry.id,
      date: entry.date,
      disciplineId: entry.disciplineId,
      fitnessPrognosis: entry.prognosis!.fitness,
      nutritionPrognosis: entry.prognosis!.nutrition,
      techniquePrognosis: entry.prognosis!.technique,
      tacticsPrognosis: entry.prognosis!.tactics,
      mentalStrengthPrognosis: entry.prognosis!.mentalStrength,
      environmentPrognosis: entry.prognosis!.environment,
      equipmentPrognosis: entry.prognosis!.equipment,
      fitnessFeedback: entry.feedback!.fitness,
      nutritionFeedback: entry.feedback!.nutrition,
      techniqueFeedback: entry.feedback!.technique,
      tacticsFeedback: entry.feedback!.tactics,
      mentalStrengthFeedback: entry.feedback!.mentalStrength,
      environmentFeedback: entry.feedback!.environment,
      equipmentFeedback: entry.feedback!.equipment,
    }))
}
