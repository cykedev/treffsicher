import type { StatsFilters } from "@/lib/stats/types"

export const MAX_STATS_SESSIONS = 1200
export const MAX_STATS_SERIES_POINTS = 12000

export function resolveSeriesShotCount(shots: unknown, fallback: number): number {
  if (Array.isArray(shots) && shots.length > 0) return shots.length
  return fallback
}

export function addDisciplineFilter(where: Record<string, unknown>, filters: StatsFilters): void {
  if (filters.disciplineId && filters.disciplineId !== "all") {
    where.disciplineId = filters.disciplineId
  }
}

export function addDateRangeFilter(where: Record<string, unknown>, filters: StatsFilters): void {
  if (!filters.from && !filters.to) return

  const dateFilter: Record<string, Date> = {}
  if (filters.from) {
    dateFilter.gte = new Date(filters.from)
  }
  if (filters.to) {
    const to = new Date(filters.to)
    to.setHours(23, 59, 59, 999)
    dateFilter.lte = to
  }
  where.date = dateFilter
}
