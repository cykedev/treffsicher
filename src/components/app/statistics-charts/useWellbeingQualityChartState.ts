import { useMemo } from "react"
import type { DisplayMode } from "@/components/app/statistics-charts/types"
import { computeDisplayValue, computeStableAxis } from "@/components/app/statistics-charts/utils"
import type {
  DisciplineForStats,
  QualityVsScorePoint,
  WellbeingCorrelationPoint,
} from "@/lib/stats/actions"

interface Params {
  filteredWellbeing: WellbeingCorrelationPoint[]
  filteredQuality: QualityVsScorePoint[]
  effectiveDisplayMode: DisplayMode
  selectedDiscipline: DisciplineForStats | null
  totalDisciplineShots: number | null
}

export function useWellbeingQualityChartState({
  filteredWellbeing,
  filteredQuality,
  effectiveDisplayMode,
  selectedDiscipline,
  totalDisciplineShots,
}: Params) {
  const wellbeingDisplayData = useMemo(() => {
    return filteredWellbeing.map((point) => ({
      ...point,
      displayScore:
        effectiveDisplayMode === "projected" && selectedDiscipline
          ? computeDisplayValue(point.avgPerShot, "projected", selectedDiscipline)
          : point.avgPerShot,
    }))
  }, [effectiveDisplayMode, filteredWellbeing, selectedDiscipline])

  const qualityDisplayData = useMemo(() => {
    return filteredQuality.map((point) => ({
      ...point,
      displayScore:
        effectiveDisplayMode === "projected" && selectedDiscipline
          ? selectedDiscipline.scoringType === "TENTH"
            ? Math.round(point.scorePerShot * selectedDiscipline.shotsPerSeries * 10) / 10
            : Math.round(point.scorePerShot * selectedDiscipline.shotsPerSeries)
          : point.scorePerShot,
    }))
  }, [effectiveDisplayMode, filteredQuality, selectedDiscipline])

  const wellbeingYAxis = useMemo<{ domain: [number, number]; ticks: number[] }>(() => {
    const values = wellbeingDisplayData
      .map((point) => point.displayScore)
      .filter((value): value is number => Number.isFinite(value))
    return computeStableAxis(values)
  }, [wellbeingDisplayData])

  const qualityYAxis = useMemo<{ domain: [number, number]; ticks: number[] }>(() => {
    const values = qualityDisplayData
      .map((point) => point.displayScore)
      .filter((value): value is number => Number.isFinite(value))
    return computeStableAxis(values)
  }, [qualityDisplayData])

  const wellbeingScoreLabel =
    effectiveDisplayMode === "projected" && selectedDiscipline
      ? `Ringe (${totalDisciplineShots} Sch.)`
      : "Ringe/Sch."

  const qualityScoreLabel =
    effectiveDisplayMode === "projected" && selectedDiscipline
      ? `Ringe/Serie (${selectedDiscipline.shotsPerSeries} Sch.)`
      : "Ringe/Sch."

  return {
    wellbeingDisplayData,
    qualityDisplayData,
    wellbeingYAxis,
    qualityYAxis,
    wellbeingScoreLabel,
    qualityScoreLabel,
  }
}
