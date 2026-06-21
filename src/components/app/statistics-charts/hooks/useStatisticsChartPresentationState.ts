import { useMemo } from "react"
import type { ChartConfig } from "@/components/ui/chart"
import { radarSeriesConfig } from "@/components/app/statistics-charts/constants"
import type { HitLocationTrendDataPoint } from "@/components/app/statistics-charts/tabs/types"
import type {
  AggregatedShotDistributionPoint,
  RadarLegendItem,
  RadarSeriesKey,
} from "@/components/app/statistics-charts/types"
import { buildIndexTicks } from "@/components/app/statistics-charts/utils"
import type { RadarComparisonSession, StatsSession } from "@/lib/stats/actions"
import { useStatisticsChartConfigs } from "./useStatisticsChartConfigs"
import { useStatisticsChartSeriesData } from "./useStatisticsChartSeriesData"

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

  const seriesData = useStatisticsChartSeriesData({
    filtered,
    filteredRadarSessions,
    displayTimeZone,
  })

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

  const configs = useStatisticsChartConfigs({
    metricLabel,
    wellbeingScoreLabel,
    qualityScoreLabel,
  })

  return {
    barData: seriesData.barData,
    seriesYAxis: seriesData.seriesYAxis,
    seriesHasDecimals: seriesData.seriesHasDecimals,
    radarChartData: seriesData.radarChartData,
    radarDateLabel: seriesData.radarDateLabel,
    radarLegendItems,
    lineChartConfig: configs.lineChartConfig,
    seriesChartConfig: configs.seriesChartConfig,
    radarChartConfig: configs.radarChartConfig,
    wellbeingChartConfig: configs.wellbeingChartConfig,
    qualityChartConfig: configs.qualityChartConfig,
    shotDistributionChartConfig: configs.shotDistributionChartConfig,
    hitLocationCloudChartConfig: configs.hitLocationCloudChartConfig,
    hitLocationTrendChartConfig: configs.hitLocationTrendChartConfig,
    hitLocationTrendTicks,
    shotDistributionTicks,
  }
}
