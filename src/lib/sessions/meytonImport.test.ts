import { describe, expect, it } from "vitest"
import { extractMeytonDateTime, parseMeytonSeriesFromText } from "./meytonImport"

describe("parseMeytonSeriesFromText", () => {
  it("extrahiert mehrere Serien mit Schuessen in Dokumentreihenfolge", () => {
    const text = `
Serie 1: 81 (85.3)
9.1 7.6 9.5 10.4* 8.4
6.7 10.1 8.2 7.5 7.8
beste Teiler: 470.0 (4.), 680.0 (7.), 1138.9 (3.)
Trefferlage: 0.17 mm rechts, 1.10 mm tief

Serie 2: 82 (87.4)
8.2 8.9 9.1 9.3 6.6
8.9 9.5 8.6 9.9 8.4
Streuwert: 13.92, horizontal: 14.28, vertikal: 13.55
`

    const result = parseMeytonSeriesFromText(text)

    expect(result).toEqual({
      serien: [
        { nr: 1, shots: [9.1, 7.6, 9.5, 10.4, 8.4, 6.7, 10.1, 8.2, 7.5, 7.8] },
        { nr: 2, shots: [8.2, 8.9, 9.1, 9.3, 6.6, 8.9, 9.5, 8.6, 9.9, 8.4] },
      ],
    })
  })

  it("akzeptiert leere Serien ohne Schuesse", () => {
    const text = `
Serie 1: 0 (0.0)
Trefferlage: 0.00 mm rechts, 0.00 mm hoch

Serie 2: 19 (23.4)
9.8 9.3
`

    const result = parseMeytonSeriesFromText(text)

    expect(result).toEqual({
      serien: [
        { nr: 1, shots: [] },
        { nr: 2, shots: [9.8, 9.3] },
      ],
    })
  })

  it("ignoriert Werte ausserhalb des Bereichs 0.0 bis 10.9", () => {
    const text = `
Serie 3: 90 (99.9)
9.8T 10.4* 11.0 10.9 0.0 0.5
`

    const result = parseMeytonSeriesFromText(text)

    expect(result).toEqual({
      serien: [{ nr: 3, shots: [9.8, 10.4, 10.9, 0, 0.5] }],
    })
  })

  it("extrahiert auch Ganzring-Schuesse ohne Dezimalstelle", () => {
    const text = `
Serie 2: 94 (0.0)
10 9 8 10 7
10 9 10 10 11
`

    const result = parseMeytonSeriesFromText(text)

    expect(result).toEqual({
      serien: [{ nr: 2, shots: [10, 9, 8, 10, 7, 10, 9, 10, 10] }],
    })
  })

  it("liefert leeres Ergebnis wenn keine Serie erkannt wird", () => {
    const text = "Ergebnis: 337 (353.5)"

    const result = parseMeytonSeriesFromText(text)

    expect(result).toEqual({ serien: [] })
  })

  it("beendet die letzte Serie nach dem ersten Schussblock und ignoriert spaetere Zahlen", () => {
    const text = `
Serie 4: 34 (37.2)
9.3 8.9 9.6 9.4
31 32 33 34 35 36
gedruckt am: 25.02.2026 20:36 ID: 7cf5a008 - Seite: 1
`

    const result = parseMeytonSeriesFromText(text)

    expect(result).toEqual({
      serien: [{ nr: 4, shots: [9.3, 8.9, 9.6, 9.4] }],
    })
  })
})

describe("extractMeytonDateTime", () => {
  it("extrahiert Datum und Uhrzeit aus dem Wertung-Header", () => {
    const text = "LP 40 alt SpO offene Klasse Wertung 25.02.2026 20:23"

    const result = extractMeytonDateTime(text)

    expect(result).toBeTruthy()
    expect(result?.startsWith("2026-02-25T")).toBe(true)
  })

  it("liefert null wenn kein Wertung-Datum vorhanden ist", () => {
    const text = "Serie 1: 81 (85.3)"

    const result = extractMeytonDateTime(text)

    expect(result).toBeNull()
  })

  it("extrahiert Datum/Uhrzeit aus Probe-Layout", () => {
    const text = `
LP 40 alt
StartNr: 6731
StandNr: 8
Probe
30.01.2026 20:08
gedruckt am: 30.01.2026 20:09
`

    const result = extractMeytonDateTime(text)

    expect(result).toBeTruthy()
    const parsed = new Date(result as string)
    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(0)
    expect(parsed.getDate()).toBe(30)
    expect(parsed.getHours()).toBe(20)
    expect(parsed.getMinutes()).toBe(8)
  })

  it("ignoriert 'gedruckt am' beim generischen Fallback", () => {
    const text = `
gedruckt am: 30.01.2026 20:09
`

    const result = extractMeytonDateTime(text)

    expect(result).toBeNull()
  })
})
