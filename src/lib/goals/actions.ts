"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getAuthSession } from "@/lib/auth-helpers"
import type { GoalType, SessionType } from "@/generated/prisma/client"

export type GoalWithAssignments = {
  id: string
  title: string
  description: string | null
  type: GoalType
  dateFrom: Date
  dateTo: Date
  sessionCount: number
  sessionIds: string[]
}

export type GoalSessionOption = {
  id: string
  date: Date
  type: SessionType
  disciplineName: string | null
  location: string | null
}

export type GoalForSelection = {
  id: string
  title: string
  type: GoalType
  dateFrom: Date
  dateTo: Date
}

export type GoalActionResult = {
  error?: string
  success?: boolean
}

const CreateGoalSchema = z.object({
  title: z.string().trim().min(1, "Titel ist erforderlich"),
  description: z.string().trim().optional(),
  type: z.enum(["RESULT", "PROCESS"] as const),
  dateFrom: z.string().min(1, "Von-Datum ist erforderlich"),
  dateTo: z.string().min(1, "Bis-Datum ist erforderlich"),
})

function parseDateFromInput(value: string): Date {
  return new Date(`${value}T00:00:00`)
}

async function createGoalForUser(userId: string, formData: FormData): Promise<GoalActionResult> {
  const parsed = CreateGoalSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    type: formData.get("type"),
    dateFrom: formData.get("dateFrom"),
    dateTo: formData.get("dateTo"),
  })

  if (!parsed.success) {
    console.error("Goal validation failed:", parsed.error.flatten())
    return { error: "Bitte die Pflichtfelder prüfen." }
  }

  const dateFrom = parseDateFromInput(parsed.data.dateFrom)
  const dateTo = parseDateFromInput(parsed.data.dateTo)
  if (dateFrom > dateTo) {
    console.error("Goal validation failed: dateFrom is after dateTo")
    return { error: "Das Enddatum muss am oder nach dem Startdatum liegen." }
  }

  await db.goal.create({
    data: {
      userId,
      title: parsed.data.title,
      description: parsed.data.description ? parsed.data.description : null,
      type: parsed.data.type,
      dateFrom,
      dateTo,
    },
  })

  return { success: true }
}

export async function getGoalsWithAssignments(): Promise<GoalWithAssignments[]> {
  const session = await getAuthSession()
  if (!session) return []

  const goals = await db.goal.findMany({
    where: { userId: session.user.id },
    include: {
      sessions: { select: { sessionId: true } },
      _count: { select: { sessions: true } },
    },
    orderBy: [{ dateFrom: "asc" }, { createdAt: "asc" }],
  })

  return goals.map((goal) => ({
    id: goal.id,
    title: goal.title,
    description: goal.description,
    type: goal.type,
    dateFrom: goal.dateFrom,
    dateTo: goal.dateTo,
    sessionCount: goal._count.sessions,
    sessionIds: goal.sessions.map((entry) => entry.sessionId),
  }))
}

/**
 * Lädt ein einzelnes Ziel inkl. Verknüpfungen für die Detailansicht.
 * Warum eigene Funktion: Detailseite soll die gleiche Datenbasis wie die Liste nutzen,
 * aber mit klarer 404-Behandlung wenn das Ziel nicht dem Nutzer gehört.
 */
export async function getGoalById(goalId: string): Promise<GoalWithAssignments | null> {
  const session = await getAuthSession()
  if (!session) return null

  const goal = await db.goal.findFirst({
    where: { id: goalId, userId: session.user.id },
    include: {
      sessions: { select: { sessionId: true } },
      _count: { select: { sessions: true } },
    },
  })

  if (!goal) return null

  return {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    type: goal.type,
    dateFrom: goal.dateFrom,
    dateTo: goal.dateTo,
    sessionCount: goal._count.sessions,
    sessionIds: goal.sessions.map((entry) => entry.sessionId),
  }
}

export async function getGoalSessionOptions(): Promise<GoalSessionOption[]> {
  const session = await getAuthSession()
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

export async function getGoalsForSelection(): Promise<GoalForSelection[]> {
  const session = await getAuthSession()
  if (!session) return []

  const goals = await db.goal.findMany({
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

  return goals
}

export async function createGoal(formData: FormData): Promise<GoalActionResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  const result = await createGoalForUser(session.user.id, formData)
  if (result.error) return result

  revalidatePath("/goals")
  return { success: true }
}

export async function createGoalAndRedirect(formData: FormData): Promise<void> {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  const result = await createGoalForUser(session.user.id, formData)
  if (result.error) {
    // Warum Redirect mit Query: serverseitiges Form-Submit braucht einen stabilen Rückkanal
    // für klare Fehlermeldungen ohne Browser-Standarddialoge.
    const message = encodeURIComponent(result.error)
    redirect(`/goals/new?error=${message}`)
  }

  revalidatePath("/goals")
  redirect("/goals")
}

export async function updateGoal(goalId: string, formData: FormData): Promise<GoalActionResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  const goal = await db.goal.findFirst({
    where: { id: goalId, userId: session.user.id },
    select: { id: true },
  })
  if (!goal) return { error: "Ziel nicht gefunden" }

  const parsed = CreateGoalSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    type: formData.get("type"),
    dateFrom: formData.get("dateFrom"),
    dateTo: formData.get("dateTo"),
  })

  if (!parsed.success) {
    console.error("Goal update validation failed:", parsed.error.flatten())
    return { error: "Bitte die Pflichtfelder prüfen." }
  }

  const dateFrom = parseDateFromInput(parsed.data.dateFrom)
  const dateTo = parseDateFromInput(parsed.data.dateTo)
  if (dateFrom > dateTo) {
    console.error("Goal update validation failed: dateFrom is after dateTo")
    return { error: "Das Enddatum muss am oder nach dem Startdatum liegen." }
  }

  await db.goal.update({
    where: { id: goalId },
    data: {
      title: parsed.data.title,
      description: parsed.data.description ? parsed.data.description : null,
      type: parsed.data.type,
      dateFrom,
      dateTo,
    },
  })

  revalidatePath("/goals")
  return { success: true }
}

export async function updateGoalAssignments(
  goalId: string,
  formData: FormData
): Promise<GoalActionResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  const goal = await db.goal.findFirst({
    where: { id: goalId, userId: session.user.id },
    select: { id: true },
  })
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
    await tx.sessionGoal.deleteMany({ where: { goalId } })

    if (validSessionIds.length > 0) {
      await tx.sessionGoal.createMany({
        data: validSessionIds.map((sessionId) => ({ goalId, sessionId })),
        skipDuplicates: true,
      })
    }
  })

  revalidatePath("/goals")
  return { success: true }
}

export async function deleteGoal(goalId: string): Promise<GoalActionResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  const goal = await db.goal.findFirst({
    where: { id: goalId, userId: session.user.id },
    select: { id: true },
  })
  if (!goal) return { error: "Ziel nicht gefunden" }

  await db.goal.delete({ where: { id: goalId } })
  revalidatePath("/goals")
  return { success: true }
}
