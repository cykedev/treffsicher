import { describe, it, expect } from "vitest"
import { calculateSeriesStats } from "./calculateSeriesStats"

describe("calculateSeriesStats", () => {
  it("berechnet Min/Max/Avg je Serienposition korrekt", () => {
    // Arrange: 2 Einheiten mit je 2 Wertungsserien
    const sessions = [
      {
        series: [
          { position: 1, scoreTotal: 90, isPractice: false },
          { position: 2, scoreTotal: 95, isPractice: false },
        ],
      },
      {
        series: [
          { position: 1, scoreTotal: 94, isPractice: false },
          { position: 2, scoreTotal: 91, isPractice: false },
        ],
      },
    ]

    // Act
    const result = calculateSeriesStats(sessions)

    // Assert
    expect(result).toHaveLength(2)

    const serie1 = result.find((s) => s.position === 1)!
    expect(serie1.min).toBe(90)
    expect(serie1.max).toBe(94)
    expect(serie1.avg).toBe(92)
    expect(serie1.count).toBe(2)

    const serie2 = result.find((s) => s.position === 2)!
    expect(serie2.min).toBe(91)
    expect(serie2.max).toBe(95)
    expect(serie2.avg).toBe(93)
  })

  it("schliesst Probeschuss-Serien aus", () => {
    // Arrange: Probeschuss-Serie hat hohen Wert, darf nicht in Statistik einfliessen
    const sessions = [
      {
        series: [
          { position: 1, scoreTotal: 50, isPractice: true },
          { position: 1, scoreTotal: 90, isPractice: false },
        ],
      },
    ]

    // Act
    const result = calculateSeriesStats(sessions)

    // Assert: nur Wertungsserie gezählt
    expect(result).toHaveLength(1)
    expect(result[0].min).toBe(90)
    expect(result[0].max).toBe(90)
    expect(result[0].count).toBe(1)
  })

  it("ignoriert Serien ohne Wert (null)", () => {
    const sessions = [
      {
        series: [
          { position: 1, scoreTotal: null, isPractice: false },
          { position: 2, scoreTotal: 95, isPractice: false },
        ],
      },
    ]

    const result = calculateSeriesStats(sessions)

    // Assert: nur Position 2 hat validen Wert
    expect(result).toHaveLength(1)
    expect(result[0].position).toBe(2)
  })

  it("gibt leeres Array zurück für leere Eingabe", () => {
    expect(calculateSeriesStats([])).toEqual([])
  })

  it("sortiert Ergebnisse aufsteigend nach Position", () => {
    const sessions = [
      {
        series: [
          { position: 3, scoreTotal: 92, isPractice: false },
          { position: 1, scoreTotal: 90, isPractice: false },
          { position: 2, scoreTotal: 95, isPractice: false },
        ],
      },
    ]

    const result = calculateSeriesStats(sessions)

    expect(result.map((s) => s.position)).toEqual([1, 2, 3])
  })
})
