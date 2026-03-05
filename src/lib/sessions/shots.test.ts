import { describe, expect, it } from "vitest"
import { formatShotsForLine, parseShotsJson, parseShotValue } from "@/lib/sessions/shots"

describe("parseShotsJson", () => {
  it("gibt nur String-Eintraege in Originalreihenfolge zurueck", () => {
    const result = parseShotsJson(["9.8", 10, null, "10.1", { value: "8.4" }])

    expect(result).toEqual(["9.8", "10.1"])
  })

  it("liefert leeres Array bei nicht-Array-Werten", () => {
    expect(parseShotsJson(null)).toEqual([])
    expect(parseShotsJson({ shots: ["9.9"] })).toEqual([])
  })
})

describe("parseShotValue", () => {
  it("parst getrimmte Ganz- und Dezimalwerte inkl. Komma", () => {
    expect(parseShotValue(" 10 ")).toBe(10)
    expect(parseShotValue("9.7")).toBe(9.7)
    expect(parseShotValue("8,4")).toBe(8.4)
  })

  it("liefert null fuer ungueltige Eingaben", () => {
    expect(parseShotValue("")).toBeNull()
    expect(parseShotValue("abc")).toBeNull()
    expect(parseShotValue("--5")).toBeNull()
  })
})

describe("formatShotsForLine", () => {
  it("trimmt Schuesse, entfernt leere Werte und verbindet mit Trenner", () => {
    const result = formatShotsForLine([" 9.8 ", "", "  ", "10.1", "9"])

    expect(result).toBe("9.8 · 10.1 · 9")
  })
})
