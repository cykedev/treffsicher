"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getAuthSession } from "@/lib/auth-helpers"
import { saveUpload } from "@/lib/uploads/upload"
import type {
  TrainingSession,
  Discipline,
  Series,
  Attachment,
  Wellbeing,
  Reflection,
  Prognosis,
  Feedback,
  PrismaClient,
} from "@/generated/prisma/client"

// ─────────────────────────────────────────────
// Typen
// ─────────────────────────────────────────────

export type SessionWithDiscipline = TrainingSession & {
  discipline: Discipline | null
  series: Array<{ scoreTotal: unknown; isPractice: boolean }>
  // Für Tagebuch-Indikatoren: nur Vorhandensein prüfen, kein vollständiges Laden nötig
  wellbeing: { id: string } | null
  reflection: { id: string } | null
  prognosis: { id: string } | null
  feedback: { id: string } | null
}

// Prognosis mit serialisierten Decimal-Feldern — kann über die Server→Client-Grenze übergeben werden
export type SerializedPrognosis = Omit<Prognosis, "expectedScore"> & {
  expectedScore: string | null // Decimal → string serialisiert
}

// SeriesDetail mit serialisierten Decimal-Feldern
export type SerializedSeries = Omit<Series, "scoreTotal"> & {
  shots: unknown // Json-Feld aus Prisma
  scoreTotal: number | null // Decimal → number serialisiert
}

export type SessionDetail = TrainingSession & {
  discipline: Discipline | null
  // Decimal-Felder sind zu plain types serialisiert — keine Prisma Decimal-Objekte
  series: SerializedSeries[]
  attachments: Attachment[]
  // Mentaltraining-Daten — alle optional (Phase 3)
  wellbeing: Wellbeing | null
  reflection: Reflection | null
  prognosis: SerializedPrognosis | null
  feedback: Feedback | null
}

export type ActionResult = {
  error?: string
  success?: boolean
}

// ─────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────

const CreateSessionSchema = z.object({
  type: z.enum(["TRAINING", "WETTKAMPF", "TROCKENTRAINING", "MENTAL"] as const),
  date: z.string().min(1, "Datum ist erforderlich"),
  location: z.string().optional(),
  disciplineId: z.string().optional(),
})

// Schema für eine einzelne Serie inkl. Phase-2-Felder
const SeriesInputSchema = z.object({
  position: z.number().int().min(1),
  isPractice: z.boolean(),
  // Decimal als String für präzise Darstellung, null wenn nicht eingegeben
  scoreTotal: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? v : null)),
  // Einzelschüsse als JSON-String-Array, optional
  shots: z
    .string()
    .optional()
    .transform((v) => {
      if (!v) return null
      try {
        const parsed = JSON.parse(v)
        if (!Array.isArray(parsed)) return null
        // Nur nicht-leere, valide Strings behalten
        return parsed.filter((s: unknown) => typeof s === "string" && s !== "") as string[]
      } catch {
        return null
      }
    }),
  // Ausführungsqualität 1–5, optional
  executionQuality: z
    .string()
    .optional()
    .transform((v) => {
      if (!v || v === "") return null
      const n = parseInt(v, 10)
      return n >= 1 && n <= 5 ? n : null
    }),
})

// ─────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────

/**
 * Legt eine neue Einheit mit Serien an.
 * Einheit und Serien werden in einer Transaktion gespeichert —
 * entweder alles oder nichts (keine halbfertigen Einheiten in der DB).
 * Nach Erfolg: Redirect zur Detailansicht der neuen Einheit.
 */
