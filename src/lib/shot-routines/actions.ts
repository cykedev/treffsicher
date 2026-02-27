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

const ShotRoutineSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich").max(100),
  steps: z
    .string()
    .transform((v) => {
      try {
        const parsed = JSON.parse(v)
        return z.array(RoutineStepSchema).parse(parsed)
      } catch {
        return []
      }
    }),
})

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
    return { error: parsed.error.flatten().fieldErrors.name?.[0] ?? "Ungültige Eingabe" }
  }

  const routine = await db.shotRoutine.create({
    data: {
      userId: session.user.id,
      name: parsed.data.name,
      steps: parsed.data.steps,
    },
  })

  revalidatePath("/schuss-ablauf")
  redirect(`/schuss-ablauf/${routine.id}`)
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
    return { error: parsed.error.flatten().fieldErrors.name?.[0] ?? "Ungültige Eingabe" }
  }

  await db.shotRoutine.update({
    where: { id },
    data: {
      name: parsed.data.name,
      steps: parsed.data.steps,
    },
  })

  revalidatePath("/schuss-ablauf")
  revalidatePath(`/schuss-ablauf/${id}`)
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

  revalidatePath("/schuss-ablauf")
  return { success: true }
}
