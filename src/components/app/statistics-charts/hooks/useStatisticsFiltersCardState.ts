import { useMemo } from "react"
import type {
  FiltersParams,
  StatisticsFiltersCardState,
} from "@/components/app/statistics-charts/hooks/ui-models/types"

export function useStatisticsFiltersCardState(params: FiltersParams): StatisticsFiltersCardState {
  const {
    typeFilter,
    disciplineFilter,
    availableDisciplines,
    from,
    to,
    activeTimePreset,
    selectedDiscipline,
    effectiveDisplayMode,
    totalDisciplineShots,
    filteredCount,
    withScoreCount,
    setTypeFilter,
    setDisciplineFilter,
    setFrom,
    setTo,
    setDisplayMode,
    presetToday,
    presetFrom6Months,
    presetFrom3Months,
    presetFrom1Month,
  } = params

  const filtersModel = useMemo(() => {
    return {
      typeFilter,
      disciplineFilter,
      availableDisciplines,
      from,
      to,
      activeTimePreset,
      selectedDiscipline,
      effectiveDisplayMode,
      totalDisciplineShots,
      filteredCount,
      withScoreCount,
    }
  }, [
    activeTimePreset,
    availableDisciplines,
    disciplineFilter,
    effectiveDisplayMode,
    filteredCount,
    from,
    selectedDiscipline,
    to,
    totalDisciplineShots,
    typeFilter,
    withScoreCount,
  ])

  const filtersActions = useMemo(() => {
    return {
      typeFilterChange: setTypeFilter,
      disciplineFilterChange: setDisciplineFilter,
      fromChange: setFrom,
      toChange: setTo,
      selectAllTime: () => {
        setFrom("")
        setTo("")
      },
      select6Months: () => {
        setFrom(presetFrom6Months)
        setTo(presetToday)
      },
      select3Months: () => {
        setFrom(presetFrom3Months)
        setTo(presetToday)
      },
      select1Month: () => {
        setFrom(presetFrom1Month)
        setTo(presetToday)
      },
      displayModeChange: setDisplayMode,
    }
  }, [
    presetFrom1Month,
    presetFrom3Months,
    presetFrom6Months,
    presetToday,
    setDisciplineFilter,
    setDisplayMode,
    setFrom,
    setTo,
    setTypeFilter,
  ])

  return { filtersModel, filtersActions }
}
