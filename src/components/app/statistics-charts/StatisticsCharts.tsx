"use client"

import { useMemo, useState } from "react"
import { CHART_TIME_AXIS_MAX_TICKS } from "@/components/app/statistics-charts/constants"
import { StatisticsFiltersCard } from "@/components/app/statistics-charts/StatisticsFiltersCard"
import { StatisticsChartsTabs } from "@/components/app/statistics-charts/StatisticsChartsTabs"
import {
  useAggregatedShotDistribution,
  useHitLocationChartState,
  useResultTrendChartState,
  useStatisticsChartPresentationState,
  useStatisticsFiltersCardState,
  useStatisticsFilteredData,
  useStatisticsFilterState,
  useStatisticsTabsModel,
  useWellbeingQualityChartState,
} from "@/components/app/statistics-charts/hooks"
import type { StatisticsChartsDataBundle } from "@/components/app/statistics-charts/types"
import type { DisciplineForStats } from "@/lib/stats/actions"

interface Props {
  data: StatisticsChartsDataBundle
  displayTimeZone: string
}

export function StatisticsCharts({ data, displayTimeZone }: Props) {
  const { sessions, wellbeingData, qualityData, shotDistributionData, radarData } = data
  const [showCloudTrail, setShowCloudTrail] = useState(false)
  const [showHitLocationTrendX, setShowHitLocationTrendX] = useState(true)
  const [showHitLocationTrendY, setShowHitLocationTrendY] = useState(true)

  const availableDisciplines = useMemo<DisciplineForStats[]>(() => {
    // Filterliste direkt aus vorhandenen Sessions ableiten:
    // So bleibt die Filterliste exakt auf tatsaechlich vorhandene Daten
    // begrenzt und verhindert leere Filter-Zustaende ohne Treffer.
    const seen = new Set<string>()
    const result: DisciplineForStats[] = []
    for (const session of sessions) {
      if (session.discipline && !seen.has(session.discipline.id)) {
        seen.add(session.discipline.id)
        result.push(session.discipline)
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

  // Aggregation vor der Praesentation:
  // Die Tabs brauchen bereits verdichtete Reihen, damit die Komponenten keine
  // doppelte Transform-Logik enthalten.
  const aggregatedShotDistribution = useAggregatedShotDistribution({
    filteredShotDistribution,
    displayTimeZone,
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
    displayTimeZone,
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
    displayTimeZone,
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

  const {
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
  } = useStatisticsChartPresentationState({
    filtered,
    filteredRadarSessions,
    aggregatedShotDistribution,
    hitLocationTrendData,
    metricLabel,
    wellbeingScoreLabel,
    qualityScoreLabel,
    displayTimeZone,
    maxTicks: CHART_TIME_AXIS_MAX_TICKS,
  })

  const tabsModel = useStatisticsTabsModel({
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
    filteredHitLocations,
    showCloudTrail,
    setShowCloudTrail,
    hitLocationCloudChartConfig,
    hitLocationCloudAxes,
    displayTimeZone,
    hitLocationCloudCurveSegments,
    hitLocationCloudPathStart,
    hitLocationCloudPathEnd,
    hitLocationMetrics,
    showHitLocationTrendX,
    showHitLocationTrendY,
    setShowHitLocationTrendX,
    setShowHitLocationTrendY,
    hitLocationTrendChartConfig,
    hitLocationTrendData,
    hitLocationTrendTicks,
    hitLocationTrendAxis,
    showHitLocationTrendXSeries,
    showHitLocationTrendYSeries,
    radarChartData,
    filteredRadarSessionsCount: filteredRadarSessions.length,
    radarDateLabel,
    radarChartConfig,
    radarLegendItems,
    filteredWellbeingCount: filteredWellbeing.length,
    wellbeingChartConfig,
    wellbeingYAxis,
    wellbeingScoreLabel,
    wellbeingDisplayData,
    filteredQualityCount: filteredQuality.length,
    qualityChartConfig,
    qualityYAxis,
    qualityScoreLabel,
    qualityDisplayData,
    aggregatedShotDistribution,
    shotDistributionChartConfig,
    shotDistributionTicks,
  })

  // Separates FiltersCard-Model:
  // Filter-UI soll nur rendern, nicht Fachlogik kennen. Das reduziert
  // Kopplung zwischen Formularzustand und Chartaufbereitung.
  const { filtersModel, filtersActions } = useStatisticsFiltersCardState({
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
    setTypeFilter,
    setDisciplineFilter,
    setFrom,
    setTo,
    setDisplayMode,
    presetToday,
    presetFrom6Months,
    presetFrom3Months,
    presetFrom1Month,
  })

  return (
    <div className="space-y-6">
      <StatisticsFiltersCard model={filtersModel} actions={filtersActions} />
      <StatisticsChartsTabs model={tabsModel} />
    </div>
  )
}
