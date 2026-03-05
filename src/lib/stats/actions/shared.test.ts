import { describe, expect, it } from "vitest"
import { addDateRangeFilter, addDisciplineFilter, resolveSeriesShotCount } from "@/lib/stats/actions/shared"

describe("resolveSeriesShotCount", () => {
  it("nutzt die Shot-Array-Laenge wenn Schuesse vorhanden sind", () => {
    expect(resolveSeriesShotCount(["10", "9", "8"], 10)).toBe(3)
  })

  it("faellt auf den Default zurueck wenn keine Schuesse vorhanden sind", () => {
    expect(resolveSeriesShotCount([], 10)).toBe(10)
    expect(resolveSeriesShotCount(null, 8)).toBe(8)
  })
})

describe("addDisciplineFilter", () => {
  it("setzt disciplineId nur bei explizitem Filter", () => {
    const where: Record<string, unknown> = {}

    addDisciplineFilter(where, { disciplineId: "disc-1" })
    expect(where).toMatchObject({ disciplineId: "disc-1" })

    const unchanged: Record<string, unknown> = {}
    addDisciplineFilter(unchanged, { disciplineId: "all" })
    expect(unchanged).toEqual({})
  })
})

describe("addDateRangeFilter", () => {
  it("setzt gte/lte und erweitert to auf Tagesende", () => {
    const where: Record<string, unknown> = {}
    addDateRangeFilter(where, { from: "2026-03-01", to: "2026-03-05" })

    const dateFilter = where.date as { gte: Date; lte: Date }
    expect(dateFilter.gte.toISOString()).toBe("2026-03-01T00:00:00.000Z")
    expect(dateFilter.lte.getFullYear()).toBe(2026)
    expect(dateFilter.lte.getMonth()).toBe(2)
    expect(dateFilter.lte.getDate()).toBe(5)
    expect(dateFilter.lte.getHours()).toBe(23)
    expect(dateFilter.lte.getMinutes()).toBe(59)
    expect(dateFilter.lte.getSeconds()).toBe(59)
    expect(dateFilter.lte.getMilliseconds()).toBe(999)
  })

  it("laesst where unveraendert wenn kein Zeitraum gesetzt ist", () => {
    const where: Record<string, unknown> = { userId: "u1" }
    addDateRangeFilter(where, {})
    expect(where).toEqual({ userId: "u1" })
  })
})