export async function createSession(formData: FormData): Promise<void> {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  // Basis-Daten der Einheit validieren
  const parsed = CreateSessionSchema.safeParse({
    type: formData.get("type"),
    date: formData.get("date"),
    location: formData.get("location") || undefined,
    disciplineId: formData.get("disciplineId") || undefined,
  })

  if (!parsed.success) {
    // TODO: Fehler an die UI weitergeben (useActionState) — kommt in nächster Iteration
    console.error("Validierungsfehler:", parsed.error.flatten())
    return
  }

  // Serien aus dem Formular lesen
  // Format im Formular: series[0][scoreTotal], series[0][isPractice], series[0][shots], ...
  const seriesData: Array<z.infer<typeof SeriesInputSchema>> = []
  let i = 0
  while (formData.has(`series[${i}][scoreTotal]`) || formData.has(`series[${i}][isPractice]`)) {
    const scoreTotalRaw = formData.get(`series[${i}][scoreTotal]`) as string | null
    const isPracticeRaw = formData.get(`series[${i}][isPractice]`)
    const shotsRaw = formData.get(`series[${i}][shots]`) as string | null
    const qualityRaw = formData.get(`series[${i}][executionQuality]`) as string | null

    const seriesParsed = SeriesInputSchema.safeParse({
      position: i + 1,
      isPractice: isPracticeRaw === "true",
      scoreTotal: scoreTotalRaw ?? "",
      shots: shotsRaw ?? undefined,
      executionQuality: qualityRaw ?? undefined,
    })

    if (seriesParsed.success) {
      seriesData.push(seriesParsed.data)
    }
    i++
  }

  // Einheit und Serien in einer Transaktion anlegen.
  // Omit entfernt die nicht-transaktionalen Methoden aus dem Typ — das ist der korrekte
  // Typ für den Prisma-Transaktions-Client
  const created = await db.$transaction(
    async (
      tx: Omit<
        PrismaClient,
        "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
      >
    ) => {
      const trainingSession = await tx.trainingSession.create({
        data: {
          userId: session.user.id,
          type: parsed.data.type,
          // Datum aus dem Formular (ISO-String) in ein Date-Objekt umwandeln
          date: new Date(parsed.data.date),
          location: parsed.data.location,
          disciplineId: parsed.data.disciplineId || null,
        },
      })

      if (seriesData.length > 0) {
        await tx.series.createMany({
          data: seriesData.map((s) => ({
            sessionId: trainingSession.id,
            position: s.position,
            isPractice: s.isPractice,
            scoreTotal: s.scoreTotal ? s.scoreTotal : null,
            // shots als JSON-Wert speichern (Prisma Json-Feld akzeptiert Arrays direkt)
            shots: s.shots ?? undefined,
            executionQuality: s.executionQuality ?? null,
          })),
        })
      }

      return trainingSession
    }
  )

  revalidatePath("/einheiten")
  // Nach Erstellung direkt zur Detailansicht — dort können Uploads hinzugefügt werden
  redirect(`/einheiten/${created.id}`)
}

/**
 * Gibt eine einzelne Einheit mit allen verknüpften Daten zurück.
 * Stellt sicher dass nur der Eigentümer die Einheit sehen kann.
 *
 * Decimal-Felder (Series.scoreTotal, Prognosis.expectedScore) werden zu plain types
 * serialisiert, damit das Ergebnis über die Server→Client-Grenze übergeben werden kann.
 */
export async function getSessionById(id: string): Promise<SessionDetail | null> {
  const session = await getAuthSession()
  if (!session) return null

  const result = await db.trainingSession.findFirst({
    where: {
      id,
      // Sicherheit: Nur eigene Einheiten zurückgeben
      userId: session.user.id,
    },
    include: {
      discipline: true,
      series: {
        orderBy: { position: "asc" },
      },
      attachments: {
        orderBy: { createdAt: "asc" },
      },
      // Mentaltraining-Daten (Phase 3)
      wellbeing: true,
      reflection: true,
      prognosis: true,
      feedback: true,
    },
  })

  if (!result) return null

  // Decimal-Objekte serialisieren: Prisma gibt scoreTotal und expectedScore als Decimal zurück.
  // Diese können nicht über die Server→Client-Grenze (Next.js serialisiert nur plain objects).
  return {
    ...result,
    series: result.series.map((serie) => ({
      ...serie,
      scoreTotal: serie.scoreTotal !== null ? parseFloat(String(serie.scoreTotal)) : null,
    })),
    prognosis: result.prognosis
      ? {
          ...result.prognosis,
          expectedScore:
            result.prognosis.expectedScore !== null
              ? String(result.prognosis.expectedScore)
              : null,
        }
      : null,
  }
}

/**
 * Gibt alle Einheiten des eingeloggten Nutzers zurück, neueste zuerst.
 * Enthält die verknüpfte Disziplin und die Serien für die Gesamtberechnung.
 */
export async function getSessions(): Promise<SessionWithDiscipline[]> {
  const session = await getAuthSession()
  if (!session) return []

  return db.trainingSession.findMany({
    where: {
      // Sicherheit: Nur eigene Einheiten zurückgeben
      userId: session.user.id,
    },
    include: {
      discipline: true,
      series: {
        select: {
          scoreTotal: true,
          isPractice: true,
        },
      },
      // Minimale Selects — nur id für Tagebuch-Indikatoren (Vorhandensein der mentalen Felder)
      wellbeing: { select: { id: true } },
      reflection: { select: { id: true } },
      prognosis: { select: { id: true } },
      feedback: { select: { id: true } },
    },
    orderBy: { date: "desc" },
  })
}

