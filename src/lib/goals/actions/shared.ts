import { revalidatePath } from "next/cache"
import { z } from "zod"
import { db } from "@/lib/db"
import { getAuthSession } from "@/lib/auth-helpers"
import type { GoalActionResult, GoalWithAssignments } from "@/lib/goals/types"

export const CreateGoalSchema = z.object({
  title: z.string().trim().min(1, "Titel ist erforderlich"),
  description: z.string().trim().optional(),
  type: z.enum(["RESULT", "PROCESS"] as const),
  dateFrom: z.string().min(1, "Von-Datum ist erforderlich"),
  dateTo: z.string().min(1, "Bis-Datum ist erforderlich"),
})

type GoalWithRelations = {
  id: string
  title: string
  description: string | null
  type: "RESULT" | "PROCESS"
  dateFrom: Date
  dateTo: Date
  sessions: Array<{ sessionId: string }>
  _count: { sessions: number }
}

type ValidatedGoalInput = {
  title: string
  description: string | null
  type: "RESULT" | "PROCESS"
  dateFrom: Date
  dateTo: Date
}

function parseDateFromInput(value: string): Date {
  return new Date(`${value}T00:00:00`)
}

export async function requireGoalSession() {
  return getAuthSession()
}

export function revalidateGoalPaths(): void {
  revalidatePath("/goals")
}

export function mapGoalWithAssignments(goal: GoalWithRelations): GoalWithAssignments {
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

export function parseGoalInput(
  formData: FormData,
  context: "create" | "update"
): ValidatedGoalInput | GoalActionResult {
  const parsed = CreateGoalSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    type: formData.get("type"),
    dateFrom: formData.get("dateFrom"),
    dateTo: formData.get("dateTo"),
  })
  if (!parsed.success) {
    const prefix =
      context === "update" ? "Goal update validation failed:" : "Goal validation failed:"
    console.error(prefix, parsed.error.flatten())
    return { error: "Bitte die Pflichtfelder prüfen." }
  }

  const dateFrom = parseDateFromInput(parsed.data.dateFrom)
  const dateTo = parseDateFromInput(parsed.data.dateTo)
  // Datumsguard zentralisieren, damit Create/Update dieselbe Chronologie-Regel verwenden.
  if (dateFrom > dateTo) {
    const prefix =
      context === "update"
        ? "Goal update validation failed: dateFrom is after dateTo"
        : "Goal validation failed: dateFrom is after dateTo"
    console.error(prefix)
    return { error: "Das Enddatum muss am oder nach dem Startdatum liegen." }
  }

  return {
    title: parsed.data.title,
    description: parsed.data.description ? parsed.data.description : null,
    type: parsed.data.type,
    dateFrom,
    dateTo,
  }
}

export async function ensureOwnedGoal(
  goalId: string,
  userId: string
): Promise<{ id: string } | null> {
  return db.goal.findFirst({
    where: { id: goalId, userId },
    select: { id: true },
  })
}
