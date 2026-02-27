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
  PrismaClient,
} from "@/generated/prisma/client"

// ─────────────────────────────────────────────
// Typen
// ─────────────────────────────────────────────

export type SessionWithDiscipline = TrainingSession & {
  discipline: Discipline | null
  series: Array<{ scoreTotal: unknown; isPractice: boolean }>
}

export type SessionDetail = TrainingSession & {
  discipline: Discipline | null
  series: Array<
    Series & {
      // shots ist ein Json-Feld in Prisma — wird nach der Abfrage gecastet
      shots: unknown
    }
  >
  attachments: Attachment[]
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
 */
export async function getSessionById(id: string): Promise<SessionDetail | null> {
  const session = await getAuthSession()
  if (!session) return null

  return db.trainingSession.findFirst({
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
    },
  })
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
