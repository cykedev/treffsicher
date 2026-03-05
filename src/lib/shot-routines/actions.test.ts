import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  revalidatePathMock,
  redirectMock,
  getAuthSessionMock,
  findManyMock,
  findFirstMock,
  createMock,
  updateMock,
  deleteMock,
} = vi.hoisted(() => ({
  revalidatePathMock: vi.fn(),
  redirectMock: vi.fn(),
  getAuthSessionMock: vi.fn(),
  findManyMock: vi.fn(),
  findFirstMock: vi.fn(),
  createMock: vi.fn(),
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
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
    shotRoutine: {
      findMany: findManyMock,
      findFirst: findFirstMock,
      create: createMock,
      update: updateMock,
      delete: deleteMock,
    },
  },
}))

import {
  createShotRoutine,
  deleteShotRoutine,
  getShotRoutineById,
  getShotRoutines,
  updateShotRoutine,
} from "@/lib/shot-routines/actions"

function buildRoutineFormData(name: string, stepsRaw: string): FormData {
  const formData = new FormData()
  formData.set("name", name)
  formData.set("steps", stepsRaw)
  return formData
}

describe("shot-routines actions", () => {
  beforeEach(() => {
    revalidatePathMock.mockReset()
    redirectMock.mockReset()
    getAuthSessionMock.mockReset()
    findManyMock.mockReset()
    findFirstMock.mockReset()
    createMock.mockReset()
    updateMock.mockReset()
    deleteMock.mockReset()
    redirectMock.mockImplementation((path: string) => {
      throw new Error(`REDIRECT:${path}`)
    })
  })

  it("getShotRoutines liefert [] ohne Session und scoped Query mit Session", async () => {
    getAuthSessionMock.mockResolvedValueOnce(null)
    expect(await getShotRoutines()).toEqual([])

    getAuthSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } })
    findManyMock.mockResolvedValueOnce([{ id: "r1" }, { id: "r2" }])
    const result = await getShotRoutines()

    expect(result).toEqual([{ id: "r1" }, { id: "r2" }])
    expect(findManyMock).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      orderBy: { createdAt: "asc" },
    })
  })

  it("getShotRoutineById liefert null ohne Session und scoped Treffer mit Session", async () => {
    getAuthSessionMock.mockResolvedValueOnce(null)
    expect(await getShotRoutineById("r1")).toBeNull()

    getAuthSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } })
    findFirstMock.mockResolvedValueOnce({ id: "r1" })
    expect(await getShotRoutineById("r1")).toEqual({ id: "r1" })
    expect(findFirstMock).toHaveBeenCalledWith({
      where: { id: "r1", userId: "user-1" },
    })
  })

  it("createShotRoutine gibt Auth- und Validierungsfehler zurueck", async () => {
    getAuthSessionMock.mockResolvedValueOnce(null)
    expect(await createShotRoutine(null, buildRoutineFormData("A", "[]"))).toEqual({
      error: "Nicht angemeldet",
    })

    getAuthSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } })
    expect(await createShotRoutine(null, buildRoutineFormData("A", "invalid-json"))).toEqual({
      error: "Schritte sind ungültig",
    })
  })

  it("createShotRoutine erstellt Routine, invalidiert Cache und redirectet", async () => {
    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } })
    createMock.mockResolvedValue({ id: "routine-77" })

    const promise = createShotRoutine(
      null,
      buildRoutineFormData("Vor Schuss", JSON.stringify([{ order: 1, title: "Atmen" }]))
    )

    await expect(promise).rejects.toThrow("REDIRECT:/shot-routines/routine-77")
    expect(createMock).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        name: "Vor Schuss",
        steps: [{ order: 1, title: "Atmen" }],
      },
    })
    expect(revalidatePathMock).toHaveBeenCalledWith("/shot-routines")
    expect(redirectMock).toHaveBeenCalledWith("/shot-routines/routine-77")
  })

  it("updateShotRoutine prueft Auth, Ownership und validiert Schritte", async () => {
    const formData = buildRoutineFormData("Routine", JSON.stringify([{ order: 1, title: "Fokus" }]))

    getAuthSessionMock.mockResolvedValueOnce(null)
    expect(await updateShotRoutine("r1", null, formData)).toEqual({ error: "Nicht angemeldet" })

    getAuthSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } })
    findFirstMock.mockResolvedValueOnce(null)
    expect(await updateShotRoutine("r1", null, formData)).toEqual({
      error: "Ablauf nicht gefunden",
    })

    getAuthSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } })
    findFirstMock.mockResolvedValueOnce({ id: "r1", userId: "user-1" })
    expect(await updateShotRoutine("r1", null, buildRoutineFormData("", "[]"))).toEqual({
      error: "Name ist erforderlich",
    })
  })

  it("updateShotRoutine schreibt Daten und revalidiert Listen- und Detailpfad", async () => {
    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } })
    findFirstMock.mockResolvedValue({ id: "r1", userId: "user-1" })
    updateMock.mockResolvedValue({})

    const result = await updateShotRoutine(
      "r1",
      null,
      buildRoutineFormData(
        "Nach Schuss",
        JSON.stringify([
          { order: 1, title: "Analyse" },
          { order: 2, title: "Reset", description: "Kurz entspannen" },
        ])
      )
    )

    expect(result).toEqual({ success: true })
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: {
        name: "Nach Schuss",
        steps: [
          { order: 1, title: "Analyse" },
          { order: 2, title: "Reset", description: "Kurz entspannen" },
        ],
      },
    })
    expect(revalidatePathMock).toHaveBeenCalledWith("/shot-routines")
    expect(revalidatePathMock).toHaveBeenCalledWith("/shot-routines/r1")
  })

  it("deleteShotRoutine prueft Ownership und loescht danach", async () => {
    getAuthSessionMock.mockResolvedValueOnce(null)
    expect(await deleteShotRoutine("r1")).toEqual({ error: "Nicht angemeldet" })

    getAuthSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } })
    findFirstMock.mockResolvedValueOnce(null)
    expect(await deleteShotRoutine("r1")).toEqual({ error: "Ablauf nicht gefunden" })

    getAuthSessionMock.mockResolvedValueOnce({ user: { id: "user-1" } })
    findFirstMock.mockResolvedValueOnce({ id: "r1" })
    deleteMock.mockResolvedValueOnce({})
    expect(await deleteShotRoutine("r1")).toEqual({ success: true })
    expect(deleteMock).toHaveBeenCalledWith({ where: { id: "r1" } })
    expect(revalidatePathMock).toHaveBeenCalledWith("/shot-routines")
  })
})