/**
 * Lädt einen Anhang hoch und verknüpft ihn mit einer Einheit.
 * Prüft, dass die Einheit dem angemeldeten Nutzer gehört.
 */
export async function uploadAttachment(
  sessionId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  // Sicherstellen dass die Session dem Nutzer gehört
  const trainingSession = await db.trainingSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
  })
  if (!trainingSession) return { error: "Einheit nicht gefunden" }

  const file = formData.get("file")
  if (!file || !(file instanceof File)) return { error: "Keine Datei ausgewählt" }
  if (file.size === 0) return { error: "Die Datei ist leer" }

  try {
    const { filePath, fileType, originalName } = await saveUpload(file)

    await db.attachment.create({
      data: {
        sessionId,
        // Attachment hat kein userId-Feld — Eigentümerschaft über die verknüpfte Session
        filePath,
        fileType,
        originalName,
      },
    })

    revalidatePath(`/einheiten/${sessionId}`)
    return { success: true }
  } catch (err) {
    console.error("Fehler beim Upload:", err)
    const message = err instanceof Error ? err.message : "Upload fehlgeschlagen"
    return { error: message }
  }
}

/**
 * Löscht einen Anhang — Datei vom Disk und Eintrag aus der DB.
 * Prüft Eigentümerschaft vor der Löschung.
 */
export async function deleteAttachment(attachmentId: string): Promise<ActionResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  const attachment = await db.attachment.findFirst({
    where: {
      id: attachmentId,
      // Sicherheit: Eigentümerschaft über verknüpfte Session prüfen (kein direktes userId auf Attachment)
      session: { userId: session.user.id },
    },
  })
  if (!attachment) return { error: "Anhang nicht gefunden" }

  try {
    // Datei vom Disk löschen
    const { unlink } = await import("fs/promises")
    const uploadDir = process.env.UPLOAD_DIR ?? "/app/uploads"
    await unlink(`${uploadDir}/${attachment.filePath}`)
  } catch (err) {
    // Datei fehlt auf Disk — trotzdem DB-Eintrag löschen um konsistenten Zustand herzustellen
    console.warn("Datei konnte nicht gelöscht werden (evtl. nicht vorhanden):", err)
  }

  await db.attachment.delete({ where: { id: attachmentId } })
  revalidatePath(`/einheiten/${attachment.sessionId}`)
  return { success: true }
}

/**
 * Aktualisiert eine bestehende Einheit inkl. Serien.
 * Alle alten Serien werden gelöscht und durch die neuen ersetzt (einfacher als Diff).
 * Nach Erfolg: Redirect zur Detailansicht.
 */
export async function updateSession(id: string, formData: FormData): Promise<void> {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  // Sicherstellen dass die Einheit dem Nutzer gehört
  const existing = await db.trainingSession.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!existing) redirect("/einheiten")

  const parsed = CreateSessionSchema.safeParse({
    type: formData.get("type"),
    date: formData.get("date"),
    location: formData.get("location") || undefined,
    disciplineId: formData.get("disciplineId") || undefined,
  })

  if (!parsed.success) {
    console.error("Validierungsfehler beim Update:", parsed.error.flatten())
    return
  }

  // Serien aus dem Formular lesen (gleiche Logik wie createSession)
  const seriesData: Array<z.infer<typeof SeriesInputSchema>> = []
  let i = 0
  while (formData.has(`series[${i}][scoreTotal]`) || formData.has(`series[${i}][isPractice]`)) {
    const scoreTotalRaw = formData.get(`series[${i}][scoreTotal]`) as string | null
    const isPracticeRaw = formData.get(`series[${i}][isPractice]`)
    const shotsRaw = formData.get(`series[${i}][shots]`) as string | null
    const qualityRaw = formData.get(`series[${i}][executionQuality]`) as string | null

    const seriesParsed = SeriesInputSchema.safeParse({
      position: i + 1,
      isPractice: isPracticeRaw === "true",
      scoreTotal: scoreTotalRaw ?? "",
      shots: shotsRaw ?? undefined,
      executionQuality: qualityRaw ?? undefined,
    })

    if (seriesParsed.success) {
      seriesData.push(seriesParsed.data)
    }
    i++
  }

  // Einheit und Serien atomar aktualisieren: alte Serien löschen, neue anlegen
  await db.$transaction(
    async (
      tx: Omit<
        PrismaClient,
        "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
      >
    ) => {
      await tx.trainingSession.update({
        where: { id },
        data: {
          type: parsed.data.type,
          date: new Date(parsed.data.date),
          location: parsed.data.location ?? null,
          disciplineId: parsed.data.disciplineId || null,
        },
      })

      // Alle alten Serien löschen und durch neue ersetzen
      await tx.series.deleteMany({ where: { sessionId: id } })

      if (seriesData.length > 0) {
        await tx.series.createMany({
          data: seriesData.map((s) => ({
            sessionId: id,
            position: s.position,
            isPractice: s.isPractice,
            scoreTotal: s.scoreTotal ? s.scoreTotal : null,
            shots: s.shots ?? undefined,
            executionQuality: s.executionQuality ?? null,
          })),
        })
      }
    }
  )

  revalidatePath("/einheiten")
  revalidatePath(`/einheiten/${id}`)
  redirect(`/einheiten/${id}`)
}

