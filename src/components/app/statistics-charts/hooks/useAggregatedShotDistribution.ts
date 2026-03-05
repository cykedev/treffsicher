import { useMemo } from "react"
import type { AggregatedShotDistributionPoint } from "@/components/app/statistics-charts/types"
import {
  getShotDistributionBucketStart,
  getShotDistributionGranularity,
} from "@/components/app/statistics-charts/utils"
import type { ShotDistributionPoint } from "@/lib/stats/actions"

interface Params {
  filteredShotDistribution: ShotDistributionPoint[]
  displayTimeZone: string
}

export function useAggregatedShotDistribution({
  filteredShotDistribution,
  displayTimeZone,
}: Params): AggregatedShotDistributionPoint[] {
  return useMemo<AggregatedShotDistributionPoint[]>(() => {
    if (filteredShotDistribution.length === 0) return []

    const granularity = getShotDistributionGranularity(filteredShotDistribution)
    const byBucket = new Map<
      string,
      {
        date: Date
        totalShots: number
        weightedR0to6: number
        weightedR7: number
        weightedR8: number
        weightedR9: number
        weightedR10: number
      }
    >()

    for (const point of filteredShotDistribution) {
      const totalShots = Math.max(0, point.totalShots)
      if (totalShots <= 0) continue

      const bucketDate = getShotDistributionBucketStart(new Date(point.date), granularity)
      const bucketKey = bucketDate.toISOString()
      const current = byBucket.get(bucketKey) ?? {
        date: bucketDate,
        totalShots: 0,
        weightedR0to6: 0,
        weightedR7: 0,
        weightedR8: 0,
        weightedR9: 0,
        weightedR10: 0,
      }
      const r0to6 = point.r0 + point.r1 + point.r2 + point.r3 + point.r4 + point.r5 + point.r6

      // Gewichtung nach Schusszahl verhindert, dass Mini-Sessions den Verlauf unverhältnismäßig verzerren.
      current.totalShots += totalShots
      current.weightedR0to6 += r0to6 * totalShots
      current.weightedR7 += point.r7 * totalShots
      current.weightedR8 += point.r8 * totalShots
      current.weightedR9 += point.r9 * totalShots
      current.weightedR10 += point.r10 * totalShots
      byBucket.set(bucketKey, current)
    }

    const shortDayFormatter = new Intl.DateTimeFormat("de-CH", {
      day: "2-digit",
      month: "2-digit",
      timeZone: displayTimeZone,
    })
    const monthFormatter = new Intl.DateTimeFormat("de-CH", {
      month: "2-digit",
      year: "2-digit",
      timeZone: displayTimeZone,
    })
    const fullDateFormatter = new Intl.DateTimeFormat("de-CH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: displayTimeZone,
    })

    return [...byBucket.values()]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((bucket, index) => {
        const round1 = (value: number) => Math.round(value * 10) / 10
        const r7 = round1(bucket.weightedR7 / bucket.totalShots)
        const r8 = round1(bucket.weightedR8 / bucket.totalShots)
        const r9 = round1(bucket.weightedR9 / bucket.totalShots)
        const r10 = round1(bucket.weightedR10 / bucket.totalShots)
        const r0to6 = round1(Math.max(0, 100 - r7 - r8 - r9 - r10))

        const dateLabel =
          granularity === "month"
            ? monthFormatter.format(bucket.date)
            : shortDayFormatter.format(bucket.date)
        const tooltipLabel =
          granularity === "day"
            ? fullDateFormatter.format(bucket.date)
            : granularity === "week"
              ? `Woche ab ${fullDateFormatter.format(bucket.date)}`
              : `Monat ${monthFormatter.format(bucket.date)}`

        return {
          i: index,
          date: bucket.date,
          dateLabel,
          tooltipLabel,
          totalShots: bucket.totalShots,
          r0to6,
          r7,
          r8,
          r9,
          r10,
        }
      })
  }, [filteredShotDistribution, displayTimeZone])
}
