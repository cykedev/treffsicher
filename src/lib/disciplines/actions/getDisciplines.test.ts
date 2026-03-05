import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  requireAuthSessionMock,
  canManageDisciplineMock,
  findManyMock,
  findFirstMock,
  findUniqueMock,
  sessionCountMock,
  shotRoutineCountMock,
} = vi.hoisted(() => ({
  requireAuthSessionMock: vi.fn(),
  canManageDisciplineMock: vi.fn(),
  findManyMock: vi.fn(),
  findFirstMock: vi.fn(),
  findUniqueMock: vi.fn(),
  sessionCountMock: vi.fn(),
  shotRoutineCountMock: vi.fn(),
}))

vi.mock("@/lib/disciplines/actions/shared", () => ({
  requireAuthSession: requireAuthSessionMock,
  canManageDiscipline: canManageDisciplineMock,
}))

vi.mock("@/lib/db", () => ({
  db: {
    discipline: {
      findMany: findManyMock,
      findFirst: findFirstMock,
      findUnique: findUniqueMock,
    },
    trainingSession: {
      count: sessionCountMock,
    },
    shotRoutine: {
      count: shotRoutineCountMock,
    },
  },
}))

import {
  getDisciplinesAction,
  getDisciplineByIdAction,
  getDisciplineForDetailAction,
  getDisciplineUsageAction,
  getDisciplinesForManagementAction,
} from "@/lib/disciplines/actions/getDisciplines"

describe("getDisciplines actions", () => {
  beforeEach(() => {
    requireAuthSessionMock.mockReset()
    canManageDisciplineMock.mockReset()
    findManyMock.mockReset()
    findFirstMock.mockReset()
    findUniqueMock.mockReset()
    sessionCountMock.mockReset()
    shotRoutineCountMock.mockReset()
  })

  it("liefert [] ohne Session im Management", async () => {
    requireAuthSessionMock.mockResolvedValue(null)

    expect(await getDisciplinesForManagementAction()).toEqual([])
  })

  it("liefert fuer Formularlisten nur nicht archivierte Disziplinen", async () => {
    requireAuthSessionMock.mockResolvedValue({ user: { id: "u1", role: "USER" } })
    findManyMock.mockResolvedValue([])

    await getDisciplinesAction()

    expect(findManyMock).toHaveBeenCalledWith({
      where: {
        isArchived: false,
        OR: [{ isSystem: true }, { ownerId: "u1" }],
      },
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
    })
  })

  it("zeigt im Management fuer USER aktive System-Disziplinen und eigene inkl. archiviert", async () => {
    requireAuthSessionMock.mockResolvedValue({ user: { id: "u1", role: "USER" } })
    findManyMock.mockResolvedValue([])

    await getDisciplinesForManagementAction()

    expect(findManyMock).toHaveBeenCalledWith({
      where: {
        OR: [
          { isSystem: true, isArchived: false },
          { ownerId: "u1", isSystem: false },
        ],
      },
      orderBy: [{ isSystem: "desc" }, { isArchived: "asc" }, { name: "asc" }],
    })
  })

  it("zeigt im Management fuer ADMIN alle System- und eigene Disziplinen", async () => {
    requireAuthSessionMock.mockResolvedValue({ user: { id: "admin-1", role: "ADMIN" } })
    findManyMock.mockResolvedValue([])

    await getDisciplinesForManagementAction()

    expect(findManyMock).toHaveBeenCalledWith({
      where: {
        OR: [{ isSystem: true }, { ownerId: "admin-1", isSystem: false }],
      },
      orderBy: [{ isSystem: "desc" }, { isArchived: "asc" }, { name: "asc" }],
    })
  })

  it("laedt fuer USER die Detailseite auch fuer eigene archivierte Disziplinen", async () => {
    requireAuthSessionMock.mockResolvedValue({ user: { id: "u1", role: "USER" } })
    findFirstMock.mockResolvedValue({ id: "d1" })

    const result = await getDisciplineForDetailAction("d1")

    expect(result).toEqual({ id: "d1" })
    expect(findFirstMock).toHaveBeenCalledWith({
      where: {
        id: "d1",
        OR: [
          { isSystem: true, isArchived: false },
          { ownerId: "u1", isSystem: false },
        ],
      },
    })
  })

  it("laedt fuer USER Bearbeiten auch fuer eigene archivierte Disziplinen", async () => {
    requireAuthSessionMock.mockResolvedValue({ user: { id: "u1", role: "USER" } })
    findFirstMock.mockResolvedValue({ id: "d1" })

    await getDisciplineByIdAction("d1")

    expect(findFirstMock).toHaveBeenCalledWith({
      where: {
        id: "d1",
        ownerId: "u1",
        isSystem: false,
      },
    })
  })

  it("liefert Usage nur bei Berechtigung und berechnet canDelete", async () => {
    requireAuthSessionMock.mockResolvedValue({ user: { id: "u1", role: "USER" } })
    findUniqueMock.mockResolvedValue({ id: "d1", ownerId: "u1", isSystem: false })
    canManageDisciplineMock.mockReturnValue(true)
    sessionCountMock.mockResolvedValue(0)
    shotRoutineCountMock.mockResolvedValue(2)

    const result = await getDisciplineUsageAction("d1")

    expect(result).toEqual({
      sessionCount: 0,
      shotRoutineCount: 2,
      canDelete: false,
    })
  })
})
