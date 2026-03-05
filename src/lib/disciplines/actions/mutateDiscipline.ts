import { db } from "@/lib/db"
import {
  canManageDiscipline,
  mapValidationErrors,
  parseDisciplineFormData,
  revalidateDisciplinePaths,
  requireAuthSession,
} from "@/lib/disciplines/actions/shared"
import type { ActionResult } from "@/lib/disciplines/types"

export async function createDisciplineAction(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  const parsed = parseDisciplineFormData(
    formData,
    String(formData.get("isSystem") ?? "false") === "true"
  )
  if (!parsed.success) {
    return { error: mapValidationErrors(parsed.error) }
  }

  const canCreateSystem = session.user.role === "ADMIN" && parsed.data.isSystem
  await db.discipline.create({
    data: {
      ...parsed.data,
      isSystem: canCreateSystem,
      ownerId: canCreateSystem ? null : session.user.id,
    },
  })

  revalidateDisciplinePaths()
  return { success: true }
}

export async function updateDisciplineAction(
  id: string,
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await requireAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  const discipline = await db.discipline.findUnique({ where: { id } })
  if (!discipline || !canManageDiscipline(session, discipline)) {
    return { error: "Disziplin nicht gefunden oder keine Berechtigung." }
  }

  const parsed = parseDisciplineFormData(formData, discipline.isSystem)
  if (!parsed.success) {
    return { error: mapValidationErrors(parsed.error) }
  }

  if (parsed.data.scoringType !== discipline.scoringType) {
    // Wertungsartwechsel nur vor erster Nutzung erlauben, sonst werden historische Ergebnisse inkonsistent.
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

  revalidateDisciplinePaths()
  return { success: true }
}

export async function archiveDisciplineAction(id: string): Promise<ActionResult> {
  return setDisciplineArchivedAction(id, true)
}

export async function setDisciplineArchivedAction(
  id: string,
  nextArchived: boolean
): Promise<ActionResult> {
  const session = await requireAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  const discipline = await db.discipline.findUnique({
    where: { id },
    select: { id: true, ownerId: true, isSystem: true, isArchived: true },
  })
  if (!discipline || !canManageDiscipline(session, discipline)) {
    return { error: "Disziplin nicht gefunden oder keine Berechtigung." }
  }

  if (discipline.isArchived === nextArchived) return { success: true }

  if (nextArchived) {
    await db.$transaction([
      db.discipline.update({
        where: { id },
        data: { isArchived: true },
      }),
      db.user.updateMany({
        where: {
          favouriteDisciplineId: id,
          // Bei nicht-Systemdisziplinen nur den eigenen Favorit bereinigen.
          ...(discipline.isSystem ? {} : { id: session.user.id }),
        },
        data: { favouriteDisciplineId: null },
      }),
    ])
  } else {
    await db.discipline.update({
      where: { id },
      data: { isArchived: false },
    })
  }

  revalidateDisciplinePaths()
  return { success: true }
}

export async function deleteDisciplineAction(id: string): Promise<ActionResult> {
  const session = await requireAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  const discipline = await db.discipline.findUnique({
    where: { id },
    select: { id: true, ownerId: true, isSystem: true },
  })
  if (!discipline || !canManageDiscipline(session, discipline)) {
    return { error: "Disziplin nicht gefunden oder keine Berechtigung." }
  }

  // Endgültiges Löschen nur ohne fachliche Verwendung erlauben, damit keine Verweise brechen.
  const [sessionCount, shotRoutineCount] = await Promise.all([
    db.trainingSession.count({ where: { disciplineId: id } }),
    db.shotRoutine.count({ where: { disciplineId: id } }),
  ])

  if (sessionCount > 0 || shotRoutineCount > 0) {
    return {
      error:
        "Disziplin kann nicht gelöscht werden, solange sie in Einheiten oder Abläufen verwendet wird.",
    }
  }

  try {
    await db.$transaction([
      db.user.updateMany({
        where: { favouriteDisciplineId: id },
        data: { favouriteDisciplineId: null },
      }),
      db.discipline.delete({ where: { id } }),
    ])
  } catch (error) {
    // Rennen zwischen Prüfung und Delete sind möglich; Fehler bleibt nutzerführend.
    console.error("Fehler beim Löschen der Disziplin:", error)
    return {
      error:
        "Disziplin konnte nicht gelöscht werden. Bitte prüfe, ob sie inzwischen verwendet wird.",
    }
  }

  revalidateDisciplinePaths()
  return { success: true }
}
