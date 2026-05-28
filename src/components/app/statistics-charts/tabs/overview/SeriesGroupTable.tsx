"use client"

import { ChevronDown, ChevronRight } from "lucide-react"
import { useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { OverviewSeriesGroup, OverviewTableRow } from "@/lib/stats/overview/aggregateOverview"
import { buildSeriesLabel, formatDate, formatScore } from "./overviewFormatting"

interface Props {
  group: OverviewSeriesGroup
  typicalSeriesCount: number
  scoringType: string
}

export function SeriesGroupTable({ group, typicalSeriesCount, scoringType }: Props) {
  const {
    isSubTypical,
    maxSeriesCount,
    rows,
    seriesAverages,
    typicalTotalAverage,
    grandTotalAverage,
  } = group
  const [expanded, setExpanded] = useState(false)

  // Sub-typische Gruppen zeigen alle ihre Spalten + Gesamt (= grandTotal).
  // Typische Gruppen zeigen typicalSeriesCount Spalten + Gesamt (= typicalTotal)
  // und ggf. Extra-Serien + Gesamt (alle).
  const columnCount = isSubTypical ? maxSeriesCount : typicalSeriesCount
  const hasExtraSeries = !isSubTypical && maxSeriesCount > typicalSeriesCount
  const extraCount = hasExtraSeries ? maxSeriesCount - typicalSeriesCount : 0
  const mainTotalAvg: number | null = isSubTypical ? grandTotalAverage : typicalTotalAverage

  return (
    <div className="overflow-x-auto px-6 pb-4">
      <Table className="min-w-full text-sm">
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 bg-card px-0 py-0 sm:px-0">
              <button
                type="button"
                aria-expanded={expanded}
                aria-label={expanded ? "Einheiten ausblenden" : "Einheiten anzeigen"}
                onClick={() => setExpanded((v) => !v)}
                className="flex w-full items-center gap-1 px-2 py-2 text-left font-medium hover:text-foreground/80 sm:px-3"
              >
                {expanded ? (
                  <ChevronDown className="size-4 shrink-0" aria-hidden />
                ) : (
                  <ChevronRight className="size-4 shrink-0" aria-hidden />
                )}
                Datum
              </button>
            </TableHead>
            {Array.from({ length: columnCount }, (_, i) => (
              <NumHead key={i + 1} label={buildSeriesLabel(i + 1)} />
            ))}
            <TotalHead label={{ full: "Gesamt", short: "Σ" }} />
            {hasExtraSeries &&
              Array.from({ length: extraCount }, (_, i) => (
                <NumHead key={columnCount + i + 1} label={buildSeriesLabel(columnCount + i + 1)} />
              ))}
            {hasExtraSeries && <TotalHead label={{ full: "Gesamt (alle)", short: "Σ alle" }} />}
          </TableRow>
        </TableHeader>
        {expanded && (
          <TableBody>
            {rows.map((row) => (
              <DataRow
                key={row.sessionId}
                row={row}
                scoringType={scoringType}
                columnCount={columnCount}
                isSubTypical={isSubTypical}
                hasExtraSeries={hasExtraSeries}
                extraCount={extraCount}
              />
            ))}
          </TableBody>
        )}
        <TableFooter>
          <TableRow>
            <TableCell className="sticky left-0 bg-muted/50 px-2 py-1.5 font-semibold sm:px-3 sm:py-2">
              Ø
            </TableCell>
            {Array.from({ length: columnCount }, (_, i) => (
              <AvgCell key={i} value={seriesAverages[i]} scoringType={scoringType} />
            ))}
            <AvgCell value={mainTotalAvg} scoringType={scoringType} highlight />
            {hasExtraSeries &&
              Array.from({ length: extraCount }, (_, i) => (
                <AvgCell
                  key={columnCount + i}
                  value={seriesAverages[columnCount + i]}
                  scoringType={scoringType}
                />
              ))}
            {hasExtraSeries && (
              <AvgCell value={grandTotalAverage} scoringType={scoringType} highlight />
            )}
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  )
}

function NumHead({ label }: { label: { full: string; short: string } }) {
  return (
    <TableHead className="px-2 py-2 text-right sm:px-3">
      <span className="hidden sm:inline">{label.full}</span>
      <span className="sm:hidden">{label.short}</span>
    </TableHead>
  )
}

function TotalHead({ label }: { label: { full: string; short: string } }) {
  return (
    <TableHead className="bg-secondary/30 px-2 py-2 text-right font-semibold sm:px-3">
      <span className="hidden sm:inline">{label.full}</span>
      <span className="sm:hidden">{label.short}</span>
    </TableHead>
  )
}

interface DataRowProps {
  row: OverviewTableRow
  scoringType: string
  columnCount: number
  isSubTypical: boolean
  hasExtraSeries: boolean
  extraCount: number
}

function DataRow({
  row,
  scoringType,
  columnCount,
  isSubTypical,
  hasExtraSeries,
  extraCount,
}: DataRowProps) {
  const date = formatDate(row.date)
  const mainTotal: number | null = isSubTypical ? row.grandTotal : row.typicalTotal

  return (
    <TableRow>
      <TableCell className="sticky left-0 bg-card px-2 py-1.5 font-medium sm:px-3 sm:py-2">
        <span className="hidden sm:inline">{date.full}</span>
        <span className="sm:hidden">{date.short}</span>
      </TableCell>
      {Array.from({ length: columnCount }, (_, i) => (
        <ScoreCell key={i} value={row.seriesScores[i] ?? null} scoringType={scoringType} />
      ))}
      <TotalCell value={mainTotal} scoringType={scoringType} />
      {hasExtraSeries &&
        Array.from({ length: extraCount }, (_, i) => (
          <ScoreCell
            key={columnCount + i}
            value={row.seriesScores[columnCount + i] ?? null}
            scoringType={scoringType}
          />
        ))}
      {hasExtraSeries && <TotalCell value={row.grandTotal} scoringType={scoringType} />}
    </TableRow>
  )
}

function ScoreCell({ value, scoringType }: { value: number | null; scoringType: string }) {
  return (
    <TableCell className="px-2 py-1.5 text-right font-mono tabular-nums sm:px-3 sm:py-2">
      {value !== null ? formatScore(value, scoringType) : ""}
    </TableCell>
  )
}

function TotalCell({ value, scoringType }: { value: number | null; scoringType: string }) {
  return (
    <TableCell className="bg-secondary/30 px-2 py-1.5 text-right font-mono font-semibold tabular-nums sm:px-3 sm:py-2">
      {value !== null ? formatScore(value, scoringType) : ""}
    </TableCell>
  )
}

function AvgCell({
  value,
  scoringType,
  highlight,
}: {
  value: number | null
  scoringType: string
  highlight?: boolean
}) {
  return (
    <TableCell
      className={`px-2 py-1.5 text-right font-mono tabular-nums sm:px-3 sm:py-2 ${highlight ? "bg-secondary/30 font-semibold" : ""}`}
    >
      {value !== null ? formatScore(value, scoringType) : ""}
    </TableCell>
  )
}
