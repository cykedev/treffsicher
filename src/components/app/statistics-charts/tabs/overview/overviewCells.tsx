import { TableCell } from "@/components/ui/table"
import type { OverviewColumn } from "./overviewColumns"
import { formatScore } from "./overviewFormatting"

export type CellValueGetter = (column: OverviewColumn) => number | null

const BASE = "px-2 py-1.5 text-right font-mono tabular-nums sm:px-3 sm:py-2"

/**
 * Rendert die Zahlenspalten einer Zeile anhand des Spaltenrasters.
 * - fehlender Wert (null) → dezenter Strich, keine Hervorhebung
 * - Summenspalten mit Wert → bg-secondary/30 + fett
 */
export function ValueCells({
  columns,
  scoringType,
  getValue,
}: {
  columns: OverviewColumn[]
  scoringType: string
  getValue: CellValueGetter
}) {
  return (
    <>
      {columns.map((col, i) => {
        const value = getValue(col)
        if (value === null) {
          return (
            <TableCell key={i} className={`${BASE} text-muted-foreground/40`}>
              –
            </TableCell>
          )
        }
        const isTotal = col.kind !== "series"
        return (
          <TableCell
            key={i}
            className={`${BASE} ${isTotal ? "bg-secondary/30 font-semibold" : ""}`}
          >
            {formatScore(value, scoringType)}
          </TableCell>
        )
      })}
    </>
  )
}
