import { describe, it, expect } from "vitest"
import { calculateMovingAverage, calculateWeightedMovingAverage } from "./calculateMovingAverage"

describe("calculateMovingAverage", () => {
  it("berechnet rückblickenden gleitenden Durchschnitt für einfache Zahlenreihe", () => {
    // Arrange: 5 Werte, Fenster 3
    const values = [90, 95, 100, 95, 90]

    // Act
    const result = calculateMovingAverage(values, 3)

    // Assert: am Anfang mit kleinerem Fenster, danach aus den letzten 3 Werten
    expect(result[0]).toBeCloseTo(90, 3) // (90) / 1
    expect(result[1]).toBeCloseTo(92.5, 3) // (90 + 95) / 2
    expect(result[2]).toBeCloseTo(95, 3) // (90 + 95 + 100) / 3
    expect(result[3]).toBeCloseTo(96.6667, 3) // (95 + 100 + 95) / 3
    expect(result[4]).toBeCloseTo(95, 3) // (100 + 95 + 90) / 3
  })

  it("gibt auch bei kleiner Datenmenge sinnvolle Durchschnittswerte zurück", () => {
    // Arrange: Nur 2 Datenpunkte für Fenster 5.
    const values = [90, 95]

    // Act
    const result = calculateMovingAverage(values, 5)

    // Assert: mit verfügbarem Teilfenster gerechnet
    expect(result[0]).toBeCloseTo(90, 3)
    expect(result[1]).toBeCloseTo(92.5, 3)
  })

  it("nutzt bei grösserem Fenster anfangs das verfügbare Teilfenster", () => {
    // Arrange: 7 Werte, Fenster 5
    const values = [90, 95, 100, 95, 90, 85, 92]

    // Act
    const result = calculateMovingAverage(values, 5)

    // Assert: frühe Punkte basieren auf weniger Werten
    expect(result[0]).toBeCloseTo(90, 3) // (90) / 1
    expect(result[3]).toBeCloseTo(95, 3) // (90 + 95 + 100 + 95) / 4
    expect(result[4]).toBeCloseTo(94, 3) // (90 + 95 + 100 + 95 + 90) / 5
    expect(result[6]).toBeCloseTo(92.4, 3) // (100 + 95 + 90 + 85 + 92) / 5
  })

  it("überspringt null-Werte im Fenster", () => {
    // Arrange: null repräsentiert Einheiten ohne Ergebnis (z.B. Trockentraining)
    const values = [90, null, 100]

    // Act
    const result = calculateMovingAverage(values, 3)

    // Assert: null-Wert wird übersprungen, übrige Werte werden genutzt
    expect(result[0]).toBeCloseTo(90, 3)
    expect(result[1]).toBeCloseTo(90, 3)
    expect(result[2]).toBeCloseTo(95, 3) // (90 + 100) / 2
  })

  it("gibt null zurück, wenn im Fenster kein gültiger Wert vorhanden ist", () => {
    const values = [null, null, null]
    expect(calculateMovingAverage(values, 3)).toEqual([null, null, null])
  })

  it("gibt leeres Array zurück für leere Eingabe", () => {
    expect(calculateMovingAverage([], 3)).toEqual([])
  })

  it("gibt Array gleicher Länge wie Eingabe zurück", () => {
    const values = [1, 2, 3, 4, 5]
    const result = calculateMovingAverage(values, 3)
    expect(result).toHaveLength(values.length)
  })

  it("rundet den Durchschnitt nicht künstlich auf eine Dezimalstelle", () => {
    const values = [8.71, 8.74, 8.79]
    const result = calculateMovingAverage(values, 3)
    expect(result[2]).toBeCloseTo(8.7467, 3)
  })
})

describe("calculateWeightedMovingAverage", () => {
  it("gewichtet neuere Werte stärker als ältere", () => {
    // Arrange: Fenster 3, Gewichte [1, 2, 3], Summe 6
    const values = [90, 95, 100]

    // Act
    const result = calculateWeightedMovingAverage(values, 3)

    // Assert: (90*1 + 95*2 + 100*3) / 6 = 580 / 6 ≈ 96.6667
    expect(result[0]).toBeCloseTo(90, 3) // nur ein Wert: (90*1) / 1
    expect(result[1]).toBeCloseTo(93.3333, 3) // (90*1 + 95*2) / 3
    expect(result[2]).toBeCloseTo(96.6667, 3) // (90*1 + 95*2 + 100*3) / 6
  })

  it("reagiert schneller auf neue Werte als einfacher Durchschnitt", () => {
    // Letzter Wert springt hoch — WMA soll stärker reagieren
    const values = [90, 90, 90, 90, 100]
    const wma = calculateWeightedMovingAverage(values, 3)
    const sma = calculateMovingAverage(values, 3)

    // WMA letzter Punkt: (90*1 + 90*2 + 100*3) / 6 = 96.6667
    // SMA letzter Punkt: (90 + 90 + 100) / 3 = 93.3333
    expect(wma[4]).toBeGreaterThan(sma[4] as number)
  })

  it("überspringt null-Werte und passt Gewichte an", () => {
    const values = [90, null, 100]
    const result = calculateWeightedMovingAverage(values, 3)

    // null hat kein Gewicht: (90*1 + 100*3) / (1+3) = 390 / 4 = 97.5
    expect(result[2]).toBeCloseTo(97.5, 3)
  })

  it("gibt null zurück wenn kein gültiger Wert im Fenster", () => {
    const values = [null, null, null]
    expect(calculateWeightedMovingAverage(values, 3)).toEqual([null, null, null])
  })

  it("gibt leeres Array zurück für leere Eingabe", () => {
    expect(calculateWeightedMovingAverage([], 3)).toEqual([])
  })

  it("gibt Array gleicher Länge wie Eingabe zurück", () => {
    const values = [1, 2, 3, 4, 5]
    expect(calculateWeightedMovingAverage(values, 3)).toHaveLength(5)
  })
})
