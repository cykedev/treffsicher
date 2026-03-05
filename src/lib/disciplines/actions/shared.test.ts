import { describe, expect, it, vi } from "vitest"
import { ZodError } from "zod"

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/auth-helpers", () => ({
  getAuthSession: vi.fn(),
}))

import { canManageDiscipline, mapValidationErrors, parseDisciplineFormData } from "@/lib/disciplines/actions/shared"

describe("parseDisciplineFormData", () => {
  it("parst gueltige FormData-Werte und uebernimmt isSystem aus dem Kontext", () => {
    const formData = new FormData()
    formData.set("name", "Luftpistole")
    formData.set("seriesCount", "4")
    formData.set("shotsPerSeries", "10")
    formData.set("practiceSeries", "1")
    formData.set("scoringType", "WHOLE")

    const parsed = parseDisciplineFormData(formData, true)
    expect(parsed.success).toBe(true)
    if (!parsed.success) return

    expect(parsed.data).toEqual({
      name: "Luftpistole",
      seriesCount: 4,
      shotsPerSeries: 10,
      practiceSeries: 1,
      scoringType: "WHOLE",
      isSystem: true,
    })
  })

  it("liefert Fehler bei ungueltigen numerischen Grenzen", () => {
    const formData = new FormData()
    formData.set("name", "")
    formData.set("seriesCount", "0")
    formData.set("shotsPerSeries", "999")
    formData.set("practiceSeries", "9")
    formData.set("scoringType", "INVALID")

    const parsed = parseDisciplineFormData(formData, false)
    expect(parsed.success).toBe(false)
  })
})

describe("canManageDiscipline", () => {
  it("erlaubt Admins die Verwaltung von System-Disziplinen", () => {
    const session = { user: { id: "u1", role: "ADMIN" } } as never
    const discipline = { ownerId: null, isSystem: true }
    expect(canManageDiscipline(session, discipline)).toBe(true)
  })

  it("erlaubt normalen Nutzern nur eigene, nicht-system Disziplinen", () => {
    const session = { user: { id: "u2", role: "USER" } } as never
    expect(canManageDiscipline(session, { ownerId: "u2", isSystem: false })).toBe(true)
    expect(canManageDiscipline(session, { ownerId: "u3", isSystem: false })).toBe(false)
    expect(canManageDiscipline(session, { ownerId: null, isSystem: true })).toBe(false)
  })
})

describe("mapValidationErrors", () => {
  it("mappt zod fieldErrors in das erwartete Fehlerformat", () => {
    const error = new ZodError([
      {
        code: "custom",
        message: "Name fehlt",
        path: ["name"],
      },
      {
        code: "custom",
        message: "Zu viele Serien",
        path: ["seriesCount"],
      },
    ])

    expect(mapValidationErrors(error)).toEqual({
      name: ["Name fehlt"],
      seriesCount: ["Zu viele Serien"],
    })
  })
})
