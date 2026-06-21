import { useMemo } from "react"
import { calculateSeriesStats } from "@/lib/stats/calculateSeriesStats"
import { radarDimensions } from "@/components/app/statistics-charts/constants"
import { computeStableAxis } from "@/components/app/statistics-charts/utils"
import type { RadarComparisonSession, StatsSession } from "@/lib/stats/actions"

interface Params {
  filtered: StatsSession[]
  filteredRadarSessions: RadarComparisonSession[]
  displayTimeZone: string
}

export interface StatisticsChartSeriesData {
  barData: Array<{ name: string; Min: number; Avg: number; Max: number }>
  seriesYAxis: { domain: [number, number]; ticks: number[] }
  seriesHasDecimals: boolean
  radarChartData: Array<{ dimension: string; prognosis: number; feedback: number }>
  radarDateLabel: string | null
}

export function useStatisticsChartSeriesData({
  filtered,
  filteredRadarSessions,
  displayTimeZone,
}: Params): StatisticsChartSeriesData {
  const seriesStats = useMemo(() => calculateSeriesStats(filtered), [filtered])
  const barData = useMemo(
    () =>
      seriesStats.map((series) => ({
        name: `S${series.position}`,
        Min: series.min,
        Max: series.max,
        Avg: series.avg,
      })),
    [seriesStats]
  )

  const seriesValues = useMemo(() => {
    return barData
      .flatMap((series) => [series.Min, series.Avg, series.Max])
      .filter((value): value is number => Number.isFinite(value))
  }, [barData])

  const seriesYAxis = useMemo<{ domain: [number, number]; ticks: number[] }>(() => {
    // Stabile Achse:
    // Vergleich zwischen Zeitraeumen bleibt nur sinnvoll, wenn die Skala nicht
    // bei kleinen Datenaenderungen springt.
    return computeStableAxis(seriesValues)
  }, [seriesValues])

  const seriesHasDecimals = useMemo(() => {
    return seriesValues.some((value) => Math.abs(value - Math.round(value)) > 1e-6)
  }, [seriesValues])

  const radarChartData = useMemo(() => {
    if (filteredRadarSessions.length === 0) return []
    const count = filteredRadarSessions.length

    // Mittelwert pro Dimension:
    // Einzelwerte schwanken stark je Einheit; fuer den Prognose-vs-Feedback-
    // Vergleich brauchen wir ein robustes Gesamtbild.
    return radarDimensions.map((dimension) => {
      const prognosisSum = filteredRadarSessions.reduce(
        (sum, entry) => sum + entry[dimension.prognosisKey],
        0
      )
      const feedbackSum = filteredRadarSessions.reduce(
        (sum, entry) => sum + entry[dimension.feedbackKey],
        0
      )

      return {
        dimension: dimension.label,
        prognosis: Math.round((prognosisSum / count) * 10) / 10,
        feedback: Math.round((feedbackSum / count) * 10) / 10,
      }
    })
  }, [filteredRadarSessions])

  const radarDateLabel = useMemo(() => {
    if (filteredRadarSessions.length === 0) return null
    const first = filteredRadarSessions[0]
    const last = filteredRadarSessions[filteredRadarSessions.length - 1]
    const format = new Intl.DateTimeFormat("de-CH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: displayTimeZone,
    })
    return `${format.format(new Date(first.date))} bis ${format.format(new Date(last.date))}`
  }, [filteredRadarSessions, displayTimeZone])

  return {
    barData,
    seriesYAxis,
    seriesHasDecimals,
    radarChartData,
    radarDateLabel,
  }
}
