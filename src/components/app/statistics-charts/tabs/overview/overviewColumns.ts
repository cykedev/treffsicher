import { buildSeriesLabel } from "./overviewFormatting"

export type OverviewColumn =
  | { kind: "series"; position: number; label: { full: string; short: string } }
  | { kind: "typicalTotal"; label: { full: string; short: string } }
  | { kind: "grandTotal"; label: { full: string; short: string } }

/**
 * Gemeinsames Spaltenraster einer Disziplin:
 * S1 … S_typisch | Gesamt | S_(typisch+1) … S_max | Σ alle
 * „Gesamt" sitzt fix nach der typischen Serienzahl; „Σ alle" nur wenn Extra-Serien existieren.
 */
export function buildOverviewColumns(
  typicalSeriesCount: number,
  maxSeriesCount: number
): OverviewColumn[] {
  const columns: OverviewColumn[] = []

  for (let p = 1; p <= typicalSeriesCount; p++) {
    columns.push({ kind: "series", position: p, label: buildSeriesLabel(p) })
  }

  columns.push({ kind: "typicalTotal", label: { full: "Gesamt", short: "Σ" } })

  for (let p = typicalSeriesCount + 1; p <= maxSeriesCount; p++) {
    columns.push({ kind: "series", position: p, label: buildSeriesLabel(p) })
  }

  if (maxSeriesCount > typicalSeriesCount) {
    columns.push({ kind: "grandTotal", label: { full: "Σ alle", short: "Σ alle" } })
  }

  return columns
}
