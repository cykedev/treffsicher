import { useMemo } from "react"
import type { TypeFilter } from "@/components/app/statistics-charts/hooks/useStatisticsFilterState"
import type {
  QualityVsScorePoint,
  RadarComparisonSession,
  ShotDistributionPoint,
  StatsSession,
  WellbeingCorrelationPoint,
} from "@/lib/stats/actions"

interface Params {
  sessions: StatsSession[]
  wellbeingData: WellbeingCorrelationPoint[]
  qualityData: QualityVsScorePoint[]
  shotDistributionData: ShotDistributionPoint[]
  radarData: RadarComparisonSession[]
  typeFilter: TypeFilter
  disciplineFilter: string
  fromDate: Date | null
  toDate: Date | null
}

export function useStatisticsFilteredData({
  sessions,
  wellbeingData,
  qualityData,
  shotDistributionData,
  radarData,
  typeFilter,
  disciplineFilter,
  fromDate,
  toDate,
}: Params) {
  const filteredForTrend = useMemo(() => {
    return sessions.filter((session) => {
      if (typeFilter !== "all" && session.type !== typeFilter) return false
      if (disciplineFilter !== "all" && session.disciplineId !== disciplineFilter) return false
      if (toDate && new Date(session.date) > toDate) return false
      return true
    })
  }, [sessions, typeFilter, disciplineFilter, toDate])

  const filtered = useMemo(() => {
    return filteredForTrend.filter((session) => {
      if (fromDate && new Date(session.date) < fromDate) return false
      return true
    })
  }, [filteredForTrend, fromDate])

  const filteredSessionIds = useMemo(() => {
    return new Set(filtered.map((session) => session.id))
  }, [filtered])

  const filteredWellbeing = useMemo(() => {
    return wellbeingData.filter((point) => filteredSessionIds.has(point.sessionId))
  }, [wellbeingData, filteredSessionIds])

  const filteredQuality = useMemo(() => {
    return qualityData.filter((point) => filteredSessionIds.has(point.sessionId))
  }, [qualityData, filteredSessionIds])

  const filteredShotDistribution = useMemo(() => {
    return shotDistributionData.filter((point) => filteredSessionIds.has(point.sessionId))
  }, [shotDistributionData, filteredSessionIds])

  const filteredRadarSessions = useMemo(() => {
    return radarData.filter((entry) => filteredSessionIds.has(entry.sessionId))
  }, [radarData, filteredSessionIds])

  return {
    filteredForTrend,
    filtered,
    filteredSessionIds,
    filteredWellbeing,
    filteredQuality,
    filteredShotDistribution,
    filteredRadarSessions,
  }
}
