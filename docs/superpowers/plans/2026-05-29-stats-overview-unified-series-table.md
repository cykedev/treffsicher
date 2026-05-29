# Unified Series-Size Overview Table — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the statistics „Übersicht" tab as one aligned table per discipline with a fixed column grid, instead of one separate sub-table per series size.

**Architecture:** Pure aggregation (`aggregateOverview`) gains a partial typical-range total so sub-typical sessions show a value instead of null, plus a discipline-level `maxSeriesCount`. A new pure `buildOverviewColumns` helper defines the shared column grid (`S1…S_typical | Gesamt | S_(typical+1)…S_max | Σ alle`). The presentation collapses to one `<Table>` per discipline with per-group collapse blocks (header toggle on top, Ø row as footer, accent bar bracket).

**Tech Stack:** Next.js 16 App Router, TypeScript strict, shadcn/ui Table, Tailwind CSS 4, Vitest. Dark-mode only, German UI, English identifiers.

---

## Required Docs

Subagents must read the baseline docs in `.claude`/project conventions before coding, plus:

- `docs/code-conventions.md` — TypeScript/Zod/testing style, file-size & props budget
- `docs/technical-constraints.md` — UI/design rules (shadcn only, dark mode), modularity (<200 lines, ≤6 props)
- `docs/data-model.md` — disciplines, `seriesCount`, scoring types
- `docs/superpowers/specs/2026-05-29-stats-overview-unified-series-table-design.md` — the approved design

## File Structure

- **Modify** `src/lib/stats/overview/aggregateOverview.ts` — replace `typicalTotal`→`typicalRangeTotal` (row) and `typicalTotalAverage`→`typicalRangeTotalAverage` (group, non-null), add discipline-level `maxSeriesCount`.
- **Modify** `src/lib/stats/overview/aggregateOverview.test.ts` — update field names/values, rewrite the null-total test, assert discipline `maxSeriesCount`.
- **Create** `src/components/app/statistics-charts/tabs/overview/overviewColumns.ts` — pure `buildOverviewColumns()` + `OverviewColumn` type.
- **Create** `src/components/app/statistics-charts/tabs/overview/overviewColumns.test.ts` — column-grid tests.
- **Create** `src/components/app/statistics-charts/tabs/overview/overviewCells.tsx` — `ValueCells` shared numeric-cell renderer.
- **Create** `src/components/app/statistics-charts/tabs/overview/SeriesGroupRows.tsx` — presentational rows for one series group (collapsed/expanded, single/multi mode).
- **Rewrite** `src/components/app/statistics-charts/tabs/overview/DisciplineOverviewTable.tsx` — client component: one table, shared header, per-group collapse state.
- **Delete** `src/components/app/statistics-charts/tabs/overview/SeriesGroupTable.tsx` — superseded.
- `overviewFormatting.ts` (`formatScore`, `formatDate`, `buildSeriesLabel`) — unchanged, reused.

Notes for the executor:

- `aggregateOverview` and `buildOverviewColumns` are pure → strict TDD (test first, watch it fail, implement, watch it pass).
- The React components have **no unit-test harness** in this repo (Vitest is used for pure logic only). Do **not** introduce React Testing Library. Verify components via `npx tsc --noEmit`, lint, and the manual visual checkpoint in the final task.
- All commands run through Docker per the project: `docker compose -f docker-compose.dev.yml run --rm app <cmd>`.

---

### Task 1: Aggregation — partial typical-range total + discipline maxSeriesCount

**Files:**

- Modify: `src/lib/stats/overview/aggregateOverview.ts`
- Test: `src/lib/stats/overview/aggregateOverview.test.ts`

- [ ] **Step 1: Update the tests to the new field names and semantics**

In `aggregateOverview.test.ts` apply these exact changes:

- Line ~64: `expect(row.typicalTotal).toBe(355)` → `expect(row.typicalRangeTotal).toBe(355)`
- Lines ~103: `expect(subTypical.typicalTotalAverage).toBeNull()` → `expect(subTypical.typicalRangeTotalAverage).toBe(165)`
- Lines ~109-110:
  ```ts
  expect(typical.rows[0].typicalRangeTotal).toBe(360)
  expect(typical.typicalRangeTotalAverage).toBe(360)
  ```
