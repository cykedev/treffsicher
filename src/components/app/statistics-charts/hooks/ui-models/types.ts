import type { Dispatch, SetStateAction } from "react"
import type {
  StatisticsFiltersCardActions,
  StatisticsFiltersCardModel,
} from "@/components/app/statistics-charts/filterTypes"
import type { StatisticsChartsTabsModel } from "@/components/app/statistics-charts/tabs/types"
import type {
  AggregatedShotDistributionPoint,
  TimePreset,
} from "@/components/app/statistics-charts/types"
import type { DisciplineForStats } from "@/lib/stats/actions"

export interface TabsParams {
  hasData: boolean
  effectiveDisplayMode: "per_shot" | "projected"
  selectedDiscipline: DisciplineForStats | null
  totalDisciplineShots: number | null
  lineChartConfig: Record<string, { label?: string; color?: string }>
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
  seriesChartConfig: Record<string, { label?: string; color?: string }>
  seriesYAxis: { domain: [number, number]; ticks: number[] }
  seriesHasDecimals: boolean
  filteredHitLocations: Array<{ sessionId: string; date: Date; x: number; y: number }>
  showCloudTrail: boolean
  setShowCloudTrail: Dispatch<SetStateAction<boolean>>
  hitLocationCloudChartConfig: Record<string, { label?: string; color?: string }>
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
  hitLocationCloudPathStart: { x: number; y: number } | null
  hitLocationCloudPathEnd: { x: number; y: number } | null
  hitLocationMetrics: { meanX: number | null; meanY: number | null }
  showHitLocationTrendX: boolean
  showHitLocationTrendY: boolean
  setShowHitLocationTrendX: Dispatch<SetStateAction<boolean>>
  setShowHitLocationTrendY: Dispatch<SetStateAction<boolean>>
  hitLocationTrendChartConfig: Record<string, { label?: string; color?: string }>
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
  radarChartConfig: Record<string, { label?: string; color?: string }>
  radarLegendItems: Array<{ key: "prognosis" | "feedback"; label: string; color: string }>
  filteredWellbeingCount: number
  wellbeingChartConfig: Record<string, { label?: string; color?: string }>
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
  qualityChartConfig: Record<string, { label?: string; color?: string }>
  qualityYAxis: { domain: [number, number]; ticks: number[] }
  qualityScoreLabel: string
  qualityDisplayData: Array<{ quality: number; displayScore: number }>
  aggregatedShotDistribution: AggregatedShotDistributionPoint[]
  shotDistributionChartConfig: Record<string, { label?: string; color?: string }>
  shotDistributionTicks: number[]
}

export interface FiltersParams {
  typeFilter: string
  disciplineFilter: string
  availableDisciplines: DisciplineForStats[]
  from: string
  to: string
  activeTimePreset: TimePreset
  selectedDiscipline: DisciplineForStats | null
  effectiveDisplayMode: "per_shot" | "projected"
  totalDisciplineShots: number | null
  filteredCount: number
  withScoreCount: number
  setTypeFilter: Dispatch<SetStateAction<string>>
  setDisciplineFilter: Dispatch<SetStateAction<string>>
  setFrom: Dispatch<SetStateAction<string>>
  setTo: Dispatch<SetStateAction<string>>
  setDisplayMode: Dispatch<SetStateAction<"per_shot" | "projected">>
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
