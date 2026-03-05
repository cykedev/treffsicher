import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getAuthSession } from "@/lib/auth-helpers"
import {
  CreateSessionSchema,
  parseGoalIdsFromFormData,
  parseHitLocationFromFormData,
  parseSeriesFromFormData,
  parseSessionDateInput,
  resolveAccessibleDisciplineId,
  type SessionTransactionClient,
} from "@/lib/sessions/actions/shared"
import type {
  ActionResult,
  SessionDetail,
  SessionWithDiscipline,
} from "@/lib/sessions/actions/types"

/**
 * Legt eine neue Einheit mit Serien an.
 * Einheit und Serien werden in einer Transaktion gespeichert —
 * entweder alles oder nichts (keine halbfertigen Einheiten in der DB).
 * Nach Erfolg: Redirect zur Detailansicht der neuen Einheit.
 */
export async function createSessionAction(formData: FormData): Promise<ActionResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  // Basis-Daten der Einheit validieren
  const parsed = CreateSessionSchema.safeParse({
    type: formData.get("type"),
    date: formData.get("date"),
    location: formData.get("location") || undefined,
    disciplineId: formData.get("disciplineId") || undefined,
    trainingGoal: formData.get("trainingGoal") || undefined,
  })

  if (!parsed.success) {
    console.error("Validierungsfehler:", parsed.error.flatten())
    return { error: "Bitte die Pflichtfelder prüfen." }
  }

  const sessionDate = parseSessionDateInput(parsed.data.date)
  if (!sessionDate) {
    return { error: "Datum/Uhrzeit ist ungültig." }
  }

  const disciplineId = await resolveAccessibleDisciplineId(
    parsed.data.disciplineId,
    session.user.id
  )
  if (parsed.data.disciplineId && !disciplineId) {
    console.warn("createSession: ungueltige oder nicht erlaubte disciplineId", {
      userId: session.user.id,
    })
    return { error: "Die gewählte Disziplin ist nicht verfügbar." }
  }

  // Serien aus dem Formular lesen
  // Format im Formular: series[0][scoreTotal], series[0][isPractice], series[0][shots], ...
  const seriesData = parseSeriesFromFormData(formData)
  if (seriesData === null) {
    return { error: "Seriendaten sind ungültig oder überschreiten die Grenzwerte." }
  }

  const selectedGoalIds = parseGoalIdsFromFormData(formData)
  const hitLocationInput = parseHitLocationFromFormData(formData)
  if (hitLocationInput === "INVALID") {
    return { error: "Trefferlage ist ungültig." }
  }

  // Einheit und Serien in einer Transaktion anlegen.
  // Omit entfernt die nicht-transaktionalen Methoden aus dem Typ — das ist der korrekte
  // Typ fuer den Prisma-Transaktions-Client
  const created = await db.$transaction(async (tx: SessionTransactionClient) => {
    const trainingSession = await tx.trainingSession.create({
      data: {
        userId: session.user.id,
        type: parsed.data.type,
        date: sessionDate,
        location: parsed.data.location,
        disciplineId,
        trainingGoal: parsed.data.trainingGoal || null,
        hitLocationHorizontalMm: hitLocationInput?.horizontalMm ?? null,
        hitLocationHorizontalDirection: hitLocationInput?.horizontalDirection ?? null,
        hitLocationVerticalMm: hitLocationInput?.verticalMm ?? null,
        hitLocationVerticalDirection: hitLocationInput?.verticalDirection ?? null,
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

    if (selectedGoalIds.length > 0) {
      const validGoals = await tx.goal.findMany({
        where: {
          id: { in: selectedGoalIds },
          userId: session.user.id,
        },
        select: { id: true },
      })

      if (validGoals.length > 0) {
        await tx.sessionGoal.createMany({
          data: validGoals.map((goal) => ({
            sessionId: trainingSession.id,
            goalId: goal.id,
          })),
          skipDuplicates: true,
        })
      }
    }

    return trainingSession
  })

  revalidatePath("/sessions")
  revalidatePath("/goals")
  // Nach Erstellung direkt zur Detailansicht — dort koennen Uploads hinzugefuegt werden
  redirect(`/sessions/${created.id}`)
}

/**
 * Gibt eine einzelne Einheit mit allen verknuepften Daten zurueck.
 * Stellt sicher dass nur der Eigentuemer die Einheit sehen kann.
 *
 * Decimal-Felder (Series.scoreTotal, Prognosis.expectedScore) werden zu plain types
 * serialisiert, damit das Ergebnis ueber die Server→Client-Grenze uebergeben werden kann.
 */
export async function getSessionByIdAction(id: string): Promise<SessionDetail | null> {
  const session = await getAuthSession()
  if (!session) return null

  const result = await db.trainingSession.findFirst({
    where: {
      id,
      // Sicherheit: Nur eigene Einheiten zurueckgeben
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
      goals: {
        include: {
          goal: {
            select: {
              id: true,
              title: true,
              type: true,
            },
          },
        },
      },
    },
  })

  if (!result) return null

  // Decimal-Objekte serialisieren: Prisma gibt scoreTotal und expectedScore als Decimal zurueck.
  // Diese koennen nicht ueber die Server→Client-Grenze (Next.js serialisiert nur plain objects).
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
            result.prognosis.expectedScore !== null ? String(result.prognosis.expectedScore) : null,
        }
      : null,
  }
}

