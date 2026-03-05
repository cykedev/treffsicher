import type { ChartConfig } from "@/components/ui/chart"
import type {
  AggregatedShotDistributionPoint,
  DisplayMode,
  HitLocationPathPoint,
  RadarLegendItem,
} from "@/components/app/statistics-charts/types"
import type { DisciplineForStats } from "@/lib/stats/actions"

export type AxisConfig = {
  domain: [number, number]
  ticks: number[]
}

export type LineDataPoint = {
  i: number
  datum: string
  wert: number
  trend: number | null
  trendLow: number | null
  trendHigh: number | null
  trendBand: number[] | null
}

export type HitLocationTrendDataPoint = {
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
}

export type RadarChartPoint = {
  dimension: string
  prognosis: number
  feedback: number
}

export type WellbeingDisplayPoint = {
  sleep: number
  energy: number
  stress: number
  motivation: number
  displayScore: number
}

export type QualityDisplayPoint = {
  quality: number
  displayScore: number
}

export interface TrendTabModel {
  hasData: boolean
  resultTrend: {
    effectiveDisplayMode: DisplayMode
    selectedDiscipline: DisciplineForStats | null
    totalDisciplineShots: number | null
    lineChartConfig: ChartConfig
    lineData: LineDataPoint[]
    lineChartTicks: number[]
    resultTrendYAxis: AxisConfig
    metricLabel: string
  }
  seriesRatings: {
    barData: Array<{ name: string; Min: number; Avg: number; Max: number }>
    disciplineFilter: string
    seriesChartConfig: ChartConfig
    seriesYAxis: AxisConfig
    seriesHasDecimals: boolean
  }
}

export interface HitLocationCloudModel {
  filteredHitLocations: Array<{ sessionId: string; date: Date; x: number; y: number }>
  showCloudTrail: boolean
  onToggleCloudTrail: () => void
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
}

export interface HitLocationTrendModel {
  displayTimeZone: string
  showHitLocationTrendX: boolean
  showHitLocationTrendY: boolean
  onToggleHitLocationTrendX: () => void
  onToggleHitLocationTrendY: () => void
  hitLocationTrendChartConfig: ChartConfig
  hitLocationTrendData: HitLocationTrendDataPoint[]
  hitLocationTrendTicks: number[]
  hitLocationTrendAxis: AxisConfig
  showHitLocationTrendXSeries: boolean
  showHitLocationTrendYSeries: boolean
}

export interface HitLocationTabModel {
  cloud: HitLocationCloudModel
  trend: HitLocationTrendModel
}

export interface SelfAssessmentTabModel {
  radarChartData: RadarChartPoint[]
  filteredRadarSessionsCount: number
  radarDateLabel: string | null
  radarChartConfig: ChartConfig
  radarLegendItems: RadarLegendItem[]
}

export interface WellbeingTabModel {
  filteredWellbeingCount: number
  wellbeingChartConfig: ChartConfig
  wellbeingYAxis: AxisConfig
  wellbeingScoreLabel: string
  wellbeingDisplayData: WellbeingDisplayPoint[]
  effectiveDisplayMode: DisplayMode
  selectedDiscipline: DisciplineForStats | null
}

export interface QualityTabModel {
  // Scatter und Distribution bewusst getrennt halten: beide teilen Filter, aber nicht denselben Darstellungsmaßstab.
  scatter: {
    filteredQualityCount: number
    qualityChartConfig: ChartConfig
    qualityYAxis: AxisConfig
    qualityScoreLabel: string
    qualityDisplayData: QualityDisplayPoint[]
    effectiveDisplayMode: DisplayMode
    selectedDiscipline: DisciplineForStats | null
  }
  distribution: {
    aggregatedShotDistribution: AggregatedShotDistributionPoint[]
    shotDistributionChartConfig: ChartConfig
    shotDistributionTicks: number[]
  }
}

export interface StatisticsChartsTabsModel {
  trend: TrendTabModel
  hitLocation: HitLocationTabModel
  selfAssessment: SelfAssessmentTabModel
  wellbeing: WellbeingTabModel
  quality: QualityTabModel
}

export interface StatisticsChartsTabsProps {
  model: StatisticsChartsTabsModel
}
