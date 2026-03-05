import { beforeEach, describe, expect, it, vi } from "vitest"

const { findFirstMock } = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("@/lib/auth-helpers", () => ({
  getAuthSession: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  db: {
    goal: {
      findFirst: findFirstMock,
    },
  },
}))

import { ensureOwnedGoal, mapGoalWithAssignments, parseGoalInput } from "@/lib/goals/actions/shared"

describe("parseGoalInput", () => {
  it("validiert create-Eingaben und mappt optionale Beschreibung auf null", () => {
    const formData = new FormData()
    formData.set("title", "Saisonziel")
    formData.set("description", "")
    formData.set("type", "PROCESS")
    formData.set("dateFrom", "2026-03-01")
    formData.set("dateTo", "2026-03-31")

    const parsed = parseGoalInput(formData, "create")
    expect("error" in parsed).toBe(false)
    if ("error" in parsed) return

    expect(parsed).toMatchObject({
      title: "Saisonziel",
      description: null,
      type: "PROCESS",
    })
    expect(parsed.dateFrom instanceof Date).toBe(true)
    expect(parsed.dateTo instanceof Date).toBe(true)
  })

  it("liefert Fehler wenn Pflichtfelder fehlen", () => {
    const formData = new FormData()
    formData.set("title", "")
    formData.set("type", "RESULT")
    formData.set("dateFrom", "")
    formData.set("dateTo", "")

    expect(parseGoalInput(formData, "update")).toEqual({
      error: "Bitte die Pflichtfelder prüfen.",
    })
  })

  it("liefert Fehler wenn dateFrom nach dateTo liegt", () => {
    const formData = new FormData()
    formData.set("title", "Wettkampf")
    formData.set("type", "RESULT")
    formData.set("dateFrom", "2026-04-01")
    formData.set("dateTo", "2026-03-31")

    expect(parseGoalInput(formData, "create")).toEqual({
      error: "Das Enddatum muss am oder nach dem Startdatum liegen.",
    })
  })
})

describe("mapGoalWithAssignments", () => {
  it("mappt Relationsdaten in das erwartete View-Model", () => {
    const mapped = mapGoalWithAssignments({
      id: "goal-1",
      title: "Technik",
      description: "ruhiger Ablauf",
      type: "PROCESS",
      dateFrom: new Date("2026-03-01T00:00:00.000Z"),
      dateTo: new Date("2026-03-31T00:00:00.000Z"),
      sessions: [{ sessionId: "s1" }, { sessionId: "s2" }],
      _count: { sessions: 2 },
    })

    expect(mapped).toEqual({
      id: "goal-1",
      title: "Technik",
      description: "ruhiger Ablauf",
      type: "PROCESS",
      dateFrom: new Date("2026-03-01T00:00:00.000Z"),
      dateTo: new Date("2026-03-31T00:00:00.000Z"),
      sessionCount: 2,
      sessionIds: ["s1", "s2"],
    })
  })
})

describe("ensureOwnedGoal", () => {
  beforeEach(() => {
    findFirstMock.mockReset()
  })

  it("fragt mit goalId und userId scoped ab", async () => {
    findFirstMock.mockResolvedValue({ id: "goal-7" })

    const result = await ensureOwnedGoal("goal-7", "user-3")

    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: "goal-7", userId: "user-3" },
      select: { id: true },
    })
    expect(result).toEqual({ id: "goal-7" })
  })
})
