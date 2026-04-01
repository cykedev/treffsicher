import type { DisciplineForStats } from "@/lib/stats/actions"
import type { DisplayMode } from "@/components/app/statistics-charts/types"

export function computeDisplayValue(
  avgPerShot: number,
  mode: DisplayMode,
  discipline: DisciplineForStats | null
): number {
  if (mode === "projected" && discipline) {
    const total = avgPerShot * discipline.shotsPerSeries * discipline.seriesCount
    return discipline.scoringType === "TENTH" ? Math.round(total * 10) / 10 : Math.round(total)
  }
  return avgPerShot
}

export function formatDisplayScore(
  value: number,
  mode: DisplayMode,
  discipline: DisciplineForStats | null
): string {
  if (mode === "projected" && discipline) {
    if (discipline.scoringType === "TENTH") return value.toFixed(1)
    // Ganzzahlige Werte (echte Ergebnisse) ohne Nachkommastellen, Gleitkommazahlen (z.B. Trend) auf 2 Stellen
    return Number.isInteger(value) ? String(value) : value.toFixed(2)
  }
  return value.toFixed(2)
}