/**
 * Gibt alle Einheiten des eingeloggten Nutzers zurueck, neueste zuerst.
 * Enthaelt die verknuepfte Disziplin und die Serien fuer die Gesamtberechnung.
 */
export async function getSessionsAction(): Promise<SessionWithDiscipline[]> {
  const session = await getAuthSession()
  if (!session) return []

  return db.trainingSession.findMany({
    where: {
      // Sicherheit: Nur eigene Einheiten zurueckgeben
      userId: session.user.id,
    },
    include: {
      discipline: true,
      series: {
        select: {
          scoreTotal: true,
          isPractice: true,
          shots: true,
        },
      },
      // Minimale Selects — nur id fuer Tagebuch-Indikatoren (Vorhandensein der mentalen Felder)
      wellbeing: { select: { id: true } },
      reflection: { select: { id: true } },
      prognosis: { select: { id: true } },
      feedback: { select: { id: true } },
    },
    orderBy: { date: "desc" },
  })
}

/**
 * Aktualisiert eine bestehende Einheit inkl. Serien.
 * Alle alten Serien werden geloescht und durch die neuen ersetzt (einfacher als Diff).
 * Nach Erfolg: Redirect zur Detailansicht.
 */
export async function updateSessionAction(id: string, formData: FormData): Promise<ActionResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  // Sicherstellen dass die Einheit dem Nutzer gehoert
  const existing = await db.trainingSession.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!existing) return { error: "Einheit nicht gefunden" }

  const parsed = CreateSessionSchema.safeParse({
    type: formData.get("type"),
    date: formData.get("date"),
    location: formData.get("location") || undefined,
    disciplineId: formData.get("disciplineId") || undefined,
    trainingGoal: formData.get("trainingGoal") || undefined,
  })

  if (!parsed.success) {
    console.error("Validierungsfehler beim Update:", parsed.error.flatten())
    return { error: "Bitte die Pflichtfelder prüfen." }
  }

  const sessionDate = parseSessionDateInput(parsed.data.date)
  if (!sessionDate) {
    return { error: "Datum/Uhrzeit ist ungültig." }
  }

  const disciplineId = await resolveAccessibleDisciplineId(
    parsed.data.disciplineId,
    session.user.id
  )
  if (parsed.data.disciplineId && !disciplineId) {
    console.warn("updateSession: ungueltige oder nicht erlaubte disciplineId", {
      userId: session.user.id,
      sessionId: id,
    })
    return { error: "Die gewählte Disziplin ist nicht verfügbar." }
  }

  // Serien aus dem Formular lesen (gleiche Logik wie createSession)
  const seriesData = parseSeriesFromFormData(formData)
  if (seriesData === null) {
    return { error: "Seriendaten sind ungültig oder überschreiten die Grenzwerte." }
  }

  const selectedGoalIds = parseGoalIdsFromFormData(formData)
  const hitLocationInput = parseHitLocationFromFormData(formData)
  if (hitLocationInput === "INVALID") {
    return { error: "Trefferlage ist ungültig." }
  }

  // Einheit und Serien atomar aktualisieren: alte Serien loeschen, neue anlegen
  await db.$transaction(async (tx: SessionTransactionClient) => {
    await tx.trainingSession.update({
      where: { id },
      data: {
        type: parsed.data.type,
        date: sessionDate,
        location: parsed.data.location ?? null,
        disciplineId,
        trainingGoal: parsed.data.trainingGoal || null,
        hitLocationHorizontalMm: hitLocationInput?.horizontalMm ?? null,
        hitLocationHorizontalDirection: hitLocationInput?.horizontalDirection ?? null,
        hitLocationVerticalMm: hitLocationInput?.verticalMm ?? null,
        hitLocationVerticalDirection: hitLocationInput?.verticalDirection ?? null,
      },
    })

    // Alle alten Serien loeschen und durch neue ersetzen
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

    await tx.sessionGoal.deleteMany({ where: { sessionId: id } })

    if (selectedGoalIds.length > 0) {
      const validGoals = await tx.goal.findMany({
        where: {
          id: { in: selectedGoalIds },
          userId: session.user.id,
        },
        select: { id: true },
      })

      if (validGoals.length > 0) {
        await tx.sessionGoal.createMany({
          data: validGoals.map((goal) => ({
            sessionId: id,
            goalId: goal.id,
          })),
          skipDuplicates: true,
        })
      }
    }
  })

  revalidatePath("/sessions")
  revalidatePath(`/sessions/${id}`)
  revalidatePath("/goals")
  redirect(`/sessions/${id}`)
}

