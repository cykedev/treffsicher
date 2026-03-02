"use client"

import dynamic from "next/dynamic"
import type {
  StatsSession,
  WellbeingCorrelationPoint,
  QualityVsScorePoint,
  ShotDistributionPoint,
  RadarComparisonSession,
} from "@/lib/stats/actions"

// StatisticsCharts enthält Radix UI (Select), das aria-controls IDs via useId() generiert.
// SSR führt zu Hydration-Mismatch (Server vs. Client IDs differ).
// ssr: false darf nur in Client Components verwendet werden — daher dieser Wrapper.
const StatisticsChartsInner = dynamic(
  () => import("@/components/app/StatisticsCharts").then((m) => m.StatisticsCharts),
  { ssr: false }
)

interface Props {
  sessions: StatsSession[]
  wellbeingData: WellbeingCorrelationPoint[]
  qualityData: QualityVsScorePoint[]
  shotDistributionData: ShotDistributionPoint[]
  radarData: RadarComparisonSession[]
}

export function StatisticsChartsWrapper({
  sessions,
  wellbeingData,
  qualityData,
  shotDistributionData,
  radarData,
}: Props) {
  return (
    <StatisticsChartsInner
      sessions={sessions}
      wellbeingData={wellbeingData}
      qualityData={qualityData}
      shotDistributionData={shotDistributionData}
      radarData={radarData}
    />
  )
}