- Line ~155: `expect(typical.typicalRangeTotalAverage).toBeCloseTo(360) // (356+364)/2`
- Line ~189: `expect(sg4.rows[0].typicalRangeTotal).toBe(360)`
- Line ~195: `expect(sg6.rows[0].typicalRangeTotal).toBe(355) // 88+90+85+92`
- In that same test (`Einheiten mit unterschiedlicher Serienzahl…`), add after the `sg6` assertions:
  ```ts
  expect(group.maxSeriesCount).toBe(6)
  ```

Replace the whole test `it("setzt typicalTotal auf null wenn eine typische Serie fehlt", …)` with:

```ts
it("berechnet typicalRangeTotal als Teilsumme bei fehlender typischer Serie", () => {
  const sessions = [
    makeSession({
      id: "a",
      series: [
        { position: 1, scoreTotal: 88, isPractice: false, shotCount: 10, executionQuality: null },
        // Position 2 fehlt
        { position: 3, scoreTotal: 85, isPractice: false, shotCount: 10, executionQuality: null },
        { position: 4, scoreTotal: 92, isPractice: false, shotCount: 10, executionQuality: null },
      ],
    }),
  ]

  const result = aggregateOverview({ sessions, hiddenDisciplineIds: [], disciplineFilter: "all" })
  const sg = result[0].seriesGroups[0]
  expect(sg.isSubTypical).toBe(true)
  expect(sg.seriesCount).toBe(3)
  const row = sg.rows[0]
  expect(row.seriesScores[1]).toBeNull()
  expect(row.typicalRangeTotal).toBe(265) // 88+85+92, fehlende Serie zählt nicht mit
  expect(row.grandTotal).toBe(265)
})
```

In the practice test (`ignoriert Probe-Serien komplett`), change line ~244:

```ts
expect(row.typicalRangeTotal).toBe(263) // 88+90+85 (Position 2-4 ≤ typisch); Position 5 zählt nicht zur Gesamt-Spalte
```

(keep `expect(row.grandTotal).toBe(355)`).

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `docker compose -f docker-compose.dev.yml run --rm app npx vitest run src/lib/stats/overview/aggregateOverview.test.ts`
Expected: FAIL — properties `typicalRangeTotal` / `typicalRangeTotalAverage` / `maxSeriesCount` do not exist yet.

- [ ] **Step 3: Update the types in `aggregateOverview.ts`**

Replace the three exported types at the top of the file with:

```ts
export type OverviewTableRow = {
  sessionId: string
  date: Date
  // index = position - 1; null wenn an dieser Position keine gewertete Serie vorhanden
  seriesScores: (number | null)[]
  // Summe der vorhandenen Serien mit Position <= typicalSeriesCount (Teilsummen erlaubt, nie null)
  typicalRangeTotal: number
  // Summe aller vorhandenen Wertungsserien
  grandTotal: number
}

export type OverviewSeriesGroup = {
  // Anzahl tatsächlich gewerteter Serien dieser Gruppe (Gruppierschlüssel)
  seriesCount: number
  // true wenn seriesCount < typicalSeriesCount der Disziplin
  isSubTypical: boolean
  // Maximale Spaltenanzahl in dieser Gruppe (>= seriesCount wegen möglicher Positionslücken)
  maxSeriesCount: number
  rows: OverviewTableRow[]
  // Spaltendurchschnitte; null wenn Spalte komplett leer
  seriesAverages: (number | null)[]
  // Mittel der typicalRangeTotal der Zeilen (nie null bei >= 1 Zeile)
  typicalRangeTotalAverage: number
  grandTotalAverage: number
}

export type OverviewTableGroup = {
  disciplineId: string
  disciplineName: string
  scoringType: string
  typicalSeriesCount: number
  // Maximale Serienzahl über alle Gruppen dieser Disziplin (für das gemeinsame Spaltenraster)
  maxSeriesCount: number
  sessionCount: number
  // Aufsteigend nach seriesCount sortiert
  seriesGroups: OverviewSeriesGroup[]
}
```

