import { db } from "@/lib/db"
import {
  mapGoalWithAssignments,
  requireGoalSession,
} from "@/lib/goals/actions/shared"
import type { GoalForSelection, GoalSessionOption, GoalWithAssignments } from "@/lib/goals/types"

export async function getGoalsWithAssignmentsAction(): Promise<GoalWithAssignments[]> {
  const session = await requireGoalSession()
  if (!session) return []

  const goals = await db.goal.findMany({
    where: { userId: session.user.id },
    include: {
      sessions: { select: { sessionId: true } },
      _count: { select: { sessions: true } },
    },
    orderBy: [{ dateFrom: "asc" }, { createdAt: "asc" }],
  })

  return goals.map((goal) => mapGoalWithAssignments(goal))
}

export async function getGoalByIdAction(goalId: string): Promise<GoalWithAssignments | null> {
  const session = await requireGoalSession()
  if (!session) return null

  const goal = await db.goal.findFirst({
    where: { id: goalId, userId: session.user.id },
    include: {
      sessions: { select: { sessionId: true } },
      _count: { select: { sessions: true } },
    },
  })
  if (!goal) return null

  return mapGoalWithAssignments(goal)
}

export async function getGoalSessionOptionsAction(): Promise<GoalSessionOption[]> {
  const session = await requireGoalSession()
  if (!session) return []

  const sessions = await db.trainingSession.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      date: true,
      type: true,
      location: true,
      discipline: { select: { name: true } },
    },
    orderBy: { date: "desc" },
  })

  return sessions.map((entry) => ({
    id: entry.id,
    date: entry.date,
    type: entry.type,
    disciplineName: entry.discipline?.name ?? null,
    location: entry.location,
  }))
}

export async function getGoalsForSelectionAction(): Promise<GoalForSelection[]> {
  const session = await requireGoalSession()
  if (!session) return []

  return db.goal.findMany({
    where: { userId: session.user.id },
    select: {
      id: true,
      title: true,
      type: true,
      dateFrom: true,
      dateTo: true,
    },
    orderBy: [{ dateFrom: "asc" }, { createdAt: "asc" }],
  })
}
