import { describe, expect, it } from "vitest"
import { extractMeytonHitLocation } from "@/lib/sessions/meyton-import/hitLocation"

describe("extractMeytonHitLocation", () => {
  it("rendert bekannte Richtungen in enum-Werte", () => {
    const text = "Trefferlage: 4.20 mm rechts, 1.05 mm tief"

    expect(extractMeytonHitLocation(text)).toEqual({
      horizontalMm: 4.2,
      horizontalDirection: "RIGHT",
      verticalMm: 1.05,
      verticalDirection: "LOW",
    })
  })

  it("rundet Millimeterwerte auf zwei Nachkommastellen", () => {
    const text = "Trefferlage: 0,129 mm links, 2,999 mm hoch"

    expect(extractMeytonHitLocation(text)).toEqual({
      horizontalMm: 0.13,
      horizontalDirection: "LEFT",
      verticalMm: 3,
      verticalDirection: "HIGH",
    })
  })

  it("liefert null bei nicht passenden oder negativen Werten", () => {
    expect(extractMeytonHitLocation("Trefferlage: -1 mm rechts, 2 mm hoch")).toBeNull()
    expect(extractMeytonHitLocation("Keine Trefferlage im Text")).toBeNull()
  })
})
