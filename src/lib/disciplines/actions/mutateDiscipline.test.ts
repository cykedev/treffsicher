import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  requireAuthSessionMock,
  canManageDisciplineMock,
  revalidateDisciplinePathsMock,
  findUniqueMock,
  deleteMock,
  updateManyMock,
  trainingSessionCountMock,
  shotRoutineCountMock,
  transactionMock,
} = vi.hoisted(() => ({
  requireAuthSessionMock: vi.fn(),
  canManageDisciplineMock: vi.fn(),
  revalidateDisciplinePathsMock: vi.fn(),
  findUniqueMock: vi.fn(),
  deleteMock: vi.fn(),
  updateManyMock: vi.fn(),
  trainingSessionCountMock: vi.fn(),
  shotRoutineCountMock: vi.fn(),
  transactionMock: vi.fn(),
}))

vi.mock("@/lib/disciplines/actions/shared", () => ({
  canManageDiscipline: canManageDisciplineMock,
  mapValidationErrors: vi.fn(),
  parseDisciplineFormData: vi.fn(),
  revalidateDisciplinePaths: revalidateDisciplinePathsMock,
  requireAuthSession: requireAuthSessionMock,
}))

vi.mock("@/lib/db", () => ({
  db: {
    discipline: {
      findUnique: findUniqueMock,
      delete: deleteMock,
    },
    user: {
      updateMany: updateManyMock,
    },
    trainingSession: {
      count: trainingSessionCountMock,
    },
    shotRoutine: {
      count: shotRoutineCountMock,
    },
    $transaction: transactionMock,
  },
}))

import { deleteDisciplineAction } from "@/lib/disciplines/actions/mutateDiscipline"

describe("deleteDisciplineAction", () => {
  beforeEach(() => {
    requireAuthSessionMock.mockReset()
    canManageDisciplineMock.mockReset()
    revalidateDisciplinePathsMock.mockReset()
    findUniqueMock.mockReset()
    deleteMock.mockReset()
    updateManyMock.mockReset()
    trainingSessionCountMock.mockReset()
    shotRoutineCountMock.mockReset()
    transactionMock.mockReset()
    transactionMock.mockImplementation(async (operations: unknown) => {
      if (Array.isArray(operations)) {
        return Promise.all(operations as Promise<unknown>[])
      }
      return []
    })
  })

  it("liefert Fehler ohne Session", async () => {
    requireAuthSessionMock.mockResolvedValue(null)

    const result = await deleteDisciplineAction("d1")

    expect(result).toEqual({ error: "Nicht angemeldet" })
  })

  it("liefert Fehler ohne Berechtigung", async () => {
    requireAuthSessionMock.mockResolvedValue({ user: { id: "u1", role: "USER" } })
    findUniqueMock.mockResolvedValue({ id: "d1", ownerId: "u2", isSystem: false })
    canManageDisciplineMock.mockReturnValue(false)

    const result = await deleteDisciplineAction("d1")

    expect(result).toEqual({ error: "Disziplin nicht gefunden oder keine Berechtigung." })
  })

  it("blockiert Loeschen sobald die Disziplin noch verwendet wird", async () => {
    requireAuthSessionMock.mockResolvedValue({ user: { id: "u1", role: "USER" } })
    findUniqueMock.mockResolvedValue({ id: "d1", ownerId: "u1", isSystem: false })
    canManageDisciplineMock.mockReturnValue(true)
    trainingSessionCountMock.mockResolvedValue(1)
    shotRoutineCountMock.mockResolvedValue(0)

    const result = await deleteDisciplineAction("d1")

    expect(result).toEqual({
      error:
        "Disziplin kann nicht gelöscht werden, solange sie in Einheiten oder Abläufen verwendet wird.",
    })
    expect(transactionMock).not.toHaveBeenCalled()
  })

  it("loescht ungenutzte Disziplinen inkl. Favoriten-Bereinigung", async () => {
    requireAuthSessionMock.mockResolvedValue({ user: { id: "u1", role: "USER" } })
    findUniqueMock.mockResolvedValue({ id: "d1", ownerId: "u1", isSystem: false })
    canManageDisciplineMock.mockReturnValue(true)
    trainingSessionCountMock.mockResolvedValue(0)
    shotRoutineCountMock.mockResolvedValue(0)
    updateManyMock.mockResolvedValue({ count: 1 })
    deleteMock.mockResolvedValue({})

    const result = await deleteDisciplineAction("d1")

    expect(result).toEqual({ success: true })
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { favouriteDisciplineId: "d1" },
      data: { favouriteDisciplineId: null },
    })
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "d1" } })
    expect(revalidateDisciplinePathsMock).toHaveBeenCalled()
  })
})
