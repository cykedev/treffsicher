import { describe, it, expect } from "vitest"
import { calculateTotalScore, calculateAverage } from "./calculateScore"

describe("calculateTotalScore", () => {
  it("addiert alle Wertungsserien korrekt", () => {
    // Arrange
    const series = [
      { scoreTotal: 94, isPractice: false },
      { scoreTotal: 91, isPractice: false },
      { scoreTotal: 96, isPractice: false },
      { scoreTotal: 93, isPractice: false },
    ]

    // Act
    const result = calculateTotalScore(series)

    // Assert
    expect(result).toBe(374)
  })

  it("ignoriert Probeschuss-Serien bei der Gesamtwertung", () => {
    // Arrange: Probeschuss-Serie hat 50 Ringe, darf nicht gezählt werden
    const series = [
      { scoreTotal: 50, isPractice: true },
      { scoreTotal: 94, isPractice: false },
      { scoreTotal: 91, isPractice: false },
    ]

    // Act
    const result = calculateTotalScore(series)

    // Assert: Nur die zwei Wertungsserien
    expect(result).toBe(185)
  })

  it("gibt 0 zurück wenn keine Serien vorhanden sind", () => {
    const result = calculateTotalScore([])
    expect(result).toBe(0)
  })

  it("gibt 0 zurück wenn nur Probeschuss-Serien vorhanden sind", () => {
    const series = [
      { scoreTotal: 45, isPractice: true },
      { scoreTotal: 48, isPractice: true },
    ]
    const result = calculateTotalScore(series)
    expect(result).toBe(0)
  })

  it("behandelt null-Werte als 0", () => {
    // Null-Werte entstehen wenn eine Serie angelegt aber noch nicht ausgefüllt wurde
    const series = [
      { scoreTotal: 94, isPractice: false },
      { scoreTotal: null, isPractice: false },
      { scoreTotal: 91, isPractice: false },
    ]
    const result = calculateTotalScore(series)
    expect(result).toBe(185)
  })

  it("summiert Zehntelwertungen korrekt (Decimal-Präzision)", () => {
    // Zehntelwertungen können Rundungsfehler verursachen wenn nicht sorgfältig behandelt
    const series = [
      { scoreTotal: 94.7, isPractice: false },
      { scoreTotal: 95.3, isPractice: false },
    ]
    const result = calculateTotalScore(series)
    // 94.7 + 95.3 = 190.0 (kein Floating-Point-Fehler erwartet)
    expect(result).toBeCloseTo(190.0, 1)
  })
})

describe("calculateAverage", () => {
  it("berechnet den Durchschnitt korrekt", () => {
    const result = calculateAverage([90, 95, 100])
    expect(result).toBeCloseTo(95, 5)
  })

  it("ignoriert null-Werte", () => {
    const result = calculateAverage([90, null, 100])
    expect(result).toBeCloseTo(95, 5)
  })

  it("gibt null zurück bei leerer Liste", () => {
    expect(calculateAverage([])).toBeNull()
  })

  it("gibt null zurück wenn alle Werte null sind", () => {
    expect(calculateAverage([null, null])).toBeNull()
  })
})
