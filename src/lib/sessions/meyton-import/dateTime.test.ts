import { describe, expect, it } from "vitest"
import { extractMeytonDateTime } from "@/lib/sessions/meyton-import/dateTime"

describe("extractMeytonDateTime", () => {
  it("priorisiert Wertung-Datum gegenueber anderen Treffern", () => {
    const text = `
Probe 01.03.2026 09:00
Wertung 01.03.2026 09:15
`

    expect(extractMeytonDateTime(text)).toBe("2026-03-01T09:15")
  })

  it("verwirft ungueltige Kalendertage ueber Roundtrip-Pruefung", () => {
    const text = "Wertung 31.02.2026 19:30"

    expect(extractMeytonDateTime(text)).toBeNull()
  })

  it("nutzt generischen Fallback und ignoriert 'gedruckt am'", () => {
    const text = `
gedruckt am: 01.03.2026 22:00
Standende 01.03.2026 20:45
`

    expect(extractMeytonDateTime(text)).toBe("2026-03-01T20:45")
  })
})
