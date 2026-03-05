import { beforeEach, describe, expect, it, vi } from "vitest"

const {
  getGoalByIdActionMock,
  getGoalsForSelectionActionMock,
  getGoalsWithAssignmentsActionMock,
  getGoalSessionOptionsActionMock,
  createGoalActionMock,
  createGoalAndRedirectActionMock,
  deleteGoalActionMock,
  updateGoalActionMock,
  updateGoalAssignmentsActionMock,
} = vi.hoisted(() => ({
  getGoalByIdActionMock: vi.fn(),
  getGoalsForSelectionActionMock: vi.fn(),
  getGoalsWithAssignmentsActionMock: vi.fn(),
  getGoalSessionOptionsActionMock: vi.fn(),
  createGoalActionMock: vi.fn(),
  createGoalAndRedirectActionMock: vi.fn(),
  deleteGoalActionMock: vi.fn(),
  updateGoalActionMock: vi.fn(),
  updateGoalAssignmentsActionMock: vi.fn(),
}))

vi.mock("@/lib/goals/actions/getGoals", () => ({
  getGoalByIdAction: getGoalByIdActionMock,
  getGoalsForSelectionAction: getGoalsForSelectionActionMock,
  getGoalsWithAssignmentsAction: getGoalsWithAssignmentsActionMock,
  getGoalSessionOptionsAction: getGoalSessionOptionsActionMock,
}))

vi.mock("@/lib/goals/actions/mutateGoals", () => ({
  createGoalAction: createGoalActionMock,
  createGoalAndRedirectAction: createGoalAndRedirectActionMock,
  deleteGoalAction: deleteGoalActionMock,
  updateGoalAction: updateGoalActionMock,
  updateGoalAssignmentsAction: updateGoalAssignmentsActionMock,
}))

import {
  createGoal,
  createGoalAndRedirect,
  deleteGoal,
  getGoalById,
  getGoalsForSelection,
  getGoalsWithAssignments,
  getGoalSessionOptions,
  updateGoal,
  updateGoalAssignments,
} from "@/lib/goals/actions"

describe("goals actions facade", () => {
  beforeEach(() => {
    getGoalByIdActionMock.mockReset()
    getGoalsForSelectionActionMock.mockReset()
    getGoalsWithAssignmentsActionMock.mockReset()
    getGoalSessionOptionsActionMock.mockReset()
    createGoalActionMock.mockReset()
    createGoalAndRedirectActionMock.mockReset()
    deleteGoalActionMock.mockReset()
    updateGoalActionMock.mockReset()
    updateGoalAssignmentsActionMock.mockReset()
  })

  it("delegiert lesende Funktionen", async () => {
    getGoalsWithAssignmentsActionMock.mockResolvedValue([{ id: "g1" }])
    getGoalByIdActionMock.mockResolvedValue({ id: "g2" })
    getGoalSessionOptionsActionMock.mockResolvedValue([{ id: "s1" }])
    getGoalsForSelectionActionMock.mockResolvedValue([{ id: "g3" }])

    expect(await getGoalsWithAssignments()).toEqual([{ id: "g1" }])
    expect(await getGoalById("g2")).toEqual({ id: "g2" })
    expect(await getGoalSessionOptions()).toEqual([{ id: "s1" }])
    expect(await getGoalsForSelection()).toEqual([{ id: "g3" }])
  })

  it("delegiert mutierende Funktionen", async () => {
    const formData = new FormData()
    formData.set("title", "Saisonziel")
    createGoalActionMock.mockResolvedValue({ success: true })
    createGoalAndRedirectActionMock.mockResolvedValue(undefined)
    updateGoalActionMock.mockResolvedValue({ success: true })
    updateGoalAssignmentsActionMock.mockResolvedValue({ success: true })
    deleteGoalActionMock.mockResolvedValue({ success: true })

    expect(await createGoal(formData)).toEqual({ success: true })
    await createGoalAndRedirect(formData)
    expect(await updateGoal("g1", formData)).toEqual({ success: true })
    expect(await updateGoalAssignments("g1", formData)).toEqual({ success: true })
    expect(await deleteGoal("g1")).toEqual({ success: true })
  })
})
