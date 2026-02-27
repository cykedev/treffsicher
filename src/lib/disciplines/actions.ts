"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { getAuthSession } from "@/lib/auth-helpers"
import type { Discipline } from "@/generated/prisma/client"

// Zod-Schema für eine neue Disziplin.
// Zod v4: `invalid_type_error` wurde entfernt — stattdessen `message` verwenden
const CreateDisciplineSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich").max(100, "Name zu lang"),
  seriesCount: z
    .number({ message: "Anzahl Serien muss eine Zahl sein" })
    .int()
    .min(1, "Mindestens 1 Serie")
    .max(20, "Maximal 20 Serien"),
  shotsPerSeries: z
    .number({ message: "Schuss pro Serie muss eine Zahl sein" })
    .int()
    .min(1, "Mindestens 1 Schuss")
    .max(60, "Maximal 60 Schuss"),
  practiceSeries: z
    .number({ message: "Probeschuss-Serien muss eine Zahl sein" })
    .int()
    .min(0)
    .max(5)
    .default(0),
  // Zod v4: Array muss `as const` sein für korrekte Enum-Typisierung
  scoringType: z.enum(["WHOLE", "TENTH"] as const, {
    message: "Ungültige Wertungsart",
  }),
})

export type ActionResult = {
  error?: string | Record<string, string[]>
  success?: boolean
}

/**
 * Gibt alle Disziplinen zurück, die der Nutzer verwenden kann:
 * - System-Disziplinen (für alle sichtbar)
 * - Eigene Disziplinen des eingeloggten Nutzers
 * Archivierte Disziplinen werden nicht zurückgegeben.
 */
export async function getDisciplines(): Promise<Discipline[]> {
  const session = await getAuthSession()
  if (!session) return []

  return db.discipline.findMany({
    where: {
      isArchived: false,
      // System-Disziplinen ODER eigene Disziplinen des Nutzers
      OR: [{ isSystem: true }, { ownerId: session.user.id }],
    },
    orderBy: [
      // System-Disziplinen zuerst, dann eigene alphabetisch
      { isSystem: "desc" },
      { name: "asc" },
    ],
  })
}

/**
 * Legt eine neue benutzerdefinierte Disziplin an.
 * React 19 useActionState erfordert (prevState, formData) Signatur.
 */
export async function createDiscipline(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  // Schritt 1: Authentifizierung prüfen
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  // Schritt 2: Eingaben parsen und validieren
  const parsed = CreateDisciplineSchema.safeParse({
    name: formData.get("name"),
    seriesCount: Number(formData.get("seriesCount")),
    shotsPerSeries: Number(formData.get("shotsPerSeries")),
    practiceSeries: Number(formData.get("practiceSeries") ?? 0),
    scoringType: formData.get("scoringType"),
  })

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  // Schritt 3: Disziplin in DB anlegen — gehört dem eingeloggten Nutzer
  await db.discipline.create({
    data: {
      ...parsed.data,
      isSystem: false,
      ownerId: session.user.id,
    },
  })

  // Next.js Cache für die Disziplin-Liste ungültig machen
  revalidatePath("/disziplinen")

  return { success: true }
}

/**
 * Gibt eine einzelne Disziplin zurück — nur eigene (nicht System) und nicht archivierte.
 * Wird für die Bearbeiten-Seite verwendet.
 */
export async function getDisciplineById(id: string): Promise<Discipline | null> {
  const session = await getAuthSession()
  if (!session) return null

  return db.discipline.findFirst({
    where: {
      id,
      ownerId: session.user.id,
      isSystem: false,
      isArchived: false,
    },
  })
}

/**
 * Aktualisiert eine benutzerdefinierte Disziplin.
 * Die Wertungsart kann nicht geändert werden wenn die Disziplin bereits in Einheiten verwendet wird —
 * sonst würden gespeicherte Ringwerte falsch interpretiert.
 */
export async function updateDiscipline(
  id: string,
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  // Sicherstellen dass die Disziplin dem Nutzer gehört und nicht System ist
  const discipline = await db.discipline.findFirst({
    where: { id, ownerId: session.user.id, isSystem: false },
  })
  if (!discipline) return { error: "Disziplin nicht gefunden oder keine Berechtigung." }

  const parsed = CreateDisciplineSchema.safeParse({
    name: formData.get("name"),
    seriesCount: Number(formData.get("seriesCount")),
    shotsPerSeries: Number(formData.get("shotsPerSeries")),
    practiceSeries: Number(formData.get("practiceSeries") ?? 0),
    scoringType: formData.get("scoringType"),
  })

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  // Wertungsart-Änderung verhindern wenn Disziplin bereits in Einheiten verwendet wird
  if (parsed.data.scoringType !== discipline.scoringType) {
    const usedInSessions = await db.trainingSession.count({ where: { disciplineId: id } })
    if (usedInSessions > 0) {
      return {
        error:
          "Wertungsart kann nicht geändert werden — die Disziplin wird bereits in Einheiten verwendet.",
      }
    }
  }

  await db.discipline.update({
    where: { id },
    data: parsed.data,
  })

  revalidatePath("/disziplinen")
  return { success: true }
}

/**
 * Archiviert eine Disziplin.
 * Archivierte Disziplinen erscheinen nicht mehr in der Auswahl für neue Einheiten,
 * aber bestehende Einheiten bleiben lesbar (keine Datenlöschung).
 */
export async function archiveDiscipline(id: string): Promise<ActionResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  // Prüfen ob die Disziplin dem Nutzer gehört — System-Disziplinen können nicht archiviert werden
  const discipline = await db.discipline.findFirst({
    where: {
      id,
      ownerId: session.user.id, // Sicherheit: nur eigene Disziplinen
      isSystem: false,
    },
  })

  if (!discipline) {
    return { error: "Disziplin nicht gefunden oder keine Berechtigung." }
  }

  await db.discipline.update({
    where: { id },
    data: { isArchived: true },
  })

  revalidatePath("/disziplinen")
  return { success: true }
}