- [ ] **Step 4: Update the row computation (first loop)**

Find the block that computes `typicalTotal` (the `typicalSlots` / `typicalTotal` lines) and replace it with:

```ts
const typicalRangeTotal = seriesScores
  .slice(0, typicalCount)
  .reduce((sum: number, v) => sum + (v ?? 0), 0)
```

Update the row push to use the new field:

```ts
bucket.pendingRows.push({
  row: {
    sessionId: session.id,
    date: session.date,
    seriesScores,
    typicalRangeTotal,
    grandTotal,
  },
  scoredCount: scored.length,
})
```

- [ ] **Step 5: Update the group + discipline aggregation (second loop)**

Replace the `typicalTotals` / `typicalTotalAverage` computation with:

```ts
const typicalRangeTotalAverage = rows.reduce((s, r) => s + r.typicalRangeTotal, 0) / rows.length
```

Update the `seriesGroups.push({ … })` object to use `typicalRangeTotalAverage` in place of `typicalTotalAverage` (keep the other fields).

After `seriesGroups.sort((a, b) => a.seriesCount - b.seriesCount)`, add:

```ts
const maxSeriesCount = seriesGroups.reduce((m, g) => Math.max(m, g.maxSeriesCount), 0)
```

Add `maxSeriesCount` to the `result.push({ … })` object (between `typicalSeriesCount` and `sessionCount`).

- [ ] **Step 6: Run the tests and confirm they pass**

Run: `docker compose -f docker-compose.dev.yml run --rm app npx vitest run src/lib/stats/overview/aggregateOverview.test.ts`
Expected: PASS (all tests green).

- [ ] **Step 7: Commit**

```bash
git add src/lib/stats/overview/aggregateOverview.ts src/lib/stats/overview/aggregateOverview.test.ts
git commit -m "feat(stats): partial typical-range total + discipline maxSeriesCount in overview model"
```

---

### Task 2: Column-grid helper `buildOverviewColumns`

**Files:**

- Create: `src/components/app/statistics-charts/tabs/overview/overviewColumns.ts`
- Test: `src/components/app/statistics-charts/tabs/overview/overviewColumns.test.ts`

- [ ] **Step 1: Write the failing test**

Create `overviewColumns.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { buildOverviewColumns } from "./overviewColumns"

describe("buildOverviewColumns", () => {
  it("typisch 4 / max 6: führende Serien, Gesamt, Extra-Serien, Σ alle", () => {
    const cols = buildOverviewColumns(4, 6)
    expect(cols.map((c) => c.kind)).toEqual([
      "series",
      "series",
      "series",
      "series",
      "typicalTotal",
      "series",
      "series",
      "grandTotal",
    ])
    expect(
      cols.filter((c) => c.kind === "series").map((c) => (c as { position: number }).position)
    ).toEqual([1, 2, 3, 4, 5, 6])
    expect(cols[4].label.full).toBe("Gesamt")
    expect(cols[7].label.full).toBe("Σ alle")
  })

  it("typisch 3 / max 3: keine Extra-Serien und keine Σ-alle-Spalte", () => {
    const cols = buildOverviewColumns(3, 3)
    expect(cols.map((c) => c.kind)).toEqual(["series", "series", "series", "typicalTotal"])
  })

  it("typisch 4 / max 4: Gesamt am Ende, keine Σ-alle-Spalte", () => {
    const cols = buildOverviewColumns(4, 4)
    expect(cols.map((c) => c.kind)).toEqual([
      "series",
      "series",
      "series",
      "series",
      "typicalTotal",
    ])
  })
})
```

- [ ] **Step 2: Run the test and confirm it fails**

Run: `docker compose -f docker-compose.dev.yml run --rm app npx vitest run src/components/app/statistics-charts/tabs/overview/overviewColumns.test.ts`
Expected: FAIL — module `./overviewColumns` not found.

- [ ] **Step 3: Implement `overviewColumns.ts`**

```ts
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
```

- [ ] **Step 4: Run the test and confirm it passes**

