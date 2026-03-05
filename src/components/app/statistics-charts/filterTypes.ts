import type { DisplayMode } from "@/components/app/statistics-charts/types"
import type { TypeFilter } from "@/components/app/statistics-charts/useStatisticsFilterState"
import type { DisciplineForStats } from "@/lib/stats/actions"

export type StatisticsFiltersPreset = "all" | "6m" | "3m" | "1m" | "custom"

export interface StatisticsFiltersCardModel {
  typeFilter: TypeFilter
  disciplineFilter: string
  availableDisciplines: DisciplineForStats[]
  from: string
  to: string
  activeTimePreset: StatisticsFiltersPreset
  selectedDiscipline: DisciplineForStats | null
  effectiveDisplayMode: DisplayMode
  totalDisciplineShots: number | null
  filteredCount: number
  withScoreCount: number
}

export interface StatisticsFiltersCardActions {
  typeFilterChange: (type: TypeFilter) => void
  disciplineFilterChange: (disciplineId: string) => void
  fromChange: (value: string) => void
  toChange: (value: string) => void
  selectAllTime: () => void
  select6Months: () => void
  select3Months: () => void
  select1Month: () => void
  displayModeChange: (mode: DisplayMode) => void
}
