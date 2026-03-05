import { describe, expect, it } from "vitest"
import { buildSessionDetailViewModel } from "@/lib/sessions/sessionDetailViewModel"
import type { SessionDetail } from "@/lib/sessions/actions"

function createSessionDetail(
  overrides: Partial<Pick<SessionDetail, "type" | "discipline" | "series">> = {}
): SessionDetail {
  return {
    type: "TRAINING",
    discipline: null,
    series: [],
    ...overrides,
  } as unknown as SessionDetail
}

describe("buildSessionDetailViewModel", () => {
  it("berechnet Scoring-Daten fuer Training mit Seriendaten", () => {
    const session = createSessionDetail({
      type: "TRAINING",
      discipline: { scoringType: "TENTH" } as SessionDetail["discipline"],
      series: [
        {
          scoreTotal: "50.0",
          isPractice: true,
          shots: ["10.0", "9.8"],
        },
        {
          scoreTotal: "89.5",
          isPractice: false,
          shots: ["9.8", "10.1", 8],
        },
        {
          scoreTotal: null,
          isPractice: false,
          shots: ["9.6"],
        },
      ] as unknown as SessionDetail["series"],
    })

    const result = buildSessionDetailViewModel(session)

    expect(result).toEqual({
      totalScore: 89.5,
      hasScoring: true,
      isDecimal: true,
      hasPrognosisFeedback: true,
      scoringShots: ["9.8", "10.1", "9.6"],
      hasAttachmentSection: true,
      hasSeriesResults: true,
      showShotDistribution: true,
    })
  })

  it("deaktiviert Scoring-Bloecke fuer nicht-scorebasierte Einheitstypen", () => {
    const session = createSessionDetail({
      type: "MENTAL",
      series: [{ scoreTotal: "30", isPractice: false, shots: ["10"] }] as unknown as SessionDetail["series"],
    })

    const result = buildSessionDetailViewModel(session)

    expect(result.hasScoring).toBe(false)
    expect(result.hasPrognosisFeedback).toBe(false)
    expect(result.hasAttachmentSection).toBe(false)
    expect(result.hasSeriesResults).toBe(false)
    expect(result.showShotDistribution).toBe(false)
    expect(result.isDecimal).toBe(false)
    expect(result.totalScore).toBe(30)
  })

  it("zeigt keine Schussverteilung wenn nur leere oder Probeschuss-Werte vorliegen", () => {
    const session = createSessionDetail({
      type: "WETTKAMPF",
      series: [
        { scoreTotal: 0, isPractice: true, shots: ["10.0"] },
        { scoreTotal: 80, isPractice: false, shots: [] },
        { scoreTotal: 79, isPractice: false, shots: [1, null] },
      ] as unknown as SessionDetail["series"],
    })

    const result = buildSessionDetailViewModel(session)

    expect(result.scoringShots).toEqual([])
    expect(result.showShotDistribution).toBe(false)
    expect(result.totalScore).toBe(159)
  })
})
