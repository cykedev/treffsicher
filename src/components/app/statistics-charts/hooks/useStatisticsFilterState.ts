import { useMemo, useState } from "react"
import type { DisplayMode } from "@/components/app/statistics-charts/types"
import { monthsAgo, parseDateInput, today } from "@/components/app/statistics-charts/utils"
import type { DisciplineForStats } from "@/lib/stats/actions"

export type TypeFilter = "all" | "TRAINING" | "WETTKAMPF"

interface Params {
  availableDisciplines: DisciplineForStats[]
}

export function useStatisticsFilterState({ availableDisciplines }: Params) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [from, setFrom] = useState<string>(() => monthsAgo(3))
  const [to, setTo] = useState<string>(() => today())
  const [disciplineFilter, setDisciplineFilter] = useState<string>("all")
  const [displayMode, setDisplayMode] = useState<DisplayMode>("per_shot")

  const selectedDiscipline = useMemo(
    () => availableDisciplines.find((discipline) => discipline.id === disciplineFilter) ?? null,
    [availableDisciplines, disciplineFilter]
  )

  const effectiveDisplayMode: DisplayMode =
    disciplineFilter === "all" || !selectedDiscipline ? "per_shot" : displayMode

  const fromDate = useMemo(() => (from ? parseDateInput(from, false) : null), [from])
  const toDate = useMemo(() => (to ? parseDateInput(to, true) : null), [to])

  const presetToday = today()
  const presetFrom6Months = monthsAgo(6)
  const presetFrom3Months = monthsAgo(3)
  const presetFrom1Month = monthsAgo(1)

  const activeTimePreset = useMemo(() => {
    if (!from && !to) return "all" as const
    if (to === presetToday && from === presetFrom6Months) return "6m" as const
    if (to === presetToday && from === presetFrom3Months) return "3m" as const
    if (to === presetToday && from === presetFrom1Month) return "1m" as const
    return "custom" as const
  }, [from, to, presetToday, presetFrom6Months, presetFrom3Months, presetFrom1Month])

  return {
    typeFilter,
    setTypeFilter,
    from,
    setFrom,
    to,
    setTo,
    disciplineFilter,
    setDisciplineFilter,
    displayMode,
    setDisplayMode,
    selectedDiscipline,
    effectiveDisplayMode,
    fromDate,
    toDate,
    presetToday,
    presetFrom6Months,
    presetFrom3Months,
    presetFrom1Month,
    activeTimePreset,
  }
}