Run: `docker compose -f docker-compose.dev.yml run --rm app npx vitest run src/components/app/statistics-charts/tabs/overview/overviewColumns.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/app/statistics-charts/tabs/overview/overviewColumns.ts src/components/app/statistics-charts/tabs/overview/overviewColumns.test.ts
git commit -m "feat(stats): shared column-grid helper for overview table"
```

---

### Task 3: Shared numeric-cell renderer `ValueCells`

**Files:**

- Create: `src/components/app/statistics-charts/tabs/overview/overviewCells.tsx`

No unit test (presentational). Verified via tsc in Task 5.

- [ ] **Step 1: Implement `overviewCells.tsx`**

```tsx
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
```

- [ ] **Step 2: Type-check the new file**

Run: `docker compose -f docker-compose.dev.yml run --rm app npx tsc --noEmit`
Expected: no errors (note: `SeriesGroupTable.tsx` may still reference old fields until Task 4 — if so, this check fully passes only after Task 4; it is acceptable for tsc to still flag `SeriesGroupTable.tsx` here, but `overviewCells.tsx` itself must be error-free).

- [ ] **Step 3: Commit**

```bash
git add src/components/app/statistics-charts/tabs/overview/overviewCells.tsx
git commit -m "feat(stats): shared ValueCells renderer for overview rows"
```

---

### Task 4: Series-group rows + table rewrite, remove old sub-table

**Files:**

- Create: `src/components/app/statistics-charts/tabs/overview/SeriesGroupRows.tsx`
- Rewrite: `src/components/app/statistics-charts/tabs/overview/DisciplineOverviewTable.tsx`
- Delete: `src/components/app/statistics-charts/tabs/overview/SeriesGroupTable.tsx`

- [ ] **Step 1: Implement `SeriesGroupRows.tsx`**

```tsx
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
```

- [ ] **Step 2: Rewrite `DisciplineOverviewTable.tsx`**

```tsx
"use client"

import { ChevronDown, ChevronRight } from "lucide-react"
import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { OverviewTableGroup } from "@/lib/stats/overview/aggregateOverview"
import { buildOverviewColumns, type OverviewColumn } from "./overviewColumns"
import { SeriesGroupRows } from "./SeriesGroupRows"

interface Props {
  group: OverviewTableGroup
}

export function DisciplineOverviewTable({ group }: Props) {
  const {
    disciplineName,
    scoringType,
    typicalSeriesCount,
    maxSeriesCount,
    sessionCount,
    seriesGroups,
  } = group
  const columns = buildOverviewColumns(typicalSeriesCount, maxSeriesCount)
  const singleGroup = seriesGroups.length === 1

  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const toggle = (seriesCount: number) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(seriesCount)) next.delete(seriesCount)
      else next.add(seriesCount)
      return next
    })

  const singleKey = seriesGroups[0]?.seriesCount
  const singleOpen = singleGroup && singleKey !== undefined && expanded.has(singleKey)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-baseline gap-2">
          {disciplineName}
          <span className="text-base font-normal text-muted-foreground">
            {sessionCount} {sessionCount === 1 ? "Einheit" : "Einheiten"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 pb-2">
        <div className="overflow-x-auto px-6 pb-4">
          <Table className="min-w-full text-sm">
            <TableHeader>
              <TableRow>
                <TableHead className="sticky left-0 bg-card px-0 py-0 sm:px-0">
                  {singleGroup ? (
                    <button
                      type="button"
                      aria-expanded={singleOpen}
                      aria-label={singleOpen ? "Einheiten ausblenden" : "Einheiten anzeigen"}
                      onClick={() => singleKey !== undefined && toggle(singleKey)}
                      className="flex w-full items-center gap-1 px-2 py-2 text-left font-medium hover:text-foreground/80 sm:px-3"
                    >
                      {singleOpen ? (
                        <ChevronDown className="size-4 shrink-0" aria-hidden />
                      ) : (
                        <ChevronRight className="size-4 shrink-0" aria-hidden />
                      )}
                      Einheiten
                    </button>
                  ) : (
                    <span className="block px-2 py-2 font-medium sm:px-3">Einheiten</span>
                  )}
                </TableHead>
                {columns.map((col, i) => (
                  <HeadCell key={i} column={col} />
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {seriesGroups.map((sg) => (
                <SeriesGroupRows
                  key={sg.seriesCount}
                  group={sg}
                  columns={columns}
                  typicalSeriesCount={typicalSeriesCount}
                  scoringType={scoringType}
                  expanded={expanded.has(sg.seriesCount)}
                  onToggle={() => toggle(sg.seriesCount)}
                  showGroupHeader={!singleGroup}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function HeadCell({ column }: { column: OverviewColumn }) {
  const isTotal = column.kind !== "series"
  return (
    <TableHead
      className={`px-2 py-2 text-right sm:px-3 ${isTotal ? "bg-secondary/30 font-semibold" : ""}`}
    >
      <span className="hidden sm:inline">{column.label.full}</span>
      <span className="sm:hidden">{column.label.short}</span>
    </TableHead>
  )
}
```

