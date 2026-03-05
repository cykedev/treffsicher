import type { Dispatch, SetStateAction } from "react"
import type { ChartConfig } from "@/components/ui/chart"
import type {
  StatisticsFiltersCardActions,
  StatisticsFiltersCardModel,
  StatisticsFiltersPreset,
} from "@/components/app/statistics-charts/filterTypes"
import type { StatisticsChartsTabsModel } from "@/components/app/statistics-charts/tabs/types"
import type {
  AggregatedShotDistributionPoint,
  DisplayMode,
  HitLocationPathPoint,
} from "@/components/app/statistics-charts/types"
import type { TypeFilter } from "@/components/app/statistics-charts/hooks/useStatisticsFilterState"
import type { DisciplineForStats } from "@/lib/stats/actions"

export interface TabsParams {
  // Breite, explizite Struktur hält Mapping-Hooks von konkreten Tab-Komponenten entkoppelt.
  hasData: boolean
  effectiveDisplayMode: DisplayMode
  selectedDiscipline: DisciplineForStats | null
  totalDisciplineShots: number | null
  lineChartConfig: ChartConfig
  lineData: Array<{
    i: number
    datum: string
    wert: number
    trend: number | null
    trendLow: number | null
    trendHigh: number | null
    trendBand: number[] | null
  }>
  lineChartTicks: number[]
  resultTrendYAxis: { domain: [number, number]; ticks: number[] }
  metricLabel: string
  barData: Array<{ name: string; Min: number; Avg: number; Max: number }>
  disciplineFilter: string
  seriesChartConfig: ChartConfig
  seriesYAxis: { domain: [number, number]; ticks: number[] }
  seriesHasDecimals: boolean
  filteredHitLocations: Array<{ sessionId: string; date: Date; x: number; y: number }>
  showCloudTrail: boolean
  setShowCloudTrail: Dispatch<SetStateAction<boolean>>
  hitLocationCloudChartConfig: ChartConfig
  hitLocationCloudAxes: {
    xDomain: [number, number]
    xTicks: number[]
    yDomain: [number, number]
    yTicks: number[]
  }
  displayTimeZone: string
  hitLocationCloudCurveSegments: Array<
    readonly [{ x: number; y: number }, { x: number; y: number }]
  >
  hitLocationCloudPathStart: HitLocationPathPoint | null
  hitLocationCloudPathEnd: HitLocationPathPoint | null
  hitLocationMetrics: { meanX: number | null; meanY: number | null }
  showHitLocationTrendX: boolean
  showHitLocationTrendY: boolean
  setShowHitLocationTrendX: Dispatch<SetStateAction<boolean>>
  setShowHitLocationTrendY: Dispatch<SetStateAction<boolean>>
  hitLocationTrendChartConfig: ChartConfig
  hitLocationTrendData: Array<{
    i: number
    date: Date
    dateLabel: string
    x: number
    y: number
    xTrend: number | null
    yTrend: number | null
    xTrendLow: number | null
    xTrendHigh: number | null
    yTrendLow: number | null
    yTrendHigh: number | null
    xTrendBand: readonly [number, number] | null
    yTrendBand: readonly [number, number] | null
  }>
  hitLocationTrendTicks: number[]
  hitLocationTrendAxis: { domain: [number, number]; ticks: number[] }
  showHitLocationTrendXSeries: boolean
  showHitLocationTrendYSeries: boolean
  radarChartData: Array<{ dimension: string; prognosis: number; feedback: number }>
  filteredRadarSessionsCount: number
  radarDateLabel: string | null
  radarChartConfig: ChartConfig
  radarLegendItems: Array<{ key: "prognosis" | "feedback"; label: string; color: string }>
  filteredWellbeingCount: number
  wellbeingChartConfig: ChartConfig
  wellbeingYAxis: { domain: [number, number]; ticks: number[] }
  wellbeingScoreLabel: string
  wellbeingDisplayData: Array<{
    sleep: number
    energy: number
    stress: number
    motivation: number
    displayScore: number
  }>
  filteredQualityCount: number
  qualityChartConfig: ChartConfig
  qualityYAxis: { domain: [number, number]; ticks: number[] }
  qualityScoreLabel: string
  qualityDisplayData: Array<{ quality: number; displayScore: number }>
  aggregatedShotDistribution: AggregatedShotDistributionPoint[]
  shotDistributionChartConfig: ChartConfig
  shotDistributionTicks: number[]
}

export interface FiltersParams {
  typeFilter: TypeFilter
  disciplineFilter: string
  availableDisciplines: DisciplineForStats[]
  from: string
  to: string
  activeTimePreset: StatisticsFiltersPreset
  selectedDiscipline: DisciplineForStats | null
  effectiveDisplayMode: DisplayMode
  totalDisciplineShots: number | null
  filteredCount: number
  withScoreCount: number
  setTypeFilter: Dispatch<SetStateAction<TypeFilter>>
  setDisciplineFilter: Dispatch<SetStateAction<string>>
  setFrom: Dispatch<SetStateAction<string>>
  setTo: Dispatch<SetStateAction<string>>
  setDisplayMode: Dispatch<SetStateAction<DisplayMode>>
  presetToday: string
  presetFrom6Months: string
  presetFrom3Months: string
  presetFrom1Month: string
}

export type StatisticsFiltersCardState = {
  filtersModel: StatisticsFiltersCardModel
  filtersActions: StatisticsFiltersCardActions
}

export type StatisticsTabsState = StatisticsChartsTabsModel
