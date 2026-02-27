"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getAuthSession } from "@/lib/auth-helpers"
import type { TrainingSession, Discipline, PrismaClient } from "@/generated/prisma/client"

// ─────────────────────────────────────────────
// Typen
// ─────────────────────────────────────────────

export type SessionWithDiscipline = TrainingSession & {
  discipline: Discipline | null
  series: Array<{ scoreTotal: unknown; isPractice: boolean }>
}

// ─────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────

const CreateSessionSchema = z.object({
  type: z.enum(["TRAINING", "WETTKAMPF", "TROCKENTRAINING", "MENTAL"]),
  date: z.string().min(1, "Datum ist erforderlich"),
  location: z.string().optional(),
  disciplineId: z.string().optional(),
})

// Schema für eine einzelne Serie
const SeriesInputSchema = z.object({
  position: z.number().int().min(1),
  isPractice: z.boolean(),
  // Decimal als String für präzise Darstellung, null wenn nicht eingegeben
  scoreTotal: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? v : null)),
})

// ─────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────

/**
 * Legt eine neue Einheit mit Serien an.
 * Einheit und Serien werden in einer Transaktion gespeichert —
 * entweder alles oder nichts (keine halbfertigen Einheiten in der DB).
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
  // Format im Formular: series[0][scoreTotal], series[0][isPractice], ...
  const seriesData: Array<z.infer<typeof SeriesInputSchema>> = []
  let i = 0
  while (formData.has(`series[${i}][scoreTotal]`) || formData.has(`series[${i}][isPractice]`)) {
    const scoreTotalRaw = formData.get(`series[${i}][scoreTotal]`) as string | null
    const isPracticeRaw = formData.get(`series[${i}][isPractice]`)

    const seriesParsed = SeriesInputSchema.safeParse({
      position: i + 1,
      isPractice: isPracticeRaw === "true",
      scoreTotal: scoreTotalRaw ?? "",
    })

    if (seriesParsed.success) {
      seriesData.push(seriesParsed.data)
    }
    i++
  }

  // Einheit und Serien in einer Transaktion anlegen.
  // Omit entfernt die nicht-transaktionalen Methoden aus dem Typ — das ist der korrekte
  // Typ für den Prisma-Transaktions-Client
  await db.$transaction(
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
            // Prisma erwartet Decimal als String oder number
            scoreTotal: s.scoreTotal ? s.scoreTotal : null,
          })),
        })
      }

      return trainingSession
    }
  )

  revalidatePath("/einheiten")
  redirect("/einheiten")
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
