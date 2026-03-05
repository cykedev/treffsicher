import { describe, expect, it } from "vitest"
import {
  EXECUTION_QUALITY_LABELS,
  needsDisciplineForSessionType,
  SESSION_TYPE_BADGE_CLASS,
  SESSION_TYPE_LABELS,
} from "@/lib/sessions/presentation"

describe("needsDisciplineForSessionType", () => {
  it("fordert Disziplin nur fuer Training und Wettkampf", () => {
    expect(needsDisciplineForSessionType("TRAINING")).toBe(true)
    expect(needsDisciplineForSessionType("WETTKAMPF")).toBe(true)
    expect(needsDisciplineForSessionType("MENTAL")).toBe(false)
    expect(needsDisciplineForSessionType("TROCKENTRAINING")).toBe(false)
  })
})

describe("SESSION_TYPE_LABELS", () => {
  it("mappt alle Sessiontypen auf stabile Anzeigenamen", () => {
    expect(SESSION_TYPE_LABELS).toEqual({
      TRAINING: "Training",
      WETTKAMPF: "Wettkampf",
      TROCKENTRAINING: "Trockentraining",
      MENTAL: "Mentaltraining",
    })
  })
})

describe("SESSION_TYPE_BADGE_CLASS", () => {
  it("enthaelt fuer jeden Sessiontyp eine Badge-Klasse", () => {
    expect(Object.keys(SESSION_TYPE_BADGE_CLASS).sort()).toEqual([
      "MENTAL",
      "TRAINING",
      "TROCKENTRAINING",
      "WETTKAMPF",
    ])
  })
})

describe("EXECUTION_QUALITY_LABELS", () => {
  it("enthaelt erwartete 1-bis-5-Skala", () => {
    expect(EXECUTION_QUALITY_LABELS).toEqual({
      1: "1 – Schlecht",
      2: "2 – Mässig",
      3: "3 – Mittel",
      4: "4 – Gut",
      5: "5 – Sehr gut",
    })
  })
})
