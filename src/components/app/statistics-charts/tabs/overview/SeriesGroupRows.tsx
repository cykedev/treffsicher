import { ChevronDown, ChevronRight } from "lucide-react"
import { TableCell, TableRow } from "@/components/ui/table"
import type { OverviewSeriesGroup } from "@/lib/stats/overview/aggregateOverview"
import { ValueCells, type CellValueGetter } from "./overviewCells"
import type { OverviewColumn } from "./overviewColumns"
import { formatDate } from "./overviewFormatting"

interface Props {
  group: OverviewSeriesGroup
  columns: OverviewColumn[]
  typicalSeriesCount: number
  scoringType: string
  expanded: boolean
  onToggle: () => void
  // false → Einzelgruppe: keine Gruppen-Kopfzeile, Toggle sitzt im Tabellenkopf
  showGroupHeader: boolean
}

const ACCENT = "border-l-2 border-l-muted-foreground/40"

export function SeriesGroupRows({
  group,
  columns,
  typicalSeriesCount,
  scoringType,
  expanded,
  onToggle,
  showGroupHeader,
}: Props) {
  const hasExtra = group.maxSeriesCount > typicalSeriesCount
  const label = `${group.seriesCount}er Serien`

  const avgGetter: CellValueGetter = (col) => {
    if (col.kind === "series") return group.seriesAverages[col.position - 1] ?? null
    if (col.kind === "typicalTotal") return group.typicalRangeTotalAverage
    return hasExtra ? group.grandTotalAverage : null
  }

  // Einzelgruppe: nur Detailzeilen (wenn aufgeklappt) + Ø-Footer, kein Gruppen-Label/-Akzent
  if (!showGroupHeader) {
    return (
      <>
        {expanded &&
          group.rows.map((row) => (
            <DetailRow
              key={row.sessionId}
              row={row}
              columns={columns}
              scoringType={scoringType}
              hasExtra={hasExtra}
              accent={false}
            />
          ))}
        <AvgRow columns={columns} scoringType={scoringType} getValue={avgGetter} accent={false} />
      </>
    )
  }

  // Mehrere Gruppen, zugeklappt: eine Zeile mit Label + Ø (hinten) + Werten
  if (!expanded) {
    return (
      <TableRow>
        <TableCell className="sticky left-0 bg-card px-0 py-0 sm:px-0">
          <button
            type="button"
            aria-expanded={false}
            aria-label={`${label} anzeigen`}
            onClick={onToggle}
            className="flex w-full items-center gap-1 px-2 py-1.5 text-left font-semibold hover:text-foreground/80 sm:px-3 sm:py-2"
          >
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            {label}
            <span className="ml-1 font-normal text-muted-foreground">Ø</span>
          </button>
        </TableCell>
        <ValueCells columns={columns} scoringType={scoringType} getValue={avgGetter} />
      </TableRow>
    )
  }

  // Mehrere Gruppen, aufgeklappt: Kopf + Detailzeilen + Ø-Abschluss, geklammert durch Akzent links
  return (
    <>
      <TableRow>
        <TableCell className={`sticky left-0 bg-card px-0 py-0 sm:px-0 ${ACCENT}`}>
          <button
            type="button"
            aria-expanded={true}
            aria-label={`${label} ausblenden`}
            onClick={onToggle}
            className="flex w-full items-center gap-1 px-2 py-2 text-left font-semibold hover:text-foreground/80 sm:px-3"
          >
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            {label}
          </button>
        </TableCell>
        {columns.map((_, i) => (
          <TableCell key={i} className="px-2 py-2 sm:px-3" />
        ))}
      </TableRow>

      {group.rows.map((row) => (
        <DetailRow
          key={row.sessionId}
          row={row}
          columns={columns}
          scoringType={scoringType}
          hasExtra={hasExtra}
          accent
        />
      ))}

      <AvgRow columns={columns} scoringType={scoringType} getValue={avgGetter} accent />
    </>
  )
}

function DetailRow({
  row,
  columns,
  scoringType,
  hasExtra,
  accent,
}: {
  row: OverviewSeriesGroup["rows"][number]
  columns: OverviewColumn[]
  scoringType: string
  hasExtra: boolean
  accent: boolean
}) {
  const date = formatDate(row.date)
  const getValue: CellValueGetter = (col) => {
    if (col.kind === "series") return row.seriesScores[col.position - 1] ?? null
    if (col.kind === "typicalTotal") return row.typicalRangeTotal
    return hasExtra ? row.grandTotal : null
  }
  return (
    <TableRow>
      <TableCell
        className={`sticky left-0 bg-card px-2 py-1.5 font-medium sm:px-3 sm:py-2 ${accent ? `pl-8 sm:pl-9 ${ACCENT}` : ""}`}
      >
        <span className="hidden sm:inline">{date.full}</span>
        <span className="sm:hidden">{date.short}</span>
      </TableCell>
      <ValueCells columns={columns} scoringType={scoringType} getValue={getValue} />
    </TableRow>
  )
}

function AvgRow({
  columns,
  scoringType,
  getValue,
  accent,
}: {
  columns: OverviewColumn[]
  scoringType: string
  getValue: CellValueGetter
  accent: boolean
}) {
  return (
    <TableRow>
      <TableCell
        className={`sticky left-0 bg-card px-2 py-1.5 font-semibold text-muted-foreground sm:px-3 sm:py-2 ${accent ? `pl-8 sm:pl-9 ${ACCENT}` : ""}`}
      >
        Ø
      </TableCell>
      <ValueCells columns={columns} scoringType={scoringType} getValue={getValue} />
    </TableRow>
  )
}
