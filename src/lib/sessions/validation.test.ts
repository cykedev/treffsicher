import { describe, it, expect } from "vitest"
import { formatSeriesMax, getSeriesMax, isValidSeriesTotal, isValidShotValue } from "./validation"

describe("isValidShotValue", () => {
  it("akzeptiert bei Ganzringen nur ganze Werte von 0 bis 10", () => {
    // Arrange
    const validValues = ["0", "5", "10"]

    // Act + Assert
    for (const value of validValues) {
      expect(isValidShotValue(value, "WHOLE")).toBe(true)
    }
  })

  it("lehnt bei Ganzringen Dezimalwerte und Werte ausserhalb des Bereichs ab", () => {
    // Arrange
    const invalidValues = ["9.5", "-1", "11", "abc"]

    // Act + Assert
    for (const value of invalidValues) {
      expect(isValidShotValue(value, "WHOLE")).toBe(false)
    }
  })

  it("akzeptiert bei Zehntelwertung 0.0 sowie 1.0 bis 10.9", () => {
    // Arrange
    const validValues = ["0", "0.0", "1.0", "9.5", "10.9"]

    // Act + Assert
    for (const value of validValues) {
      expect(isValidShotValue(value, "TENTH")).toBe(true)
    }
  })

  it("lehnt bei Zehntelwertung 0.1 bis 0.9 und ungültige Formate ab", () => {
    // Arrange
    const invalidValues = ["0.1", "0.9", "10.99", "11.0", "-0.1", "abc"]

    // Act + Assert
    for (const value of invalidValues) {
      expect(isValidShotValue(value, "TENTH")).toBe(false)
    }
  })

  it("behandelt leere Felder als noch nicht ausgefüllt und damit gültig", () => {
    expect(isValidShotValue("", "WHOLE")).toBe(true)
    expect(isValidShotValue("", "TENTH")).toBe(true)
  })
})

describe("getSeriesMax", () => {
  it("berechnet den Maximalwert für Ganzringe korrekt", () => {
    // Arrange
    const shotsCount = 10

    // Act
    const result = getSeriesMax("WHOLE", shotsCount)

    // Assert
    expect(result).toBe(100)
  })

  it("berechnet den Maximalwert für Zehntelringe korrekt", () => {
    // Arrange
    const shotsCount = 10

    // Act
    const result = getSeriesMax("TENTH", shotsCount)

    // Assert
    expect(result).toBe(109)
  })
})

describe("isValidSeriesTotal", () => {
  it("akzeptiert leere Felder als gültig", () => {
    expect(isValidSeriesTotal("", "WHOLE", 10)).toBe(true)
    expect(isValidSeriesTotal("", "TENTH", 10)).toBe(true)
  })

  it("akzeptiert Summen bis inklusive Maximum", () => {
    // Arrange
    const wholeMax = "100"
    const tenthMax = "109.0"

    // Act + Assert
    expect(isValidSeriesTotal(wholeMax, "WHOLE", 10)).toBe(true)
    expect(isValidSeriesTotal(tenthMax, "TENTH", 10)).toBe(true)
  })

  it("lehnt Summen oberhalb des Maximums ab", () => {
    // Arrange
    const wholeTooHigh = "101"
    const tenthTooHigh = "109.1"

    // Act + Assert
    expect(isValidSeriesTotal(wholeTooHigh, "WHOLE", 10)).toBe(false)
    expect(isValidSeriesTotal(tenthTooHigh, "TENTH", 10)).toBe(false)
  })
})

describe("formatSeriesMax", () => {
  it("formatiert Ganzring-Maximum ohne Nachkommastellen", () => {
    expect(formatSeriesMax("WHOLE", 10)).toBe("100")
  })

  it("formatiert Zehntel-Maximum mit einer Nachkommastelle", () => {
    expect(formatSeriesMax("TENTH", 10)).toBe("109.0")
  })
})
