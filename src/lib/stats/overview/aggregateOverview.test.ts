import { describe, it, expect } from "vitest"
import { aggregateOverview } from "./aggregateOverview"
import type { StatsSession } from "@/lib/stats/actions"

function makeSession(overrides: Partial<StatsSession> & { id: string }): StatsSession {
  return {
    id: overrides.id,
    date: overrides.date ?? new Date("2026-01-15"),
    type: overrides.type ?? "TRAINING",
    disciplineId: overrides.disciplineId ?? "lp",
    discipline: overrides.discipline ?? {
      id: "lp",
      name: "Luftpistole",
      seriesCount: 4,
      shotsPerSeries: 10,
      scoringType: "WHOLE",
    },
    hitLocationHorizontalMm: null,
    hitLocationHorizontalDirection: null,
    hitLocationVerticalMm: null,
    hitLocationVerticalDirection: null,
    totalScore: overrides.totalScore ?? 360,
    avgPerShot: overrides.avgPerShot ?? 9,
    totalNonPracticeShots: overrides.totalNonPracticeShots ?? 40,
    series: overrides.series ?? [
      { position: 1, scoreTotal: 90, isPractice: false, shotCount: 10, executionQuality: null },
      { position: 2, scoreTotal: 90, isPractice: false, shotCount: 10, executionQuality: null },
      { position: 3, scoreTotal: 90, isPractice: false, shotCount: 10, executionQuality: null },
      { position: 4, scoreTotal: 90, isPractice: false, shotCount: 10, executionQuality: null },
    ],
  }
}

