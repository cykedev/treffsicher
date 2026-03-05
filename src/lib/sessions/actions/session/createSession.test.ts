import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  revalidatePathMock,
  redirectMock,
  getAuthSessionMock,
  transactionMock,
  prepareSessionWriteInputMock,
  buildSessionWriteDataMock,
  createSessionSeriesMock,
  syncSessionGoalsMock,
} = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
  redirectMock: vi.fn(),
  getAuthSessionMock: vi.fn(),
  transactionMock: vi.fn(),
  prepareSessionWriteInputMock: vi.fn(),
  buildSessionWriteDataMock: vi.fn(),
  createSessionSeriesMock: vi.fn(),
  syncSessionGoalsMock: vi.fn(),
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
    $transaction: transactionMock,
  },
}))

vi.mock("@/lib/sessions/actions/session/sessionWriteShared", () => ({
  prepareSessionWriteInput: prepareSessionWriteInputMock,
  buildSessionWriteData: buildSessionWriteDataMock,
  createSessionSeries: createSessionSeriesMock,
  syncSessionGoals: syncSessionGoalsMock,
}))

import { createSessionAction } from "@/lib/sessions/actions/session/createSession"

describe("createSessionAction", () => {
  beforeEach(() => {
    revalidatePathMock.mockReset()
    redirectMock.mockReset()
    getAuthSessionMock.mockReset()
    transactionMock.mockReset()
    prepareSessionWriteInputMock.mockReset()
    buildSessionWriteDataMock.mockReset()
    createSessionSeriesMock.mockReset()
    syncSessionGoalsMock.mockReset()
    redirectMock.mockImplementation((path: string) => {
      throw new Error(`REDIRECT:${path}`)
    })
  })

  it("liefert Fehler wenn kein Login vorhanden ist", async () => {
    getAuthSessionMock.mockResolvedValue(null)

    const result = await createSessionAction(new FormData())

    expect(result).toEqual({ error: "Nicht angemeldet" })
    expect(prepareSessionWriteInputMock).not.toHaveBeenCalled()
  })

  it("gibt Vorbereitungsfehler unveraendert zurueck", async () => {
    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } })
    prepareSessionWriteInputMock.mockResolvedValue({ error: "Bitte Pflichtfelder pruefen." })
    const formData = new FormData()

    const result = await createSessionAction(formData)

    expect(result).toEqual({ error: "Bitte Pflichtfelder pruefen." })
    expect(prepareSessionWriteInputMock).toHaveBeenCalledWith(formData, "user-1", {
      action: "createSession",
    })
  })

  it("legt Einheit + Serien + Zielzuordnung an und redirectet", async () => {
    const formData = new FormData()
    const prepared = {
      parsed: { type: "TRAINING", location: "Halle", trainingGoal: "" },
      sessionDate: new Date("2026-03-05T18:00:00.000Z"),
      disciplineId: "disc-1",
      seriesData: [{ position: 1, isPractice: false, scoreTotal: "95", shots: ["10"], executionQuality: 4 }],
      selectedGoalIds: ["goal-1"],
      hitLocationInput: null,
    }
    const tx = {
      trainingSession: {
        create: vi.fn().mockResolvedValue({ id: "session-7" }),
      },
    }

    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } })
    prepareSessionWriteInputMock.mockResolvedValue(prepared)
    buildSessionWriteDataMock.mockReturnValue({
      type: "TRAINING",
      date: prepared.sessionDate,
      location: "Halle",
      disciplineId: "disc-1",
      trainingGoal: null,
      hitLocationHorizontalMm: null,
      hitLocationHorizontalDirection: null,
      hitLocationVerticalMm: null,
      hitLocationVerticalDirection: null,
    })
    transactionMock.mockImplementation(async (fn: (transactionClient: unknown) => Promise<unknown>) =>
      fn(tx)
    )

    const promise = createSessionAction(formData)

    await expect(promise).rejects.toThrow("REDIRECT:/sessions/session-7")
    expect(prepareSessionWriteInputMock).toHaveBeenCalledWith(formData, "user-1", {
      action: "createSession",
    })
    expect(tx.trainingSession.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        type: "TRAINING",
        date: prepared.sessionDate,
        location: "Halle",
        disciplineId: "disc-1",
        trainingGoal: null,
        hitLocationHorizontalMm: null,
        hitLocationHorizontalDirection: null,
        hitLocationVerticalMm: null,
        hitLocationVerticalDirection: null,
      },
    })
    expect(createSessionSeriesMock).toHaveBeenCalledWith(tx, "session-7", prepared.seriesData)
    expect(syncSessionGoalsMock).toHaveBeenCalledWith(
      tx,
      "session-7",
      "user-1",
      prepared.selectedGoalIds,
      false
    )
    expect(revalidatePathMock).toHaveBeenCalledWith("/sessions")
    expect(revalidatePathMock).toHaveBeenCalledWith("/goals")
    expect(redirectMock).toHaveBeenCalledWith("/sessions/session-7")
  })
})
