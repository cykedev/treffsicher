"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getAuthSession } from "@/lib/auth-helpers"
import type { ShotRoutine } from "@/generated/prisma/client"

export type ActionResult = {
  error?: string
  success?: boolean
}

// Ein einzelner Schritt im Ablauf
export type RoutineStep = {
  order: number
  title: string
  description?: string
}

const RoutineStepSchema = z.object({
  order: z.number().int().min(1),
  title: z.string().min(1, "Titel ist erforderlich").max(200),
  description: z.string().max(500).optional(),
})

const RoutineStepsSchema = z.array(RoutineStepSchema).min(1, "Mindestens ein Schritt ist erforderlich")

const ShotRoutineSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich").max(100),
  steps: z.string().transform((v, ctx) => {
    let parsedJson: unknown

    try {
      parsedJson = JSON.parse(v)
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Schritte sind ungültig",
      })
      return z.NEVER
    }

    const parsedSteps = RoutineStepsSchema.safeParse(parsedJson)
    if (!parsedSteps.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: parsedSteps.error.issues[0]?.message ?? "Schritte sind ungültig",
      })
      return z.NEVER
    }

    return parsedSteps.data
  }),
})

function getShotRoutineValidationError(error: z.ZodError): string {
  const fields = error.flatten().fieldErrors
  return fields.name?.[0] ?? fields.steps?.[0] ?? error.issues[0]?.message ?? "Ungültige Eingabe"
}

/**
 * Gibt alle Schuss-Abläufe des eingeloggten Nutzers zurück.
 */
export async function getShotRoutines(): Promise<ShotRoutine[]> {
  const session = await getAuthSession()
  if (!session) return []

  return db.shotRoutine.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
  })
}

/**
 * Gibt einen einzelnen Schuss-Ablauf zurück — nur eigene.
 */
export async function getShotRoutineById(id: string): Promise<ShotRoutine | null> {
  const session = await getAuthSession()
  if (!session) return null

  return db.shotRoutine.findFirst({
    where: { id, userId: session.user.id },
  })
}

/**
 * Legt einen neuen Schuss-Ablauf an und leitet zur Detailansicht weiter.
 */
export async function createShotRoutine(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  const parsed = ShotRoutineSchema.safeParse({
    name: formData.get("name"),
    steps: formData.get("steps") ?? "[]",
  })

  if (!parsed.success) {
    return { error: getShotRoutineValidationError(parsed.error) }
  }

  const routine = await db.shotRoutine.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
      steps: parsed.data.steps,
    },
  })

  revalidatePath("/shot-routines")
  redirect(`/shot-routines/${routine.id}`)
}

/**
 * Aktualisiert einen bestehenden Schuss-Ablauf.
 */
export async function updateShotRoutine(
  id: string,
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  const existing = await db.shotRoutine.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!existing) return { error: "Ablauf nicht gefunden" }

  const parsed = ShotRoutineSchema.safeParse({
    name: formData.get("name"),
    steps: formData.get("steps") ?? "[]",
  })

  if (!parsed.success) {
    return { error: getShotRoutineValidationError(parsed.error) }
  }

  await db.shotRoutine.update({
    where: { id },
    data: {
      name: parsed.data.name,
      steps: parsed.data.steps,
    },
  })

  revalidatePath("/shot-routines")
  revalidatePath(`/shot-routines/${id}`)
  return { success: true }
}

/**
 * Löscht einen Schuss-Ablauf nach Ownership-Check.
 */
export async function deleteShotRoutine(id: string): Promise<ActionResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  const existing = await db.shotRoutine.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!existing) return { error: "Ablauf nicht gefunden" }

  await db.shotRoutine.delete({ where: { id } })

  revalidatePath("/shot-routines")
  return { success: true }
}
