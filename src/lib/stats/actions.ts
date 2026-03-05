"use server"

import { getQualityVsScoreDataAction } from "@/lib/stats/actions/getQualityVsScoreData"
import { getRadarComparisonDataAction } from "@/lib/stats/actions/getRadarComparisonData"
import { getShotDistributionDataAction } from "@/lib/stats/actions/getShotDistributionData"
import { getStatsDataAction } from "@/lib/stats/actions/getStatsData"
import { getWellbeingCorrelationDataAction } from "@/lib/stats/actions/getWellbeingCorrelationData"
import type {
  QualityVsScorePoint,
  RadarComparisonSession,
  ShotDistributionPoint,
  StatsFilters,
  StatsSession,
  WellbeingCorrelationPoint,
} from "@/lib/stats/types"

export type {
  DisciplineForStats,
  QualityVsScorePoint,
  RadarComparisonSession,
  ShotDistributionPoint,
  SeriesForStats,
  StatsFilters,
  StatsSession,
  WellbeingCorrelationPoint,
} from "@/lib/stats/types"

export async function getStatsData(filters: StatsFilters): Promise<StatsSession[]> {
  return getStatsDataAction(filters)
}

export async function getWellbeingCorrelationData(
  filters: StatsFilters
): Promise<WellbeingCorrelationPoint[]> {
  return getWellbeingCorrelationDataAction(filters)
}

export async function getShotDistributionData(
  filters: StatsFilters
): Promise<ShotDistributionPoint[]> {
  return getShotDistributionDataAction(filters)
}

export async function getQualityVsScoreData(
  filters: StatsFilters
): Promise<QualityVsScorePoint[]> {
  return getQualityVsScoreDataAction(filters)
}

export async function getRadarComparisonData(
  filters: StatsFilters
): Promise<RadarComparisonSession[]> {
  return getRadarComparisonDataAction(filters)
}
