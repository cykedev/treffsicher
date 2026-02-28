"use client"

import dynamic from "next/dynamic"
import type {
  StatsSession,
  WellbeingCorrelationPoint,
  QualityVsScorePoint,
} from "@/lib/stats/actions"

// StatistikCharts enthält Radix UI (Select), das aria-controls IDs via useId() generiert.
// SSR führt zu Hydration-Mismatch (Server vs. Client IDs differ).
// ssr: false darf nur in Client Components verwendet werden — daher dieser Wrapper.
const StatistikChartsInner = dynamic(
  () => import("@/components/app/StatistikCharts").then((m) => m.StatistikCharts),
  { ssr: false }
)

interface Props {
  sessions: StatsSession[]
  wellbeingData: WellbeingCorrelationPoint[]
  qualityData: QualityVsScorePoint[]
}

export function StatistikChartsWrapper({ sessions, wellbeingData, qualityData }: Props) {
  return (
    <StatistikChartsInner
      sessions={sessions}
      wellbeingData={wellbeingData}
      qualityData={qualityData}
    />
  )
}
