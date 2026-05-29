import { describe, it, expect } from "vitest"
import { buildOverviewColumns, type OverviewColumn } from "./overviewColumns"

const isSeries = (c: OverviewColumn): c is Extract<OverviewColumn, { kind: "series" }> =>
  c.kind === "series"

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
    expect(cols.filter(isSeries).map((c) => c.position)).toEqual([1, 2, 3, 4, 5, 6])
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

  it("typisch 1 / max 1: eine Serie, dann Gesamt", () => {
    const cols = buildOverviewColumns(1, 1)
    expect(cols.map((c) => c.kind)).toEqual(["series", "typicalTotal"])
    expect(cols.filter(isSeries).map((c) => c.position)).toEqual([1])
  })

  it("max < typisch: trotzdem alle typischen Spalten, keine Extra-/Σ-alle-Spalte", () => {
    // Gültiger Fall: Disziplin typisch 4, aber bisher nur Einheiten mit < 4 Serien.
    // Alle 4 typischen Spalten erscheinen (fehlende Serien später als Strich).
    const cols = buildOverviewColumns(4, 2)
    expect(cols.map((c) => c.kind)).toEqual([
      "series",
      "series",
      "series",
      "series",
      "typicalTotal",
    ])
    expect(cols.filter(isSeries).map((c) => c.position)).toEqual([1, 2, 3, 4])
  })
})
