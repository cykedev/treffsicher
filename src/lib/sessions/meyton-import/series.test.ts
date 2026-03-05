import { describe, expect, it } from "vitest"
import { parseMeytonSeriesFromText } from "@/lib/sessions/meyton-import/series"

describe("parseMeytonSeriesFromText", () => {
  it("startet den Schussblock erst ab der ersten validen Zahlenzeile", () => {
    const text = `
Serie 1:
Name: Athlet
Verein: XYZ
9.8 10.1 9.4
9.7 9.8 9.9
`

    expect(parseMeytonSeriesFromText(text)).toEqual({
      serien: [{ nr: 1, shots: [9.8, 10.1, 9.4, 9.7, 9.8, 9.9] }],
    })
  })

  it("beendet den Schussblock bei erster leerer/nicht numerischer Folge nach Start", () => {
    const text = `
Serie 2:
10.0 9.9 9.8
Kommentar: Abbruch
10.0 10.0 10.0
`

    expect(parseMeytonSeriesFromText(text)).toEqual({
      serien: [{ nr: 2, shots: [10, 9.9, 9.8] }],
    })
  })

  it("ignoriert Werte ausserhalb 0..10.9", () => {
    const text = `
Serie 3:
11.2 10.9 12.0 0.0 9.5
`

    expect(parseMeytonSeriesFromText(text)).toEqual({
      serien: [{ nr: 3, shots: [10.9, 0, 9.5] }],
    })
  })
})
