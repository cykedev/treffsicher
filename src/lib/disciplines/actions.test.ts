import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  setFavouriteDisciplineActionMock,
  getDisciplineByIdActionMock,
  getDisciplineForDetailActionMock,
  getDisciplineUsageActionMock,
  getDisciplinesActionMock,
  getDisciplinesForManagementActionMock,
  getFavouriteDisciplineIdActionMock,
  archiveDisciplineActionMock,
  createDisciplineActionMock,
  deleteDisciplineActionMock,
  setDisciplineArchivedActionMock,
  updateDisciplineActionMock,
} = vi.hoisted(() => ({
  setFavouriteDisciplineActionMock: vi.fn(),
  getDisciplineByIdActionMock: vi.fn(),
  getDisciplineForDetailActionMock: vi.fn(),
  getDisciplineUsageActionMock: vi.fn(),
  getDisciplinesActionMock: vi.fn(),
  getDisciplinesForManagementActionMock: vi.fn(),
  getFavouriteDisciplineIdActionMock: vi.fn(),
  archiveDisciplineActionMock: vi.fn(),
  createDisciplineActionMock: vi.fn(),
  deleteDisciplineActionMock: vi.fn(),
  setDisciplineArchivedActionMock: vi.fn(),
  updateDisciplineActionMock: vi.fn(),
}))

vi.mock("@/lib/disciplines/actions/favouriteDiscipline", () => ({
  setFavouriteDisciplineAction: setFavouriteDisciplineActionMock,
}))

vi.mock("@/lib/disciplines/actions/getDisciplines", () => ({
  getDisciplineByIdAction: getDisciplineByIdActionMock,
  getDisciplineForDetailAction: getDisciplineForDetailActionMock,
  getDisciplineUsageAction: getDisciplineUsageActionMock,
  getDisciplinesAction: getDisciplinesActionMock,
  getDisciplinesForManagementAction: getDisciplinesForManagementActionMock,
  getFavouriteDisciplineIdAction: getFavouriteDisciplineIdActionMock,
}))

vi.mock("@/lib/disciplines/actions/mutateDiscipline", () => ({
  archiveDisciplineAction: archiveDisciplineActionMock,
  createDisciplineAction: createDisciplineActionMock,
  deleteDisciplineAction: deleteDisciplineActionMock,
  setDisciplineArchivedAction: setDisciplineArchivedActionMock,
  updateDisciplineAction: updateDisciplineActionMock,
}))

import {
  archiveDiscipline,
  createDiscipline,
  deleteDiscipline,
  getDisciplineById,
  getDisciplineForDetail,
  getDisciplineUsage,
  getDisciplines,
  getDisciplinesForManagement,
  getFavouriteDisciplineId,
  setDisciplineArchived,
  setFavouriteDiscipline,
  updateDiscipline,
} from "@/lib/disciplines/actions"

describe("disciplines actions facade", () => {
  beforeEach(() => {
    setFavouriteDisciplineActionMock.mockReset()
    getDisciplineByIdActionMock.mockReset()
    getDisciplineForDetailActionMock.mockReset()
    getDisciplineUsageActionMock.mockReset()
    getDisciplinesActionMock.mockReset()
    getDisciplinesForManagementActionMock.mockReset()
    getFavouriteDisciplineIdActionMock.mockReset()
    archiveDisciplineActionMock.mockReset()
    createDisciplineActionMock.mockReset()
    deleteDisciplineActionMock.mockReset()
    setDisciplineArchivedActionMock.mockReset()
    updateDisciplineActionMock.mockReset()
  })

  it("delegiert lesende Funktionen", async () => {
    getDisciplinesActionMock.mockResolvedValue([{ id: "d1" }])
    getDisciplinesForManagementActionMock.mockResolvedValue([{ id: "d2" }])
    getDisciplineForDetailActionMock.mockResolvedValue({ id: "d3" })
    getDisciplineByIdActionMock.mockResolvedValue({ id: "d4" })
    getDisciplineUsageActionMock.mockResolvedValue({ canDelete: true })
    getFavouriteDisciplineIdActionMock.mockResolvedValue("d1")

    expect(await getDisciplines()).toEqual([{ id: "d1" }])
    expect(await getDisciplinesForManagement()).toEqual([{ id: "d2" }])
    expect(await getDisciplineForDetail("d3")).toEqual({ id: "d3" })
    expect(await getDisciplineById("d4")).toEqual({ id: "d4" })
    expect(await getDisciplineUsage("d4")).toEqual({ canDelete: true })
    expect(await getFavouriteDisciplineId()).toBe("d1")
  })

  it("delegiert mutierende Funktionen", async () => {
    const formData = new FormData()
    formData.set("name", "Luftpistole")
    setFavouriteDisciplineActionMock.mockResolvedValue({ success: true })
    createDisciplineActionMock.mockResolvedValue({ success: true })
    updateDisciplineActionMock.mockResolvedValue({ success: true })
    archiveDisciplineActionMock.mockResolvedValue({ success: true })
    deleteDisciplineActionMock.mockResolvedValue({ success: true })
    setDisciplineArchivedActionMock.mockResolvedValue({ success: true })

    expect(await setFavouriteDiscipline("d1")).toEqual({ success: true })
    expect(await createDiscipline(null, formData)).toEqual({ success: true })
    expect(await updateDiscipline("d1", null, formData)).toEqual({ success: true })
    expect(await archiveDiscipline("d1")).toEqual({ success: true })
    expect(await deleteDiscipline("d1")).toEqual({ success: true })
    expect(await setDisciplineArchived("d1", true)).toEqual({ success: true })
  })
})
