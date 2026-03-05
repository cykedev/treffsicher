"use client"

import { useMemo, useState } from "react"
import { calculateSeriesStats } from "@/lib/stats/calculateSeriesStats"
import type { ChartConfig } from "@/components/ui/chart"
import {
  CHART_TIME_AXIS_MAX_TICKS,
  radarDimensions,
  radarSeriesConfig,
  shotDistributionBundledColors,
} from "@/components/app/statistics-charts/constants"
import type {
  StatisticsFiltersCardActions,
  StatisticsFiltersCardModel,
} from "@/components/app/statistics-charts/filterTypes"
import { StatisticsFiltersCard } from "@/components/app/statistics-charts/StatisticsFiltersCard"
import { StatisticsChartsTabs } from "@/components/app/statistics-charts/StatisticsChartsTabs"
import {
  useAggregatedShotDistribution,
  useHitLocationChartState,
  useResultTrendChartState,
  useStatisticsFilteredData,
  useStatisticsFilterState,
  useWellbeingQualityChartState,
} from "@/components/app/statistics-charts/hooks"
import type { StatisticsChartsTabsModel } from "@/components/app/statistics-charts/tabs/types"
import type {
  RadarLegendItem,
  RadarSeriesKey,
  StatisticsChartsDataBundle,
} from "@/components/app/statistics-charts/types"
import {
  buildIndexTicks,
  computeStableAxis,
  createTrendStroke,
} from "@/components/app/statistics-charts/utils"
import type { DisciplineForStats } from "@/lib/stats/actions"

interface Props {
  data: StatisticsChartsDataBundle
  displayTimeZone: string
}

