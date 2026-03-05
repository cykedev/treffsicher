import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  revalidatePathMock,
  redirectMock,
  getAuthSessionMock,
  findFirstMock,
  transactionMock,
  prepareSessionWriteInputMock,
  buildSessionWriteDataMock,
  replaceSessionSeriesMock,
  syncSessionGoalsMock,
  updateMock,
} = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
  redirectMock: vi.fn(),
  getAuthSessionMock: vi.fn(),
  findFirstMock: vi.fn(),
  transactionMock: vi.fn(),
  prepareSessionWriteInputMock: vi.fn(),
  buildSessionWriteDataMock: vi.fn(),
  replaceSessionSeriesMock: vi.fn(),
  syncSessionGoalsMock: vi.fn(),
  updateMock: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}))

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}))

vi.mock("@/lib/auth-helpers", () => ({
  getAuthSession: getAuthSessionMock,
}))

vi.mock("@/lib/db", () => ({
  db: {
    trainingSession: {
      findFirst: findFirstMock,
    },
    $transaction: transactionMock,
  },
}))

vi.mock("@/lib/sessions/actions/session/sessionWriteShared", () => ({
  prepareSessionWriteInput: prepareSessionWriteInputMock,
  buildSessionWriteData: buildSessionWriteDataMock,
  replaceSessionSeries: replaceSessionSeriesMock,
  syncSessionGoals: syncSessionGoalsMock,
}))

import { updateSessionAction } from "@/lib/sessions/actions/session/updateSession"

describe("updateSessionAction", () => {
  beforeEach(() => {
    revalidatePathMock.mockReset()
    redirectMock.mockReset()
    getAuthSessionMock.mockReset()
    findFirstMock.mockReset()
    transactionMock.mockReset()
    prepareSessionWriteInputMock.mockReset()
    buildSessionWriteDataMock.mockReset()
    replaceSessionSeriesMock.mockReset()
    syncSessionGoalsMock.mockReset()
    updateMock.mockReset()
    redirectMock.mockImplementation((path: string) => {
      throw new Error(`REDIRECT:${path}`)
    })
  })

  it("liefert Fehler ohne Login", async () => {
    getAuthSessionMock.mockResolvedValue(null)

    const result = await updateSessionAction("s1", new FormData())

    expect(result).toEqual({ error: "Nicht angemeldet" })
  })

  it("liefert Fehler wenn Session nicht dem Nutzer gehoert", async () => {
    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } })
    findFirstMock.mockResolvedValue(null)

    const result = await updateSessionAction("s1", new FormData())

    expect(result).toEqual({ error: "Einheit nicht gefunden" })
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: "s1", userId: "user-1" },
      select: { id: true },
    })
  })

  it("gibt Vorbereitungsfehler unveraendert zurueck", async () => {
    const formData = new FormData()
    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } })
    findFirstMock.mockResolvedValue({ id: "s1" })
    prepareSessionWriteInputMock.mockResolvedValue({ error: "Trefferlage ist ungültig." })

    const result = await updateSessionAction("s1", formData)

    expect(result).toEqual({ error: "Trefferlage ist ungültig." })
    expect(prepareSessionWriteInputMock).toHaveBeenCalledWith(formData, "user-1", {
      action: "updateSession",
      sessionId: "s1",
    })
  })

  it("aktualisiert Einheit inkl. Serien/Goals und redirectet", async () => {
    const formData = new FormData()
    const prepared = {
      parsed: { type: "WETTKAMPF", location: "Stand", trainingGoal: "Ruhig bleiben" },
      sessionDate: new Date("2026-03-06T10:00:00.000Z"),
      disciplineId: "disc-2",
      seriesData: [
        { position: 1, isPractice: false, scoreTotal: "88", shots: ["8"], executionQuality: 3 },
      ],
      selectedGoalIds: ["goal-2"],
      hitLocationInput: {
        horizontalMm: 1.2,
        horizontalDirection: "RIGHT",
        verticalMm: 0.7,
        verticalDirection: "HIGH",
      },
    }
    const tx = {
      trainingSession: {
        update: updateMock.mockResolvedValue({ id: "s1" }),
      },
    }

    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } })
    findFirstMock.mockResolvedValue({ id: "s1" })
    prepareSessionWriteInputMock.mockResolvedValue(prepared)
    buildSessionWriteDataMock.mockReturnValue({
      type: "WETTKAMPF",
      date: prepared.sessionDate,
      location: "Stand",
      disciplineId: "disc-2",
      trainingGoal: "Ruhig bleiben",
      hitLocationHorizontalMm: 1.2,
      hitLocationHorizontalDirection: "RIGHT",
      hitLocationVerticalMm: 0.7,
      hitLocationVerticalDirection: "HIGH",
    })
    transactionMock.mockImplementation(
      async (fn: (transactionClient: unknown) => Promise<unknown>) => fn(tx)
    )

    const promise = updateSessionAction("s1", formData)

    await expect(promise).rejects.toThrow("REDIRECT:/sessions/s1")
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "s1" },
      data: {
        type: "WETTKAMPF",
        date: prepared.sessionDate,
        location: "Stand",
        disciplineId: "disc-2",
        trainingGoal: "Ruhig bleiben",
        hitLocationHorizontalMm: 1.2,
        hitLocationHorizontalDirection: "RIGHT",
        hitLocationVerticalMm: 0.7,
        hitLocationVerticalDirection: "HIGH",
      },
    })
    expect(replaceSessionSeriesMock).toHaveBeenCalledWith(tx, "s1", prepared.seriesData)
    expect(syncSessionGoalsMock).toHaveBeenCalledWith(
      tx,
      "s1",
      "user-1",
      prepared.selectedGoalIds,
      true
    )
    expect(revalidatePathMock).toHaveBeenCalledWith("/sessions")
    expect(revalidatePathMock).toHaveBeenCalledWith("/sessions/s1")
    expect(revalidatePathMock).toHaveBeenCalledWith("/goals")
    expect(redirectMock).toHaveBeenCalledWith("/sessions/s1")
  })
})
