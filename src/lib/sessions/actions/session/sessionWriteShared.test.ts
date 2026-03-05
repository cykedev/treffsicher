import { describe, expect, it, vi } from "vitest"
import {
  buildSessionWriteData,
  createSessionSeries,
  replaceSessionSeries,
  syncSessionGoals,
  type PreparedSessionWriteInput,
} from "@/lib/sessions/actions/session/sessionWriteShared"

function createTxMock() {
  return {
    series: {
      createMany: vi.fn(async () => undefined),
      deleteMany: vi.fn(async () => undefined),
    },
    sessionGoal: {
      deleteMany: vi.fn(async () => undefined),
      createMany: vi.fn(async () => undefined),
    },
    goal: {
      findMany: vi.fn(async (): Promise<Array<{ id: string }>> => []),
    },
  }
}

describe("buildSessionWriteData", () => {
  it("mappt optionale Felder konsistent auf null", () => {
    const input: PreparedSessionWriteInput = {
      parsed: {
        type: "TRAINING",
        date: "2026-03-05T10:15",
        location: undefined,
        disciplineId: undefined,
        trainingGoal: "",
      },
      sessionDate: new Date("2026-03-05T10:15:00.000Z"),
      disciplineId: null,
      seriesData: [],
      selectedGoalIds: [],
      hitLocationInput: null,
    }

    expect(buildSessionWriteData(input)).toEqual({
      type: "TRAINING",
      date: new Date("2026-03-05T10:15:00.000Z"),
      location: null,
      disciplineId: null,
      trainingGoal: null,
      hitLocationHorizontalMm: null,
      hitLocationHorizontalDirection: null,
      hitLocationVerticalMm: null,
      hitLocationVerticalDirection: null,
    })
  })

  it("uebernimmt Trefferlagewerte wenn vorhanden", () => {
    const input: PreparedSessionWriteInput = {
      parsed: {
        type: "WETTKAMPF",
        date: "2026-03-05T10:15",
        location: "Stand A",
        disciplineId: "disc-1",
        trainingGoal: "Fokus",
      },
      sessionDate: new Date("2026-03-05T10:15:00.000Z"),
      disciplineId: "disc-1",
      seriesData: [],
      selectedGoalIds: [],
      hitLocationInput: {
        horizontalMm: 2.3,
        horizontalDirection: "RIGHT",
        verticalMm: 1.2,
        verticalDirection: "LOW",
      },
    }

    expect(buildSessionWriteData(input)).toMatchObject({
      location: "Stand A",
      disciplineId: "disc-1",
      trainingGoal: "Fokus",
      hitLocationHorizontalMm: 2.3,
      hitLocationHorizontalDirection: "RIGHT",
      hitLocationVerticalMm: 1.2,
      hitLocationVerticalDirection: "LOW",
    })
  })
})

describe("createSessionSeries", () => {
  it("schreibt nichts bei leerem Serienarray", async () => {
    const tx = createTxMock()
    await createSessionSeries(tx as never, "session-1", [])
    expect(tx.series.createMany).not.toHaveBeenCalled()
  })

  it("mapped Seriendaten in ein createMany payload", async () => {
    const tx = createTxMock()
    await createSessionSeries(tx as never, "session-1", [
      {
        position: 1,
        isPractice: false,
        scoreTotal: "98",
        shots: ["10.0", "9.8"],
        executionQuality: 4,
      },
      {
        position: 2,
        isPractice: true,
        scoreTotal: null,
        shots: null,
        executionQuality: null,
      },
    ])

    expect(tx.series.createMany).toHaveBeenCalledWith({
      data: [
        {
          sessionId: "session-1",
          position: 1,
          isPractice: false,
          scoreTotal: "98",
          shots: ["10.0", "9.8"],
          executionQuality: 4,
        },
        {
          sessionId: "session-1",
          position: 2,
          isPractice: true,
          scoreTotal: null,
          shots: undefined,
          executionQuality: null,
        },
      ],
    })
  })
})

describe("replaceSessionSeries", () => {
  it("loescht zuerst alte Serien und schreibt dann neue", async () => {
    const tx = createTxMock()
    await replaceSessionSeries(
      tx as never,
      "session-1",
      [{ position: 1, isPractice: false, scoreTotal: "90", shots: null, executionQuality: null }]
    )

    expect(tx.series.deleteMany).toHaveBeenCalledWith({ where: { sessionId: "session-1" } })
    expect(tx.series.createMany).toHaveBeenCalledTimes(1)
    expect(tx.series.deleteMany.mock.invocationCallOrder[0]).toBeLessThan(
      tx.series.createMany.mock.invocationCallOrder[0]
    )
  })
})

describe("syncSessionGoals", () => {
  it("leert bei clearExisting=true auch ohne neue Zielauswahl", async () => {
    const tx = createTxMock()
    await syncSessionGoals(tx as never, "session-1", "user-1", [], true)

    expect(tx.sessionGoal.deleteMany).toHaveBeenCalledWith({ where: { sessionId: "session-1" } })
    expect(tx.goal.findMany).not.toHaveBeenCalled()
    expect(tx.sessionGoal.createMany).not.toHaveBeenCalled()
  })

  it("schreibt nur validierte Ziele", async () => {
    const tx = createTxMock()
    tx.goal.findMany.mockResolvedValue([{ id: "goal-a" }, { id: "goal-b" }])

    await syncSessionGoals(tx as never, "session-1", "user-1", ["goal-a", "goal-b", "goal-x"], false)

    expect(tx.goal.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ["goal-a", "goal-b", "goal-x"] },
        userId: "user-1",
      },
      select: { id: true },
    })
    expect(tx.sessionGoal.createMany).toHaveBeenCalledWith({
      data: [
        { sessionId: "session-1", goalId: "goal-a" },
        { sessionId: "session-1", goalId: "goal-b" },
      ],
      skipDuplicates: true,
    })
  })

  it("schreibt nichts wenn keine gueltigen Ziele gefunden werden", async () => {
    const tx = createTxMock()
    tx.goal.findMany.mockResolvedValue([])

    await syncSessionGoals(tx as never, "session-1", "user-1", ["missing"], false)

    expect(tx.goal.findMany).toHaveBeenCalledTimes(1)
    expect(tx.sessionGoal.createMany).not.toHaveBeenCalled()
  })
})
