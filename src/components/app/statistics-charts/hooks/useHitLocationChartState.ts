import { useMemo } from "react"
import type { HitLocationPoint } from "@/components/app/statistics-charts/types"
import { mapSessionToHitLocationPoint } from "@/components/app/statistics-charts/utils"
import type { StatsSession } from "@/lib/stats/actions"
import { useHitLocationCloudState } from "./useHitLocationCloudState"
import { useHitLocationTrendState } from "./useHitLocationTrendState"

interface Params {
  filteredForTrend: StatsSession[]
  filtered: StatsSession[]
  displayTimeZone: string
  showCloudTrail: boolean
  showHitLocationTrendX: boolean
  showHitLocationTrendY: boolean
}

export function useHitLocationChartState({
  filteredForTrend,
  filtered,
  displayTimeZone,
  showCloudTrail,
  showHitLocationTrendX,
  showHitLocationTrendY,
}: Params) {
  const filteredHitLocationsForTrend = useMemo<HitLocationPoint[]>(() => {
    return filteredForTrend
      .map(mapSessionToHitLocationPoint)
      .filter((point): point is HitLocationPoint => point !== null)
  }, [filteredForTrend])

  const filteredHitLocations = useMemo<HitLocationPoint[]>(() => {
    return filtered
      .map(mapSessionToHitLocationPoint)
      .filter((point): point is HitLocationPoint => point !== null)
  }, [filtered])

  const cloudState = useHitLocationCloudState(filteredHitLocations, showCloudTrail)

  const trendState = useHitLocationTrendState({
    filteredHitLocationsForTrend,
    filteredHitLocations,
    displayTimeZone,
    showHitLocationTrendX,
    showHitLocationTrendY,
  })

  return {
    filteredHitLocations,
    hitLocationCloudAxes: cloudState.hitLocationCloudAxes,
    hitLocationMetrics: cloudState.hitLocationMetrics,
    hitLocationCloudCurveSegments: cloudState.hitLocationCloudCurveSegments,
    hitLocationCloudPathStart: cloudState.hitLocationCloudPathStart,
    hitLocationCloudPathEnd: cloudState.hitLocationCloudPathEnd,
    hitLocationTrendData: trendState.hitLocationTrendData,
    hitLocationTrendAxis: trendState.hitLocationTrendAxis,
    showHitLocationTrendXSeries: trendState.showHitLocationTrendXSeries,
    showHitLocationTrendYSeries: trendState.showHitLocationTrendYSeries,
  }
}
