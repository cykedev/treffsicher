"use client"

import { StatisticsFiltersCard } from "@/components/app/statistics-charts/StatisticsFiltersCard"
import { StatisticsChartsTabs } from "@/components/app/statistics-charts/StatisticsChartsTabs"
import { useStatisticsChartsModel } from "@/components/app/statistics-charts/hooks"
import type { StatisticsChartsDataBundle } from "@/components/app/statistics-charts/types"

interface Props {
  data: StatisticsChartsDataBundle
  hiddenDisciplineIds: string[]
  displayTimeZone: string
}

export function StatisticsCharts({ data, hiddenDisciplineIds, displayTimeZone }: Props) {
  const { filtersModel, filtersActions, tabsModel } = useStatisticsChartsModel({
    data,
    hiddenDisciplineIds,
    displayTimeZone,
  })

  return (
    <div className="space-y-6">
      <StatisticsFiltersCard model={filtersModel} actions={filtersActions} />
      <StatisticsChartsTabs model={tabsModel} />
    </div>
  )
}
