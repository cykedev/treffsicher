import { useMemo } from "react"
import type { LineDataPoint } from "@/components/app/statistics-charts/tabs/types"
import type { DisplayMode } from "@/components/app/statistics-charts/types"
import {
  buildIndexTicks,
  calculateTrend,
  calculateTrendBandsByQuantile,
  computeDisplayValue,
  computeStableAxis,
  createTrendBandDistanceOptions,
} from "@/components/app/statistics-charts/utils"
import type { DisciplineForStats, StatsSession } from "@/lib/stats/actions"

interface Params {
  filteredForTrend: StatsSession[]
  filtered: StatsSession[]
  effectiveDisplayMode: DisplayMode
  selectedDiscipline: DisciplineForStats | null
  displayTimeZone: string
  maxTicks: number
}

export function useResultTrendChartState({
  filteredForTrend,
  filtered,
  effectiveDisplayMode,
  selectedDiscipline,
  displayTimeZone,
  maxTicks,
}: Params): {
  withScoreCount: number
  hasData: boolean
  totalDisciplineShots: number | null
  metricLabel: string
  lineData: LineDataPoint[]
  resultTrendYAxis: { domain: [number, number]; ticks: number[] }
  lineChartTicks: number[]
} {
  const withScoreForTrend = useMemo(
    () => filteredForTrend.filter((session) => session.avgPerShot !== null),
    [filteredForTrend]
  )
  const withScore = useMemo(
    () => filtered.filter((session) => session.avgPerShot !== null),
    [filtered]
  )

  const displayValuesForTrend = useMemo(
    () =>
      withScoreForTrend.map((session) =>
        computeDisplayValue(session.avgPerShot as number, effectiveDisplayMode, selectedDiscipline)
      ),
    [effectiveDisplayMode, selectedDiscipline, withScoreForTrend]
  )

  const displayValues = useMemo(
    () =>
      withScore.map((session) =>
        computeDisplayValue(session.avgPerShot as number, effectiveDisplayMode, selectedDiscipline)
      ),
    [effectiveDisplayMode, selectedDiscipline, withScore]
  )

  const movingAvgForTrend = useMemo(
    () => calculateTrend(displayValuesForTrend),
    [displayValuesForTrend]
  )

  const movingAvgBySessionId = useMemo(
    () => new Map<string, number | null>(withScoreForTrend.map((session, i) => [session.id, movingAvgForTrend[i]])),
    [movingAvgForTrend, withScoreForTrend]
  )

  const trendBandBySessionId = useMemo(() => {
    if (withScoreForTrend.length === 0) return new Map<string, { low: number; high: number }>()

    const minValue = Math.min(...displayValuesForTrend)
    const maxValue = Math.max(...displayValuesForTrend)
    const range = Number.isFinite(maxValue - minValue) ? maxValue - minValue : 0
    const minBandWidth = Math.max(range * 0.035, effectiveDisplayMode === "projected" ? 0.35 : 0.03)
    const maxBandWidth = Math.max(range * 0.45, effectiveDisplayMode === "projected" ? 3.2 : 0.3)
    const bands = calculateTrendBandsByQuantile(
      displayValuesForTrend,
      movingAvgForTrend,
      createTrendBandDistanceOptions(range, minBandWidth / 2, maxBandWidth)
    )

    return new Map<string, { low: number; high: number }>(
      withScoreForTrend.flatMap((session, i) => {
        const band = bands[i]
        if (!band) return []
        return [[session.id, band] as const]
      })
    )
  }, [displayValuesForTrend, effectiveDisplayMode, movingAvgForTrend, withScoreForTrend])

  const lineData = useMemo<LineDataPoint[]>(() => {
    const formatter = new Intl.DateTimeFormat("de-CH", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      timeZone: displayTimeZone,
    })

    return withScore.map((session, i) => {
      const trend = movingAvgBySessionId.get(session.id) ?? null
      const band = trendBandBySessionId.get(session.id)

      const trendLow = trend !== null && band ? band.low : null
      const trendHigh = trend !== null && band ? band.high : null

      return {
        i,
        datum: formatter.format(new Date(session.date)),
        wert: displayValues[i],
        trend,
        trendLow,
        trendHigh,
        trendBand: trendLow !== null && trendHigh !== null ? [trendLow, trendHigh] : null,
      }
    })
  }, [displayTimeZone, displayValues, movingAvgBySessionId, trendBandBySessionId, withScore])

  const resultTrendYAxis = useMemo<{ domain: [number, number]; ticks: number[] }>(() => {
    const values = lineData
      .flatMap((point) => [point.wert, point.trend, point.trendLow, point.trendHigh])
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    return computeStableAxis(values)
  }, [lineData])

  const lineChartTicks = useMemo(() => buildIndexTicks(lineData.length, maxTicks), [lineData.length, maxTicks])

  const totalDisciplineShots = selectedDiscipline
    ? selectedDiscipline.shotsPerSeries * selectedDiscipline.seriesCount
    : null

  const metricLabel =
    effectiveDisplayMode === "projected" && selectedDiscipline
      ? `Hochrechnung (${totalDisciplineShots} Sch.)`
      : "Ringe/Sch."

  return {
    withScoreCount: withScore.length,
    hasData: withScore.length > 0,
    totalDisciplineShots,
    metricLabel,
    lineData,
    resultTrendYAxis,
    lineChartTicks,
  }
}
