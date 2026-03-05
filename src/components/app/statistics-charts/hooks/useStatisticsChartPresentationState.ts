import { useMemo } from "react"
import { calculateSeriesStats } from "@/lib/stats/calculateSeriesStats"
import type { ChartConfig } from "@/components/ui/chart"
import {
  radarDimensions,
  radarSeriesConfig,
  shotDistributionBundledColors,
} from "@/components/app/statistics-charts/constants"
import type { HitLocationTrendDataPoint } from "@/components/app/statistics-charts/tabs/types"
import type {
  AggregatedShotDistributionPoint,
  RadarLegendItem,
  RadarSeriesKey,
} from "@/components/app/statistics-charts/types"
import {
  buildIndexTicks,
  computeStableAxis,
  createTrendStroke,
} from "@/components/app/statistics-charts/utils"
import type { RadarComparisonSession, StatsSession } from "@/lib/stats/actions"

interface Params {
  filtered: StatsSession[]
  filteredRadarSessions: RadarComparisonSession[]
  aggregatedShotDistribution: AggregatedShotDistributionPoint[]
  hitLocationTrendData: HitLocationTrendDataPoint[]
  metricLabel: string
  wellbeingScoreLabel: string
  qualityScoreLabel: string
  displayTimeZone: string
  maxTicks: number
}

export function useStatisticsChartPresentationState({
  filtered,
  filteredRadarSessions,
  aggregatedShotDistribution,
  hitLocationTrendData,
  metricLabel,
  wellbeingScoreLabel,
  qualityScoreLabel,
  displayTimeZone,
  maxTicks,
}: Params): {
  barData: Array<{ name: string; Min: number; Avg: number; Max: number }>
  seriesYAxis: { domain: [number, number]; ticks: number[] }
  seriesHasDecimals: boolean
  radarChartData: Array<{ dimension: string; prognosis: number; feedback: number }>
  radarDateLabel: string | null
  radarLegendItems: RadarLegendItem[]
  lineChartConfig: ChartConfig
  seriesChartConfig: ChartConfig
  radarChartConfig: ChartConfig
  wellbeingChartConfig: ChartConfig
  qualityChartConfig: ChartConfig
  shotDistributionChartConfig: ChartConfig
  hitLocationCloudChartConfig: ChartConfig
  hitLocationTrendChartConfig: ChartConfig
  hitLocationTrendTicks: number[]
  shotDistributionTicks: number[]
} {
  const hitLocationTrendTicks = useMemo(
    () => buildIndexTicks(hitLocationTrendData.length, maxTicks),
    [hitLocationTrendData.length, maxTicks]
  )
  const shotDistributionTicks = useMemo(
    () => buildIndexTicks(aggregatedShotDistribution.length, maxTicks),
    [aggregatedShotDistribution.length, maxTicks]
  )

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

  const radarLegendItems = useMemo<RadarLegendItem[]>(() => {
    return (
      Object.entries(radarSeriesConfig) as Array<
        [RadarSeriesKey, (typeof radarSeriesConfig)[RadarSeriesKey]]
      >
    ).map(([key, config]) => {
      return {
        key,
        label: config.label,
        color: config.color,
      }
    })
  }, [])

  const lineChartConfig = useMemo<ChartConfig>(
    () => ({
      // Dynamisches Label:
      // Gleicher Chart wird fuer Ringe/Schuss und Hochrechnung genutzt;
      // das Label muss den gewaehlten Modus transparent machen.
      wert: { label: `${metricLabel} (Punkte)`, color: "var(--chart-1)" },
      trend: { label: "Trend", color: createTrendStroke("var(--chart-1)") },
    }),
    [metricLabel]
  )

  const seriesChartConfig = useMemo<ChartConfig>(
    () => ({
      Min: { label: "Min", color: "var(--chart-2)" },
      Avg: { label: "Ø", color: "var(--chart-1)" },
      Max: { label: "Max", color: "var(--chart-1)" },
    }),
    []
  )

  const radarChartConfig = useMemo<ChartConfig>(
    () => ({
      prognosis: {
        label: radarSeriesConfig.prognosis.label,
        color: radarSeriesConfig.prognosis.color,
      },
      feedback: {
        label: radarSeriesConfig.feedback.label,
        color: radarSeriesConfig.feedback.color,
      },
    }),
    []
  )

  const wellbeingChartConfig = useMemo<ChartConfig>(
    () => ({
      displayScore: { label: wellbeingScoreLabel, color: "var(--chart-1)" },
      sleep: { label: "Schlaf" },
      energy: { label: "Energie" },
      stress: { label: "Stress" },
      motivation: { label: "Motivation" },
    }),
    [wellbeingScoreLabel]
  )

  const qualityChartConfig = useMemo<ChartConfig>(
    () => ({
      displayScore: { label: qualityScoreLabel, color: "var(--chart-2)" },
      quality: { label: "Ausführung" },
    }),
    [qualityScoreLabel]
  )

  const shotDistributionChartConfig = useMemo<ChartConfig>(
    () => ({
      r10: { label: "10er", color: shotDistributionBundledColors.r10 },
      r9: { label: "9er", color: shotDistributionBundledColors.r9 },
      r8: { label: "8er", color: shotDistributionBundledColors.r8 },
      r7: { label: "7er", color: shotDistributionBundledColors.r7 },
      r0to6: { label: "0–6er", color: shotDistributionBundledColors.r0to6 },
    }),
    []
  )

  const hitLocationCloudChartConfig = useMemo<ChartConfig>(
    () => ({
      x: { label: "X (rechts+/links−)", color: "var(--chart-1)" },
      y: { label: "Y (hoch+/tief−)", color: "var(--chart-2)" },
    }),
    []
  )

  const hitLocationTrendChartConfig = useMemo<ChartConfig>(
    () => ({
      x: { label: "→ X Punkte", color: "var(--chart-1)" },
      xTrend: { label: "→ X Trend", color: createTrendStroke("var(--chart-1)") },
      y: { label: "↑ Y Punkte", color: "var(--chart-2)" },
      yTrend: { label: "↑ Y Trend", color: createTrendStroke("var(--chart-2)") },
    }),
    []
  )

  return {
    barData,
    seriesYAxis,
    seriesHasDecimals,
    radarChartData,
    radarDateLabel,
    radarLegendItems,
    lineChartConfig,
    seriesChartConfig,
    radarChartConfig,
    wellbeingChartConfig,
    qualityChartConfig,
    shotDistributionChartConfig,
    hitLocationCloudChartConfig,
    hitLocationTrendChartConfig,
    hitLocationTrendTicks,
    shotDistributionTicks,
  }
}
