import { useMemo, useState } from "react"
import {
  useStatisticsFiltersCardState,
  useStatisticsTabsModel,
} from "@/components/app/statistics-charts/hooks"
import { useAvailableDisciplines } from "@/components/app/statistics-charts/hooks/useAvailableDisciplines"
import { useStatisticsChartData } from "@/components/app/statistics-charts/hooks/useStatisticsChartData"
import type { StatisticsChartsDataBundle } from "@/components/app/statistics-charts/types"
import { aggregateOverview } from "@/lib/stats/overview/aggregateOverview"

interface Params {
  data: StatisticsChartsDataBundle
  hiddenDisciplineIds: string[]
  displayTimeZone: string
}

export function useStatisticsChartsModel({ data, hiddenDisciplineIds, displayTimeZone }: Params) {
  const [showCloudTrail, setShowCloudTrail] = useState(false)
  const [showHitLocationTrendX, setShowHitLocationTrendX] = useState(true)
  const [showHitLocationTrendY, setShowHitLocationTrendY] = useState(true)

  const availableDisciplines = useAvailableDisciplines({
    sessions: data.sessions,
    hiddenDisciplineIds,
  })

  const {
    filterState,
    filteredData,
    aggregatedShotDistribution,
    hitLocationState,
    resultTrendState,
    wellbeingQualityState,
    presentationState,
  } = useStatisticsChartData({
    data,
    availableDisciplines,
    displayTimeZone,
    showCloudTrail,
    showHitLocationTrendX,
    showHitLocationTrendY,
  })

  const { filtered, filteredWellbeing, filteredQuality, filteredRadarSessions } = filteredData
  const { effectiveDisplayMode, selectedDiscipline, disciplineFilter } = filterState
  const { totalDisciplineShots } = resultTrendState

  const overviewGroups = useMemo(
    () =>
      aggregateOverview({
        sessions: filtered,
        hiddenDisciplineIds,
        disciplineFilter,
      }),
    [filtered, hiddenDisciplineIds, disciplineFilter]
  )

  const tabsModel = useStatisticsTabsModel({
    overviewGroups,
    hasData: resultTrendState.hasData,
    effectiveDisplayMode,
    selectedDiscipline,
    totalDisciplineShots,
    lineChartConfig: presentationState.lineChartConfig,
    lineData: resultTrendState.lineData,
    lineChartTicks: resultTrendState.lineChartTicks,
    resultTrendYAxis: resultTrendState.resultTrendYAxis,
    metricLabel: resultTrendState.metricLabel,
    barData: presentationState.barData,
    disciplineFilter,
    seriesChartConfig: presentationState.seriesChartConfig,
    seriesYAxis: presentationState.seriesYAxis,
    seriesHasDecimals: presentationState.seriesHasDecimals,
    filteredHitLocations: hitLocationState.filteredHitLocations,
    showCloudTrail,
    setShowCloudTrail,
    hitLocationCloudChartConfig: presentationState.hitLocationCloudChartConfig,
    hitLocationCloudAxes: hitLocationState.hitLocationCloudAxes,
    displayTimeZone,
    hitLocationCloudCurveSegments: hitLocationState.hitLocationCloudCurveSegments,
    hitLocationCloudPathStart: hitLocationState.hitLocationCloudPathStart,
    hitLocationCloudPathEnd: hitLocationState.hitLocationCloudPathEnd,
    hitLocationMetrics: hitLocationState.hitLocationMetrics,
    showHitLocationTrendX,
    showHitLocationTrendY,
    setShowHitLocationTrendX,
    setShowHitLocationTrendY,
    hitLocationTrendChartConfig: presentationState.hitLocationTrendChartConfig,
    hitLocationTrendData: hitLocationState.hitLocationTrendData,
    hitLocationTrendTicks: presentationState.hitLocationTrendTicks,
    hitLocationTrendAxis: hitLocationState.hitLocationTrendAxis,
    showHitLocationTrendXSeries: hitLocationState.showHitLocationTrendXSeries,
    showHitLocationTrendYSeries: hitLocationState.showHitLocationTrendYSeries,
    radarChartData: presentationState.radarChartData,
    filteredRadarSessionsCount: filteredRadarSessions.length,
    radarDateLabel: presentationState.radarDateLabel,
    radarChartConfig: presentationState.radarChartConfig,
    radarLegendItems: presentationState.radarLegendItems,
    filteredWellbeingCount: filteredWellbeing.length,
    wellbeingChartConfig: presentationState.wellbeingChartConfig,
    wellbeingYAxis: wellbeingQualityState.wellbeingYAxis,
    wellbeingScoreLabel: wellbeingQualityState.wellbeingScoreLabel,
    wellbeingDisplayData: wellbeingQualityState.wellbeingDisplayData,
    filteredQualityCount: filteredQuality.length,
    qualityChartConfig: presentationState.qualityChartConfig,
    qualityYAxis: wellbeingQualityState.qualityYAxis,
    qualityScoreLabel: wellbeingQualityState.qualityScoreLabel,
    qualityDisplayData: wellbeingQualityState.qualityDisplayData,
    aggregatedShotDistribution,
    shotDistributionChartConfig: presentationState.shotDistributionChartConfig,
    shotDistributionTicks: presentationState.shotDistributionTicks,
  })

  // Separates FiltersCard-Model:
  // Filter-UI soll nur rendern, nicht Fachlogik kennen. Das reduziert
  // Kopplung zwischen Formularzustand und Chartaufbereitung.
  const { filtersModel, filtersActions } = useStatisticsFiltersCardState({
    typeFilter: filterState.typeFilter,
    disciplineFilter,
    availableDisciplines,
    from: filterState.from,
    to: filterState.to,
    activeTimePreset: filterState.activeTimePreset,
    selectedDiscipline,
    effectiveDisplayMode,
    totalDisciplineShots,
    filteredCount: filtered.length,
    withScoreCount: resultTrendState.withScoreCount,
    setTypeFilter: filterState.setTypeFilter,
    setDisciplineFilter: filterState.setDisciplineFilter,
    setFrom: filterState.setFrom,
    setTo: filterState.setTo,
    setDisplayMode: filterState.setDisplayMode,
    presetToday: filterState.presetToday,
    presetFrom6Months: filterState.presetFrom6Months,
    presetFrom3Months: filterState.presetFrom3Months,
    presetFrom1Month: filterState.presetFrom1Month,
  })

  return { filtersModel, filtersActions, tabsModel }
}
