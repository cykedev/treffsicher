"use server"

import {
  getGoalByIdAction,
  getGoalsForSelectionAction,
  getGoalsWithAssignmentsAction,
  getGoalSessionOptionsAction,
} from "@/lib/goals/actions/getGoals"
import {
  createGoalAction,
  createGoalAndRedirectAction,
  deleteGoalAction,
  updateGoalAction,
  updateGoalAssignmentsAction,
} from "@/lib/goals/actions/mutateGoals"
import type {
  GoalActionResult,
  GoalForSelection,
  GoalSessionOption,
  GoalWithAssignments,
} from "@/lib/goals/types"

export type {
  GoalActionResult,
  GoalForSelection,
  GoalSessionOption,
  GoalWithAssignments,
} from "@/lib/goals/types"

// Öffentliche Goal-Fassade bündelt Query- und Mutationspfade für UI und Server Components.
export async function getGoalsWithAssignments(): Promise<GoalWithAssignments[]> {
  return getGoalsWithAssignmentsAction()
}

export async function getGoalById(goalId: string): Promise<GoalWithAssignments | null> {
  return getGoalByIdAction(goalId)
}

export async function getGoalSessionOptions(): Promise<GoalSessionOption[]> {
  return getGoalSessionOptionsAction()
}

export async function getGoalsForSelection(): Promise<GoalForSelection[]> {
  return getGoalsForSelectionAction()
}

export async function createGoal(formData: FormData): Promise<GoalActionResult> {
  return createGoalAction(formData)
}

export async function createGoalAndRedirect(formData: FormData): Promise<void> {
  return createGoalAndRedirectAction(formData)
}

export async function updateGoal(goalId: string, formData: FormData): Promise<GoalActionResult> {
  return updateGoalAction(goalId, formData)
}

export async function updateGoalAssignments(
  goalId: string,
  formData: FormData
): Promise<GoalActionResult> {
  return updateGoalAssignmentsAction(goalId, formData)
}

export async function deleteGoal(goalId: string): Promise<GoalActionResult> {
  return deleteGoalAction(goalId)
}
