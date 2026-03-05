import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import {
  ensureOwnedGoal,
  parseGoalInput,
  requireGoalSession,
  revalidateGoalPaths,
} from "@/lib/goals/actions/shared"
import type { GoalActionResult } from "@/lib/goals/types"

async function createGoalForUser(userId: string, formData: FormData): Promise<GoalActionResult> {
  const input = parseGoalInput(formData, "create")
  if ("error" in input) return input

  await db.goal.create({
    data: {
      userId,
      title: input.title,
      description: input.description,
      type: input.type,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
    },
  })

  return { success: true }
}

export async function createGoalAction(formData: FormData): Promise<GoalActionResult> {
  const session = await requireGoalSession()
  if (!session) return { error: "Nicht angemeldet" }

  const result = await createGoalForUser(session.user.id, formData)
  if ("error" in result) return result

  revalidateGoalPaths()
  return { success: true }
}

export async function createGoalAndRedirectAction(formData: FormData): Promise<void> {
  const session = await requireGoalSession()
  if (!session) redirect("/login")

  const result = await createGoalForUser(session.user.id, formData)
  if ("error" in result) {
    const message = encodeURIComponent(result.error)
    redirect(`/goals/new?error=${message}`)
  }

  revalidateGoalPaths()
  redirect("/goals")
}

export async function updateGoalAction(
  goalId: string,
  formData: FormData
): Promise<GoalActionResult> {
  const session = await requireGoalSession()
  if (!session) return { error: "Nicht angemeldet" }

  const goal = await ensureOwnedGoal(goalId, session.user.id)
  if (!goal) return { error: "Ziel nicht gefunden" }

  const input = parseGoalInput(formData, "update")
  if ("error" in input) return input

  await db.goal.update({
    where: { id: goalId },
    data: {
      title: input.title,
      description: input.description,
      type: input.type,
      dateFrom: input.dateFrom,
      dateTo: input.dateTo,
    },
  })

  revalidateGoalPaths()
  return { success: true }
}

export async function updateGoalAssignmentsAction(
  goalId: string,
  formData: FormData
): Promise<GoalActionResult> {
  const session = await requireGoalSession()
  if (!session) return { error: "Nicht angemeldet" }

  const goal = await ensureOwnedGoal(goalId, session.user.id)
  if (!goal) return { error: "Ziel nicht gefunden" }

  const selectedIds = [
    ...new Set(
      formData
        .getAll("sessionIds")
        .filter((value): value is string => typeof value === "string" && value.length > 0)
    ),
  ]

  let validSessionIds: string[] = []
  if (selectedIds.length > 0) {
    const ownedSessions = await db.trainingSession.findMany({
      where: {
        id: { in: selectedIds },
        userId: session.user.id,
      },
      select: { id: true },
    })
    validSessionIds = ownedSessions.map((entry) => entry.id)
  }

  await db.$transaction(async (tx) => {
    // Zuweisungen bewusst als "replace set" behandeln, damit UI und DB exakt denselben Zustand sehen.
    await tx.sessionGoal.deleteMany({ where: { goalId } })

    if (validSessionIds.length > 0) {
      await tx.sessionGoal.createMany({
        data: validSessionIds.map((sessionId) => ({ goalId, sessionId })),
        skipDuplicates: true,
      })
    }
  })

  revalidateGoalPaths()
  return { success: true }
}

export async function deleteGoalAction(goalId: string): Promise<GoalActionResult> {
  const session = await requireGoalSession()
  if (!session) return { error: "Nicht angemeldet" }

  const goal = await ensureOwnedGoal(goalId, session.user.id)
  if (!goal) return { error: "Ziel nicht gefunden" }

  await db.goal.delete({ where: { id: goalId } })
  revalidateGoalPaths()
  return { success: true }
}
