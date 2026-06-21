import { CHART_TIME_AXIS_MAX_TICKS } from "@/components/app/statistics-charts/constants"
import {
  useAggregatedShotDistribution,
  useHitLocationChartState,
  useResultTrendChartState,
  useStatisticsChartPresentationState,
  useStatisticsFilteredData,
  useStatisticsFilterState,
  useWellbeingQualityChartState,
} from "@/components/app/statistics-charts/hooks"
import type { StatisticsChartsDataBundle } from "@/components/app/statistics-charts/types"
import type { DisciplineForStats } from "@/lib/stats/actions"

interface Params {
  data: StatisticsChartsDataBundle
  availableDisciplines: DisciplineForStats[]
  displayTimeZone: string
  showCloudTrail: boolean
  showHitLocationTrendX: boolean
  showHitLocationTrendY: boolean
}

// Buendelt die abgeleitete Chart-Datenaufbereitung (Filter, Aggregation,
// Trend-/Praesentationszustand) als reine Datenebene fuer die Modellzusammenstellung.
export function useStatisticsChartData({
  data,
  availableDisciplines,
  displayTimeZone,
  showCloudTrail,
  showHitLocationTrendX,
  showHitLocationTrendY,
}: Params) {
  const { sessions, wellbeingData, qualityData, shotDistributionData, radarData } = data

  const filterState = useStatisticsFilterState({ availableDisciplines })
  const {
    typeFilter,
    disciplineFilter,
    fromDate,
    toDate,
    effectiveDisplayMode,
    selectedDiscipline,
  } = filterState

  const filteredData = useStatisticsFilteredData({
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
  const {
    filteredForTrend,
    filtered,
    filteredWellbeing,
    filteredQuality,
    filteredShotDistribution,
    filteredRadarSessions,
  } = filteredData

  // Aggregation vor der Praesentation:
  // Die Tabs brauchen bereits verdichtete Reihen, damit die Komponenten keine
  // doppelte Transform-Logik enthalten.
  const aggregatedShotDistribution = useAggregatedShotDistribution({
    filteredShotDistribution,
    displayTimeZone,
  })

  const hitLocationState = useHitLocationChartState({
    filteredForTrend,
    filtered,
    displayTimeZone,
    showCloudTrail,
    showHitLocationTrendX,
    showHitLocationTrendY,
  })

  const resultTrendState = useResultTrendChartState({
    filteredForTrend,
    filtered,
    effectiveDisplayMode,
    selectedDiscipline,
    displayTimeZone,
    maxTicks: CHART_TIME_AXIS_MAX_TICKS,
  })
  const { totalDisciplineShots, metricLabel } = resultTrendState

  const wellbeingQualityState = useWellbeingQualityChartState({
    filteredWellbeing,
    filteredQuality,
    effectiveDisplayMode,
    selectedDiscipline,
    totalDisciplineShots,
  })

  const presentationState = useStatisticsChartPresentationState({
    filtered,
    filteredRadarSessions,
    aggregatedShotDistribution,
    hitLocationTrendData: hitLocationState.hitLocationTrendData,
    metricLabel,
    wellbeingScoreLabel: wellbeingQualityState.wellbeingScoreLabel,
    qualityScoreLabel: wellbeingQualityState.qualityScoreLabel,
    displayTimeZone,
    maxTicks: CHART_TIME_AXIS_MAX_TICKS,
  })

  return {
    filterState,
    filteredData,
    aggregatedShotDistribution,
    hitLocationState,
    resultTrendState,
    wellbeingQualityState,
    presentationState,
  }
}