describe("aggregateOverview", () => {
  it("baut eine Zeile pro Einheit mit korrekten Serienwerten", () => {
    const sessions = [
      makeSession({
        id: "a",
        series: [
          { position: 1, scoreTotal: 88, isPractice: false, shotCount: 10, executionQuality: null },
          { position: 2, scoreTotal: 90, isPractice: false, shotCount: 10, executionQuality: null },
          { position: 3, scoreTotal: 85, isPractice: false, shotCount: 10, executionQuality: null },
          { position: 4, scoreTotal: 92, isPractice: false, shotCount: 10, executionQuality: null },
        ],
      }),
    ]

    const result = aggregateOverview({ sessions, hiddenDisciplineIds: [], disciplineFilter: "all" })

    expect(result).toHaveLength(1)
    const group = result[0]
    expect(group.disciplineName).toBe("Luftpistole")
    expect(group.typicalSeriesCount).toBe(4)
    expect(group.sessionCount).toBe(1)
    expect(group.allSeriesAverage).toBeCloseTo(88.75) // 355 / 4 Serien
    expect(group.seriesGroups).toHaveLength(1)

    const sg = group.seriesGroups[0]
    expect(sg.seriesCount).toBe(4)
    expect(sg.isSubTypical).toBe(false)
    expect(sg.rows).toHaveLength(1)

    const row = sg.rows[0]
    expect(row.seriesScores).toEqual([88, 90, 85, 92])
    expect(row.typicalRangeTotal).toBe(355)
    expect(row.grandTotal).toBe(355)
  })

  it("sortiert Zeilen aufsteigend nach Datum (neueste zuletzt)", () => {
    const sessions = [
      makeSession({ id: "b", date: new Date("2026-03-01") }),
      makeSession({ id: "a", date: new Date("2026-01-01") }),
      makeSession({ id: "c", date: new Date("2026-02-01") }),
    ]

    const result = aggregateOverview({ sessions, hiddenDisciplineIds: [], disciplineFilter: "all" })
    const dates = result[0].seriesGroups[0].rows.map((r) => r.date.toISOString().slice(0, 10))
    expect(dates).toEqual(["2026-01-01", "2026-02-01", "2026-03-01"])
  })

  it("trennt Einheiten mit 2 Serien von Einheiten mit 4 Serien in eigene Gruppen", () => {
    const sessions = [
      makeSession({ id: "a", date: new Date("2026-01-01") }),
      makeSession({
        id: "b",
        date: new Date("2026-02-01"),
        totalNonPracticeShots: 20,
        series: [
          { position: 1, scoreTotal: 80, isPractice: false, shotCount: 10, executionQuality: null },
          { position: 2, scoreTotal: 85, isPractice: false, shotCount: 10, executionQuality: null },
        ],
      }),
    ]

    const result = aggregateOverview({ sessions, hiddenDisciplineIds: [], disciplineFilter: "all" })
    const group = result[0]
    expect(group.sessionCount).toBe(2)
    expect(group.seriesGroups).toHaveLength(2)

    const subTypical = group.seriesGroups.find((g) => g.isSubTypical)!
    expect(subTypical.seriesCount).toBe(2)
    expect(subTypical.rows).toHaveLength(1)
    expect(subTypical.rows[0].grandTotal).toBe(165)
    expect(subTypical.typicalRangeTotalAverage).toBe(165)
    expect(subTypical.grandTotalAverage).toBe(165)

    const typical = group.seriesGroups.find((g) => !g.isSubTypical)!
    expect(typical.seriesCount).toBe(4)
    expect(typical.rows).toHaveLength(1)
    expect(typical.rows[0].typicalRangeTotal).toBe(360)
    expect(typical.typicalRangeTotalAverage).toBe(360)
  })

  it("Durchschnitte der typischen Gruppe sind nicht von sub-typischen Einheiten beeinflusst", () => {
    const sessions = [
      // Typische Einheiten (4 Serien)
      makeSession({
        id: "a",
        date: new Date("2026-01-01"),
        series: [
          { position: 1, scoreTotal: 90, isPractice: false, shotCount: 10, executionQuality: null },
          { position: 2, scoreTotal: 88, isPractice: false, shotCount: 10, executionQuality: null },
          { position: 3, scoreTotal: 92, isPractice: false, shotCount: 10, executionQuality: null },
          { position: 4, scoreTotal: 86, isPractice: false, shotCount: 10, executionQuality: null },
        ],
      }),
      makeSession({
        id: "b",
        date: new Date("2026-02-01"),
        series: [
          { position: 1, scoreTotal: 94, isPractice: false, shotCount: 10, executionQuality: null },
          { position: 2, scoreTotal: 92, isPractice: false, shotCount: 10, executionQuality: null },
          { position: 3, scoreTotal: 90, isPractice: false, shotCount: 10, executionQuality: null },
          { position: 4, scoreTotal: 88, isPractice: false, shotCount: 10, executionQuality: null },
        ],
      }),
      // Sub-typische Einheit (2 Serien) mit anderen Werten
      makeSession({
        id: "c",
        date: new Date("2026-03-01"),
        series: [
          { position: 1, scoreTotal: 50, isPractice: false, shotCount: 10, executionQuality: null },
          { position: 2, scoreTotal: 50, isPractice: false, shotCount: 10, executionQuality: null },
        ],
      }),
    ]

    const result = aggregateOverview({ sessions, hiddenDisciplineIds: [], disciplineFilter: "all" })
    const typical = result[0].seriesGroups.find((g) => !g.isSubTypical)!

    // S1-Durchschnitt der typischen Gruppe: (90+94)/2 = 92, NICHT (90+94+50)/3
    expect(typical.seriesAverages[0]).toBeCloseTo(92)
    expect(typical.seriesAverages[1]).toBeCloseTo(90)
    expect(typical.seriesAverages[2]).toBeCloseTo(91)
    expect(typical.seriesAverages[3]).toBeCloseTo(87)
    expect(typical.typicalRangeTotalAverage).toBeCloseTo(360) // (356+364)/2
    expect(typical.rows).toHaveLength(2)

    const subTypical = result[0].seriesGroups.find((g) => g.isSubTypical)!
    expect(subTypical.seriesAverages[0]).toBeCloseTo(50)
    expect(subTypical.grandTotalAverage).toBe(100)
  })

  it("Einheiten mit unterschiedlicher Serienzahl landen in getrennten Gruppen", () => {
    const sessions = [
      makeSession({ id: "a", date: new Date("2026-01-01") }), // 4 Serien
      makeSession({
        id: "b",
        date: new Date("2026-02-01"),
        totalNonPracticeShots: 60,
        series: [
          { position: 1, scoreTotal: 88, isPractice: false, shotCount: 10, executionQuality: null },
          { position: 2, scoreTotal: 90, isPractice: false, shotCount: 10, executionQuality: null },
          { position: 3, scoreTotal: 85, isPractice: false, shotCount: 10, executionQuality: null },
          { position: 4, scoreTotal: 92, isPractice: false, shotCount: 10, executionQuality: null },
          { position: 5, scoreTotal: 87, isPractice: false, shotCount: 10, executionQuality: null },
          { position: 6, scoreTotal: 91, isPractice: false, shotCount: 10, executionQuality: null },
        ],
      }), // 6 Serien
    ]

    const result = aggregateOverview({ sessions, hiddenDisciplineIds: [], disciplineFilter: "all" })
    const group = result[0]
    // Jede Serienzahl bekommt ihre eigene Gruppe
    expect(group.seriesGroups).toHaveLength(2)

    const sg4 = group.seriesGroups.find((g) => g.seriesCount === 4)!
    expect(sg4.isSubTypical).toBe(false)
    expect(sg4.maxSeriesCount).toBe(4)
    expect(sg4.rows[0].typicalRangeTotal).toBe(360)
    expect(sg4.rows[0].grandTotal).toBe(360)

    const sg6 = group.seriesGroups.find((g) => g.seriesCount === 6)!
    expect(sg6.isSubTypical).toBe(false)
    expect(sg6.maxSeriesCount).toBe(6)
    expect(sg6.rows[0].typicalRangeTotal).toBe(355) // 88+90+85+92
    expect(sg6.rows[0].grandTotal).toBe(533)
    expect(group.maxSeriesCount).toBe(6)
    expect(group.allSeriesAverage).toBeCloseTo(89.3) // (360 + 533) / (4 + 6 Serien)
  })

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

  it("ignoriert Probe-Serien komplett", () => {
    const sessions = [
      makeSession({
        id: "a",
        series: [
          { position: 1, scoreTotal: 50, isPractice: true, shotCount: 5, executionQuality: null },
          { position: 2, scoreTotal: 88, isPractice: false, shotCount: 10, executionQuality: null },
          { position: 3, scoreTotal: 90, isPractice: false, shotCount: 10, executionQuality: null },
          { position: 4, scoreTotal: 85, isPractice: false, shotCount: 10, executionQuality: null },
          { position: 5, scoreTotal: 92, isPractice: false, shotCount: 10, executionQuality: null },
        ],
      }),
    ]

    const result = aggregateOverview({ sessions, hiddenDisciplineIds: [], disciplineFilter: "all" })
    // scored = [pos2, pos3, pos4, pos5] → scored.length=4, key=4 → typische Gruppe
    const sg = result[0].seriesGroups[0]
    expect(sg.isSubTypical).toBe(false)
    const row = sg.rows[0]
    expect(row.seriesScores[0]).toBeNull() // Position 1 = Probe → leer
    expect(row.seriesScores[1]).toBe(88)
    expect(row.typicalRangeTotal).toBe(263) // 88+90+85: S1 Probe → 0, S5 liegt über typicalSeriesCount → nicht in Gesamt
    expect(row.grandTotal).toBe(355)
  })

  it("überspringt Sessions ohne gewertete Serien", () => {
    const sessions = [
      makeSession({ id: "a", series: [] }),
      makeSession({ id: "b", date: new Date("2026-02-01") }),
    ]

    const result = aggregateOverview({ sessions, hiddenDisciplineIds: [], disciplineFilter: "all" })
    expect(result[0].sessionCount).toBe(1)
    expect(result[0].seriesGroups[0].rows[0].sessionId).toBe("b")
  })

  it("ignoriert versteckte Disziplinen wenn kein Disziplinfilter aktiv", () => {
    const visible = makeSession({ id: "v" })
    const hidden = makeSession({
      id: "h",
      disciplineId: "lg",
      discipline: {
        id: "lg",
        name: "Luftgewehr",
        seriesCount: 4,
        shotsPerSeries: 10,
        scoringType: "TENTH",
      },
    })

    const result = aggregateOverview({
      sessions: [visible, hidden],
      hiddenDisciplineIds: ["lg"],
      disciplineFilter: "all",
    })

    expect(result.map((g) => g.disciplineId)).toEqual(["lp"])
  })

  it("zeigt versteckte Disziplin wenn sie aktiv gefiltert ist", () => {
    const hidden = makeSession({
      id: "h",
      disciplineId: "lg",
      discipline: {
        id: "lg",
        name: "Luftgewehr",
        seriesCount: 4,
        shotsPerSeries: 10,
        scoringType: "TENTH",
      },
    })

    const result = aggregateOverview({
      sessions: [hidden],
      hiddenDisciplineIds: ["lg"],
      disciplineFilter: "lg",
    })

    expect(result).toHaveLength(1)
    expect(result[0].disciplineId).toBe("lg")
  })

  it("seriesGroups sind aufsteigend nach seriesCount sortiert", () => {
    const sessions = [
      makeSession({ id: "a", date: new Date("2026-01-01") }), // 4 Serien
      makeSession({
        id: "b",
        date: new Date("2026-02-01"),
        series: [
          { position: 1, scoreTotal: 80, isPractice: false, shotCount: 10, executionQuality: null },
        ],
      }), // 1 Serie
      makeSession({
        id: "c",
        date: new Date("2026-03-01"),
        series: [
          { position: 1, scoreTotal: 80, isPractice: false, shotCount: 10, executionQuality: null },
          { position: 2, scoreTotal: 80, isPractice: false, shotCount: 10, executionQuality: null },
          { position: 3, scoreTotal: 80, isPractice: false, shotCount: 10, executionQuality: null },
        ],
      }), // 3 Serien
    ]

    const result = aggregateOverview({ sessions, hiddenDisciplineIds: [], disciplineFilter: "all" })
    const counts = result[0].seriesGroups.map((g) => g.seriesCount)
    expect(counts).toEqual([1, 3, 4])
  })
})