export function StatisticsCharts({ data, displayTimeZone }: Props) {
  const { sessions, wellbeingData, qualityData, shotDistributionData, radarData } = data
  const DISPLAY_TIME_ZONE = displayTimeZone
  const [showCloudTrail, setShowCloudTrail] = useState(false)
  const [showHitLocationTrendX, setShowHitLocationTrendX] = useState(true)
  const [showHitLocationTrendY, setShowHitLocationTrendY] = useState(true)

  // Verfügbare Disziplinen aus den Einheitendaten ableiten — keine separate Abfrage nötig
  const availableDisciplines = useMemo<DisciplineForStats[]>(() => {
    const seen = new Set<string>()
    const result: DisciplineForStats[] = []
    for (const s of sessions) {
      if (s.discipline && !seen.has(s.discipline.id)) {
        seen.add(s.discipline.id)
        result.push(s.discipline)
      }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name, "de"))
  }, [sessions])
  const {
    typeFilter,
    setTypeFilter,
    from,
    setFrom,
    to,
    setTo,
    disciplineFilter,
    setDisciplineFilter,
    setDisplayMode,
    selectedDiscipline,
    effectiveDisplayMode,
    fromDate,
    toDate,
    presetToday,
    presetFrom6Months,
    presetFrom3Months,
    presetFrom1Month,
    activeTimePreset,
  } = useStatisticsFilterState({
    availableDisciplines,
  })

  const {
    filteredForTrend,
    filtered,
    filteredWellbeing,
    filteredQuality,
    filteredShotDistribution,
    filteredRadarSessions,
  } = useStatisticsFilteredData({
    sessions,
    wellbeingData,
    qualityData,
    shotDistributionData,
    radarData,
    typeFilter,
    disciplineFilter,
    fromDate,
    toDate,
  })

  const aggregatedShotDistribution = useAggregatedShotDistribution({
    filteredShotDistribution,
    displayTimeZone: DISPLAY_TIME_ZONE,
  })

  const {
    filteredHitLocations,
    hitLocationCloudAxes,
    hitLocationMetrics,
    hitLocationCloudCurveSegments,
    hitLocationCloudPathStart,
    hitLocationCloudPathEnd,
    hitLocationTrendData,
    hitLocationTrendAxis,
    showHitLocationTrendXSeries,
    showHitLocationTrendYSeries,
  } = useHitLocationChartState({
    filteredForTrend,
    filtered,
    displayTimeZone: DISPLAY_TIME_ZONE,
    showCloudTrail,
    showHitLocationTrendX,
    showHitLocationTrendY,
  })

  const {
    withScoreCount,
    hasData,
    totalDisciplineShots,
    metricLabel,
    lineData,
    resultTrendYAxis,
    lineChartTicks,
  } = useResultTrendChartState({
    filteredForTrend,
    filtered,
    effectiveDisplayMode,
    selectedDiscipline,
    displayTimeZone: DISPLAY_TIME_ZONE,
    maxTicks: CHART_TIME_AXIS_MAX_TICKS,
  })

  const {
    wellbeingDisplayData,
    qualityDisplayData,
    wellbeingYAxis,
    qualityYAxis,
    wellbeingScoreLabel,
    qualityScoreLabel,
  } = useWellbeingQualityChartState({
    filteredWellbeing,
    filteredQuality,
    effectiveDisplayMode,
    selectedDiscipline,
    totalDisciplineShots,
  })

  const hitLocationTrendTicks = useMemo(
    () => buildIndexTicks(hitLocationTrendData.length, CHART_TIME_AXIS_MAX_TICKS),
    [hitLocationTrendData.length]
  )
  const shotDistributionTicks = useMemo(
    () => buildIndexTicks(aggregatedShotDistribution.length, CHART_TIME_AXIS_MAX_TICKS),
    [aggregatedShotDistribution.length]
  )

  // Serien-Statistiken für BarChart
  const seriesStats = useMemo(() => calculateSeriesStats(filtered), [filtered])
  const barData = seriesStats.map((s) => ({
    name: `S${s.position}`,
    Min: s.min,
    Max: s.max,
    Avg: s.avg,
  }))
  const seriesValues = useMemo(() => {
    return barData
      .flatMap((s) => [s.Min, s.Avg, s.Max])
      .filter((v): v is number => Number.isFinite(v))
  }, [barData])

  const seriesYAxis = useMemo<{ domain: [number, number]; ticks: number[] }>(() => {
    return computeStableAxis(seriesValues)
  }, [seriesValues])

  const seriesHasDecimals = useMemo(() => {
    return seriesValues.some((v) => Math.abs(v - Math.round(v)) > 1e-6)
  }, [seriesValues])

  const radarChartData = useMemo(() => {
    if (filteredRadarSessions.length === 0) return []
    const count = filteredRadarSessions.length

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
      timeZone: DISPLAY_TIME_ZONE,
    })
    return `${format.format(new Date(first.date))} bis ${format.format(new Date(last.date))}`
  }, [filteredRadarSessions, DISPLAY_TIME_ZONE])

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

  const tabsModel: StatisticsChartsTabsModel = {
    trend: {
      hasData,
      effectiveDisplayMode,
      selectedDiscipline,
      totalDisciplineShots,
      lineChartConfig,
      lineData,
      lineChartTicks,
      resultTrendYAxis,
      metricLabel,
      barData,
      disciplineFilter,
      seriesChartConfig,
      seriesYAxis,
      seriesHasDecimals,
    },
    hitLocation: {
      cloud: {
        filteredHitLocations,
        showCloudTrail,
        onToggleCloudTrail: () => setShowCloudTrail((current) => !current),
        hitLocationCloudChartConfig,
        hitLocationCloudAxes,
        displayTimeZone: DISPLAY_TIME_ZONE,
        hitLocationCloudCurveSegments,
        hitLocationCloudPathStart,
        hitLocationCloudPathEnd,
        hitLocationMetrics,
      },
      trend: {
        displayTimeZone: DISPLAY_TIME_ZONE,
        showHitLocationTrendX,
        showHitLocationTrendY,
        onToggleHitLocationTrendX: () => setShowHitLocationTrendX((current) => !current),
        onToggleHitLocationTrendY: () => setShowHitLocationTrendY((current) => !current),
        hitLocationTrendChartConfig,
        hitLocationTrendData,
        hitLocationTrendTicks,
        hitLocationTrendAxis,
        showHitLocationTrendXSeries,
        showHitLocationTrendYSeries,
      },
    },
    selfAssessment: {
      radarChartData,
      filteredRadarSessionsCount: filteredRadarSessions.length,
      radarDateLabel,
      radarChartConfig,
      radarLegendItems,
    },
    wellbeing: {
      filteredWellbeingCount: filteredWellbeing.length,
      wellbeingChartConfig,
      wellbeingYAxis,
      wellbeingScoreLabel,
      wellbeingDisplayData,
      effectiveDisplayMode,
      selectedDiscipline,
    },
    quality: {
      filteredQualityCount: filteredQuality.length,
      qualityChartConfig,
      qualityYAxis,
      qualityScoreLabel,
      qualityDisplayData,
      effectiveDisplayMode,
      selectedDiscipline,
      aggregatedShotDistribution,
      shotDistributionChartConfig,
      shotDistributionTicks,
    },
  }
  const filtersModel: StatisticsFiltersCardModel = {
    typeFilter,
    disciplineFilter,
    availableDisciplines,
    from,
    to,
    activeTimePreset,
    selectedDiscipline,
    effectiveDisplayMode,
    totalDisciplineShots,
    filteredCount: filtered.length,
    withScoreCount,
  }
  const filtersActions: StatisticsFiltersCardActions = {
    typeFilterChange: setTypeFilter,
    disciplineFilterChange: setDisciplineFilter,
    fromChange: setFrom,
    toChange: setTo,
    selectAllTime: () => {
      setFrom("")
      setTo("")
    },
    select6Months: () => {
      setFrom(presetFrom6Months)
      setTo(presetToday)
    },
    select3Months: () => {
      setFrom(presetFrom3Months)
      setTo(presetToday)
    },
    select1Month: () => {
      setFrom(presetFrom1Month)
      setTo(presetToday)
    },
    displayModeChange: setDisplayMode,
  }

  return (
    <div className="space-y-6">
      <StatisticsFiltersCard model={filtersModel} actions={filtersActions} />

      <StatisticsChartsTabs model={tabsModel} />
    </div>
  )
}
