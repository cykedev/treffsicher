import type { ShotDistributionPoint } from "@/lib/stats/actions"
import type { ShotDistributionGranularity } from "@/components/app/statistics-charts/types"

export function getShotDistributionGranularity(
  points: ShotDistributionPoint[]
): ShotDistributionGranularity {
  if (points.length <= 1) return "day"

  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY

  for (const point of points) {
    const time = new Date(point.date).getTime()
    if (!Number.isFinite(time)) continue
    min = Math.min(min, time)
    max = Math.max(max, time)
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) return "day"
  const spanDays = (max - min) / (24 * 60 * 60 * 1000)
  if (points.length <= 45 || spanDays <= 140) return "day"
  if (spanDays <= 500) return "week"
  return "month"
}

export function getShotDistributionBucketStart(
  dateValue: Date,
  granularity: ShotDistributionGranularity
): Date {
  const date = new Date(dateValue)
  date.setHours(0, 0, 0, 0)

  if (granularity === "month") {
    date.setDate(1)
    return date
  }

  if (granularity === "week") {
    const weekday = date.getDay()
    const distanceToMonday = (weekday + 6) % 7
    date.setDate(date.getDate() - distanceToMonday)
  }

  return date
}
