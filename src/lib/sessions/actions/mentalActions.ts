import { z } from "zod"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { getAuthSession } from "@/lib/auth-helpers"
import { isScoringSessionType } from "@/lib/sessions/actions/shared"
import type { ActionResult } from "@/lib/sessions/actions/types"

async function hasOwnedSession(sessionId: string, userId: string): Promise<boolean> {
  const trainingSession = await db.trainingSession.findFirst({
    where: { id: sessionId, userId },
    select: { id: true },
  })

  return Boolean(trainingSession)
}

/**
 * Speichert oder aktualisiert das Befinden vor einer Einheit (Upsert).
 * Werte 0–100 fuer Schlaf, Energie, Stress und Motivation.
 */
export async function saveWellbeingAction(
  sessionId: string,
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  const sessionOwnedByUser = await hasOwnedSession(sessionId, session.user.id)
  if (!sessionOwnedByUser) return { error: "Einheit nicht gefunden" }

  const WellbeingSchema = z.object({
    sleep: z.number({ message: "Ungültiger Wert" }).int().min(0).max(100),
    energy: z.number({ message: "Ungültiger Wert" }).int().min(0).max(100),
    stress: z.number({ message: "Ungültiger Wert" }).int().min(0).max(100),
    motivation: z.number({ message: "Ungültiger Wert" }).int().min(0).max(100),
  })

  const parsed = WellbeingSchema.safeParse({
    sleep: Number(formData.get("sleep")),
    energy: Number(formData.get("energy")),
    stress: Number(formData.get("stress")),
    motivation: Number(formData.get("motivation")),
  })

  if (!parsed.success) return { error: "Ungültige Werte" }

  await db.wellbeing.upsert({
    where: { sessionId },
    create: { sessionId, ...parsed.data },
    update: parsed.data,
  })

  revalidatePath(`/sessions/${sessionId}`)
  return { success: true }
}

/**
 * Speichert oder aktualisiert die Reflexion nach einer Einheit (Upsert).
 */
export async function saveReflectionAction(
  sessionId: string,
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  const sessionOwnedByUser = await hasOwnedSession(sessionId, session.user.id)
  if (!sessionOwnedByUser) return { error: "Einheit nicht gefunden" }

  const routineFollowed = formData.get("routineFollowed") === "on"

  const data = {
    observations: (formData.get("observations") as string) || null,
    insight: (formData.get("insight") as string) || null,
    learningQuestion: (formData.get("learningQuestion") as string) || null,
    routineFollowed,
    // Abweichung nur speichern wenn Ablauf nicht eingehalten wurde
    routineDeviation: routineFollowed ? null : (formData.get("routineDeviation") as string) || null,
  }

  await db.reflection.upsert({
    where: { sessionId },
    create: { sessionId, ...data },
    update: data,
  })

  revalidatePath(`/sessions/${sessionId}`)
  return { success: true }
}

const DimensionSchema = z.number({ message: "Ungültiger Wert" }).int().min(0).max(100)

/**
 * Speichert oder aktualisiert die Prognose vor einer Einheit (Upsert).
 * Die 7 Dimensionen werden als Werte 0–100 erfasst.
 */
export async function savePrognosisAction(
  sessionId: string,
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  const trainingSession = await db.trainingSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
  })
  if (!trainingSession) return { error: "Einheit nicht gefunden" }
  if (!isScoringSessionType(trainingSession.type)) {
    return { error: "Prognose ist nur bei Training und Wettkampf verfügbar." }
  }

  const PrognosisSchema = z.object({
    fitness: DimensionSchema,
    nutrition: DimensionSchema,
    technique: DimensionSchema,
    tactics: DimensionSchema,
    mentalStrength: DimensionSchema,
    environment: DimensionSchema,
    equipment: DimensionSchema,
    expectedScore: z
      .string()
      .optional()
      .transform((v) => (v && v !== "" ? v : null)),
    expectedCleanShots: z
      .string()
      .optional()
      .transform((v) => {
        if (!v || v === "") return null
        const n = parseInt(v, 10)
        return isNaN(n) ? null : n
      }),
    performanceGoal: z
      .string()
      .optional()
      .transform((v) => v || null),
  })

  const parsed = PrognosisSchema.safeParse({
    fitness: Number(formData.get("fitness")),
    nutrition: Number(formData.get("nutrition")),
    technique: Number(formData.get("technique")),
    tactics: Number(formData.get("tactics")),
    mentalStrength: Number(formData.get("mentalStrength")),
    environment: Number(formData.get("environment")),
    equipment: Number(formData.get("equipment")),
    expectedScore: formData.get("expectedScore") as string,
    expectedCleanShots: formData.get("expectedCleanShots") as string,
    performanceGoal: formData.get("performanceGoal") as string,
  })

  if (!parsed.success) return { error: "Ungültige Werte" }

  await db.prognosis.upsert({
    where: { sessionId },
    create: { sessionId, ...parsed.data },
    update: parsed.data,
  })

  revalidatePath(`/sessions/${sessionId}`)
  return { success: true }
}

/**
 * Speichert oder aktualisiert das Feedback nach einer Einheit (Upsert).
 */
export async function saveFeedbackAction(
  sessionId: string,
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  const trainingSession = await db.trainingSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
  })
  if (!trainingSession) return { error: "Einheit nicht gefunden" }
  if (!isScoringSessionType(trainingSession.type)) {
    return { error: "Feedback ist nur bei Training und Wettkampf verfügbar." }
  }

  const FeedbackSchema = z.object({
    fitness: DimensionSchema,
    nutrition: DimensionSchema,
    technique: DimensionSchema,
    tactics: DimensionSchema,
    mentalStrength: DimensionSchema,
    environment: DimensionSchema,
    equipment: DimensionSchema,
    explanation: z
      .string()
      .optional()
      .transform((v) => v || null),
    goalAchieved: z.boolean(),
    goalAchievedNote: z
      .string()
      .optional()
      .transform((v) => v || null),
    progress: z
      .string()
      .optional()
      .transform((v) => v || null),
    fiveBestShots: z
      .string()
      .optional()
      .transform((v) => v || null),
    wentWell: z
      .string()
      .optional()
      .transform((v) => v || null),
    insights: z
      .string()
      .optional()
      .transform((v) => v || null),
  })

  const parsed = FeedbackSchema.safeParse({
    fitness: Number(formData.get("fitness")),
    nutrition: Number(formData.get("nutrition")),
    technique: Number(formData.get("technique")),
    tactics: Number(formData.get("tactics")),
    mentalStrength: Number(formData.get("mentalStrength")),
    environment: Number(formData.get("environment")),
    equipment: Number(formData.get("equipment")),
    explanation: formData.get("explanation") as string,
    goalAchieved: formData.get("goalAchieved") === "on",
    // goalAchievedNote ist nur im DOM wenn goalAchieved gesetzt — null → undefined damit z.string().optional() passt
    goalAchievedNote: formData.get("goalAchievedNote") ?? undefined,
    progress: formData.get("progress") as string,
    fiveBestShots: formData.get("fiveBestShots") as string,
    wentWell: formData.get("wentWell") as string,
    insights: formData.get("insights") as string,
  })

  if (!parsed.success) return { error: "Ungültige Werte" }

  await db.feedback.upsert({
    where: { sessionId },
    create: { sessionId, ...parsed.data },
    update: parsed.data,
  })

  revalidatePath(`/sessions/${sessionId}`)
  return { success: true }
}