/**
 * Löscht eine Einheit inkl. aller verknüpften Dateien auf Disk.
 * Cascade-Delete in der DB entfernt Series, Wellbeing, Reflection etc. automatisch.
 */
export async function deleteSession(id: string): Promise<ActionResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  // Sicherstellen dass die Einheit dem Nutzer gehört
  const existing = await db.trainingSession.findFirst({
    where: { id, userId: session.user.id },
    include: { attachments: true },
  })
  if (!existing) return { error: "Einheit nicht gefunden" }

  // Anhang-Dateien vom Disk löschen bevor DB-Eintrag entfernt wird
  const { unlink } = await import("fs/promises")
  const uploadDir = process.env.UPLOAD_DIR ?? "/app/uploads"
  for (const attachment of existing.attachments) {
    try {
      await unlink(`${uploadDir}/${attachment.filePath}`)
    } catch {
      // Datei fehlt auf Disk — kein Fehler, DB-Eintrag wird trotzdem gelöscht
    }
  }

  // Cascade-Delete: löscht Series, Wellbeing, Reflection, Prognosis, Feedback, Attachments, SessionGoals
  await db.trainingSession.delete({ where: { id } })

  revalidatePath("/einheiten")
  return { success: true }
}

/**
 * Speichert oder aktualisiert das Befinden vor einer Einheit (Upsert).
 * Werte 0–10 für Schlaf, Energie, Stress und Motivation.
 */
export async function saveWellbeing(
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

  const WellbeingSchema = z.object({
    sleep: z.number({ message: "Ungültiger Wert" }).int().min(0).max(10),
    energy: z.number({ message: "Ungültiger Wert" }).int().min(0).max(10),
    stress: z.number({ message: "Ungültiger Wert" }).int().min(0).max(10),
    motivation: z.number({ message: "Ungültiger Wert" }).int().min(0).max(10),
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

  revalidatePath(`/einheiten/${sessionId}`)
  return { success: true }
}

/**
 * Speichert oder aktualisiert die Reflexion nach einer Einheit (Upsert).
 */
export async function saveReflection(
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

  const routineFollowed = formData.get("routineFollowed") === "on"

  const data = {
    observations: (formData.get("observations") as string) || null,
    insight: (formData.get("insight") as string) || null,
    learningQuestion: (formData.get("learningQuestion") as string) || null,
    routineFollowed,
    // Abweichung nur speichern wenn Ablauf nicht eingehalten wurde
    routineDeviation: routineFollowed
      ? null
      : ((formData.get("routineDeviation") as string) || null),
  }

  await db.reflection.upsert({
    where: { sessionId },
    create: { sessionId, ...data },
    update: data,
  })

  revalidatePath(`/einheiten/${sessionId}`)
  return { success: true }
}

/**
 * Speichert oder aktualisiert die Prognose vor einer Einheit (Upsert).
 * Die 7 Dimensionen werden als Werte 0–100 erfasst.
 */
export async function savePrognosis(
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

  const DimensionSchema = z.number({ message: "Ungültiger Wert" }).int().min(0).max(100)
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

  revalidatePath(`/einheiten/${sessionId}`)
  return { success: true }
}

/**
 * Speichert oder aktualisiert das Feedback nach einer Einheit (Upsert).
 */
export async function saveFeedback(
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

  const DimensionSchema = z.number({ message: "Ungültiger Wert" }).int().min(0).max(100)
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

  revalidatePath(`/einheiten/${sessionId}`)
  return { success: true }
}
