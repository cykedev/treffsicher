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
  it("gruppiert nach Disziplin und Schusszahl mit Min/Avg/Max", () => {
    const sessions = [
      makeSession({ id: "a", totalScore: 327, totalNonPracticeShots: 40 }),
      makeSession({ id: "b", totalScore: 359, totalNonPracticeShots: 40 }),
      makeSession({ id: "c", totalScore: 340, totalNonPracticeShots: 40 }),
      makeSession({
        id: "d",
        totalScore: 540,
        totalNonPracticeShots: 60,
        series: [
          { position: 1, scoreTotal: 90, isPractice: false, shotCount: 10, executionQuality: null },
          { position: 2, scoreTotal: 90, isPractice: false, shotCount: 10, executionQuality: null },
          { position: 3, scoreTotal: 90, isPractice: false, shotCount: 10, executionQuality: null },
          { position: 4, scoreTotal: 90, isPractice: false, shotCount: 10, executionQuality: null },
          { position: 5, scoreTotal: 90, isPractice: false, shotCount: 10, executionQuality: null },
          { position: 6, scoreTotal: 90, isPractice: false, shotCount: 10, executionQuality: null },
        ],
      }),
    ]

    const result = aggregateOverview({
      sessions,
      hiddenDisciplineIds: [],
      disciplineFilter: "all",
    })

    expect(result).toHaveLength(1)
    const lp = result[0]
    expect(lp.disciplineName).toBe("Luftpistole")
    expect(lp.sessionCount).toBe(4)
    expect(lp.shotGroups).toHaveLength(2)

    const small = lp.shotGroups.find((g) => g.totalShots === 40)!
    expect(small.sessionCount).toBe(3)
    expect(small.minScore).toBe(327)
    expect(small.maxScore).toBe(359)
    expect(small.avgScore).toBeCloseTo((327 + 359 + 340) / 3, 5)
    expect(small.seriesCount).toBe(4)

    const big = lp.shotGroups.find((g) => g.totalShots === 60)!
    expect(big.sessionCount).toBe(1)
    expect(big.seriesCount).toBe(6)
  })

  it("ignoriert versteckte Disziplinen, wenn kein Disziplinfilter aktiv ist", () => {
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

  it("zeigt versteckte Disziplin, wenn sie aktiv gefiltert ist", () => {
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

  it("überspringt Sessions ohne Ergebnis", () => {
    const sessions = [
      makeSession({ id: "a", totalScore: null, totalNonPracticeShots: 0 }),
      makeSession({ id: "b", totalScore: 350, totalNonPracticeShots: 40 }),
    ]

    const result = aggregateOverview({
      sessions,
      hiddenDisciplineIds: [],
      disciplineFilter: "all",
    })

    expect(result[0].sessionCount).toBe(1)
    expect(result[0].shotGroups[0].minScore).toBe(350)
  })
})
