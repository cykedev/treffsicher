"use client"

import dynamic from "next/dynamic"
import type { StatisticsChartsDataBundle } from "@/components/app/statistics-charts/types"

// StatisticsCharts enthält Radix UI (Select), das aria-controls IDs via useId() generiert.
// SSR führt zu Hydration-Mismatch (Server vs. Client IDs differ).
// ssr: false darf nur in Client Components verwendet werden — daher dieser Wrapper.
const StatisticsChartsInner = dynamic(
  () =>
    import("@/components/app/statistics-charts/StatisticsCharts").then((m) => m.StatisticsCharts),
  { ssr: false }
)

interface Props {
  data: StatisticsChartsDataBundle
  hiddenDisciplineIds: string[]
  displayTimeZone: string
}

export function StatisticsChartsWrapper({ data, hiddenDisciplineIds, displayTimeZone }: Props) {
  return (
    <StatisticsChartsInner
      data={data}
      hiddenDisciplineIds={hiddenDisciplineIds}
      displayTimeZone={displayTimeZone}
    />
  )
}