- [ ] **Step 3: Delete the superseded sub-table component**

```bash
git rm src/components/app/statistics-charts/tabs/overview/SeriesGroupTable.tsx
```

- [ ] **Step 4: Type-check and lint**

Run: `docker compose -f docker-compose.dev.yml run --rm app npx tsc --noEmit`
Expected: no errors.
Run: `docker compose -f docker-compose.dev.yml run --rm app npm run lint`
Expected: no errors (no remaining import of `SeriesGroupTable`).

- [ ] **Step 5: Commit**

```bash
git add src/components/app/statistics-charts/tabs/overview/
git commit -m "feat(stats): single aligned overview table with per-group collapse"
```

---

### Task 5: Full quality gate, visual verification & doc sync

**Files:**

- Possibly modify: `docs/data-model.md` or `docs/requirements.md` if they describe the overview table layout.

- [ ] **Step 1: Run the full quality gate**

```bash
docker compose -f docker-compose.dev.yml run --rm app npm run lint
docker compose -f docker-compose.dev.yml run --rm app npm run format:check
docker compose -f docker-compose.dev.yml run --rm app npm run test
docker compose -f docker-compose.dev.yml run --rm app npx tsc --noEmit
```

Expected: all green. If `format:check` fails, run `docker compose -f docker-compose.dev.yml run --rm app npm run format` and re-check.

- [ ] **Step 2: Visual verification in the running app**

Start the dev environment (`docker compose -f docker-compose.dev.yml up --watch`), log in (`admin@example.com` / `admin-passwort-12`), open Statistiken → Übersicht and confirm against the approved design:

- One table per discipline, single column header, `Einheiten` as first column.
- `Gesamt` sits directly after the typical series count; `Σ alle` only when extra series exist.
- A discipline with mixed series sizes shows per-group collapse rows; expanding one group reveals its sessions with the Ø row as footer and the left accent bar; other groups stay collapsed.
- A discipline with a single series size shows the toggle on the `Einheiten` header (no group label row).
- Sub-typical group shows a smaller `Gesamt` at the consistent column position with `–` for the missing series.
- Numbers add up (e.g. `Σ alle` = `Gesamt` + extra series).

Capture a screenshot for the summary.

- [ ] **Step 3: Doc sync**

Check `docs/data-model.md` and `docs/requirements.md` for any description of the Übersicht table grouping/columns. If present and now stale, update to describe the unified grid (Gesamt after typical count, Σ alle at the end, per-group collapse). If nothing references it, skip.

- [ ] **Step 4: Commit doc updates (if any)**

```bash
git add docs/
git commit -m "docs(stats): describe unified overview table layout"
```

---

## Verification Summary

- Pure logic (`aggregateOverview`, `buildOverviewColumns`) covered by Vitest with new/updated cases.
- Components covered by `tsc --noEmit` + lint + manual visual checkpoint (no React test harness in this repo).
- Field rename is internal: only `aggregateOverview` and the rewritten overview components reference `typicalRangeTotal`/`typicalRangeTotalAverage`; the `OverviewTableGroup` type flows unchanged through `tabs/types.ts` and `hooks/ui-models/types.ts`.
