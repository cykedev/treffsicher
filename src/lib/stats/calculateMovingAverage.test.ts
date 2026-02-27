import { describe, it, expect } from "vitest"
import { calculateMovingAverage } from "./calculateMovingAverage"

describe("calculateMovingAverage", () => {
  it("berechnet gleitenden Durchschnitt für einfache Zahlenreihe", () => {
    // Arrange: 5 Werte, Fenster 3
    const values = [90, 95, 100, 95, 90]

    // Act
    const result = calculateMovingAverage(values, 3)

    // Assert: mittlere Werte bekommen Durchschnitt aus 3 Nachbarn
    expect(result[1]).toBeCloseTo(95, 1) // (90 + 95 + 100) / 3
    expect(result[2]).toBeCloseTo(96.7, 1) // (95 + 100 + 95) / 3
    expect(result[3]).toBeCloseTo(95, 1) // (100 + 95 + 90) / 3
  })

  it("gibt null zurück wenn die Datenmenge kleiner als minRequired ist", () => {
    // Arrange: Nur 2 Datenpunkte für Fenster 5.
    // minRequired = ceil(5/2) = 3 — mit 2 Werten nicht erreichbar
    const values = [90, 95]

    // Act
    const result = calculateMovingAverage(values, 5)

    // Assert: beide Positionen haben weniger als 3 Nachbarn im Fenster → null
    expect(result[0]).toBeNull()
    expect(result[1]).toBeNull()
  })

  it("gibt Durchschnitt zurück wenn genug Randwerte vorhanden sind", () => {
    // Arrange: 7 Werte, Fenster 5 — Index 0 hat genau 3 Werte (= minRequired)
    const values = [90, 95, 100, 95, 90, 85, 92]

    // Act
    const result = calculateMovingAverage(values, 5)

    // Assert: Index 0 erreicht minRequired=3 → nicht null, mittlere Werte ebenfalls
    expect(result[0]).not.toBeNull()
    expect(result[3]).not.toBeNull()
  })

  it("überspringt null-Werte im Fenster", () => {
    // Arrange: null repräsentiert Einheiten ohne Ergebnis (z.B. Trockentraining)
    const values = [90, null, 100]

    // Act
    const result = calculateMovingAverage(values, 3)

    // Assert: null-Wert wird übersprungen, Durchschnitt aus 2 gültigen Werten
    expect(result[1]).toBeCloseTo(95, 1) // (90 + 100) / 2
  })

  it("gibt leeres Array zurück für leere Eingabe", () => {
    expect(calculateMovingAverage([], 3)).toEqual([])
  })

  it("gibt Array gleicher Länge wie Eingabe zurück", () => {
    const values = [1, 2, 3, 4, 5]
    const result = calculateMovingAverage(values, 3)
    expect(result).toHaveLength(values.length)
  })
})