/**
 * Setzt isFavourite einer Einheit auf den gegenteiligen Wert.
 * Nur der Eigentuemer kann den Favorit-Status seiner eigenen Einheiten aendern.
 */
export async function toggleFavouriteAction(sessionId: string): Promise<void> {
  const session = await getAuthSession()
  if (!session) return

  const existing = await db.trainingSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
    select: { isFavourite: true },
  })
  if (!existing) return

  await db.trainingSession.update({
    where: { id: sessionId },
    data: { isFavourite: !existing.isFavourite },
  })

  revalidatePath("/sessions")
  revalidatePath(`/sessions/${sessionId}`)
}

/**
 * Loescht eine Einheit inkl. aller verknuepften Dateien auf Disk.
 * Cascade-Delete in der DB entfernt Series, Wellbeing, Reflection etc. automatisch.
 */
export async function deleteSessionAction(id: string): Promise<ActionResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  // Sicherstellen dass die Einheit dem Nutzer gehoert
  const existing = await db.trainingSession.findFirst({
    where: { id, userId: session.user.id },
    include: { attachments: true },
  })
  if (!existing) return { error: "Einheit nicht gefunden" }

  // Anhang-Dateien vom Disk loeschen bevor DB-Eintrag entfernt wird
  const { unlink } = await import("fs/promises")
  const uploadDir = process.env.UPLOAD_DIR ?? "/app/uploads"
  for (const attachment of existing.attachments) {
    try {
      await unlink(`${uploadDir}/${attachment.filePath}`)
    } catch {
      // Datei fehlt auf Disk — kein Fehler, DB-Eintrag wird trotzdem geloescht
    }
  }

  // Cascade-Delete: loescht Series, Wellbeing, Reflection, Prognosis, Feedback, Attachments, SessionGoals
  await db.trainingSession.delete({ where: { id } })

  revalidatePath("/sessions")
  return { success: true }
}
