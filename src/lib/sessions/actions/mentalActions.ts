import { z } from "zod"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { getAuthSession } from "@/lib/auth-helpers"
import { hasOwnedSession } from "@/lib/sessions/actions/mentalShared"
import type { ActionResult } from "@/lib/sessions/actions/types"

// Prognose und Feedback haengen an wertenden Einheiten und werden separat
// gehalten; ueber dieses Modul bleiben sie als oeffentliche API erreichbar.
export {
  savePrognosisAction,
  saveFeedbackAction,
} from "@/lib/sessions/actions/scoringMentalActions"

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

  // Idempotenter Save-Pfad fuer erstes Speichern und spaeteres Editieren.
  // Befinden wird im UI mehrfach nachgetragen/editiert; Upsert haelt den Flow
  // idempotent und vermeidet race-anfaellige "exists -> create/update"-Zweige.
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

  const ReflectionSchema = z.object({
    observations: z
      .string()
      .max(3000)
      .optional()
      .transform((v) => v || null),
    insight: z
      .string()
      .max(3000)
      .optional()
      .transform((v) => v || null),
    learningQuestion: z
      .string()
      .max(3000)
      .optional()
      .transform((v) => v || null),
    routineDeviation: z
      .string()
      .max(3000)
      .optional()
      .transform((v) => v || null),
  })

  const reflectionParsed = ReflectionSchema.safeParse({
    observations: formData.get("observations") as string,
    insight: formData.get("insight") as string,
    learningQuestion: formData.get("learningQuestion") as string,
    // Feld ist nur im DOM, wenn der Ablauf nicht eingehalten wurde.
    // Bei eingehaltenem Ablauf fehlt das Feld; formData.get() liefert dann null,
    // was Zods .optional() (erwartet undefined) als Typfehler ablehnen würde.
    routineDeviation: formData.get("routineDeviation") ?? undefined,
  })

  if (!reflectionParsed.success) return { error: "Ungültige Eingabe" }

  const data = {
    ...reflectionParsed.data,
    routineFollowed,
    // Alte Abweichung aktiv loeschen, wenn der Ablauf wieder eingehalten wurde.
    // Alte Abweichungstexte duerfen bei "wieder eingehalten" nicht stehen bleiben,
    // sonst zeigt die Detailansicht widerspruechliche Informationen.
    routineDeviation: routineFollowed ? null : reflectionParsed.data.routineDeviation,
  }

  // Identischer Save-Pfad fuer Create und Edit.
  // Reflexion ist optional und kann erst spaeter erfasst werden; Upsert spart
  // separaten Create/Edit-Code bei identischem fachlichem Verhalten.
  await db.reflection.upsert({
    where: { sessionId },
    create: { sessionId, ...data },
    update: data,
  })

  revalidatePath(`/sessions/${sessionId}`)
  return { success: true }
}
