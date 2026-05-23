import { db } from "@/lib/db"
import { revalidateDisciplinePaths, requireAuthSession } from "@/lib/disciplines/actions/shared"
import type { ActionResult } from "@/lib/disciplines/types"

export async function toggleHiddenDisciplineAction(disciplineId: string): Promise<ActionResult> {
  const session = await requireAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  // Aktuellen Zustand und Zugriffsrecht in einer Abfrage prüfen.
  const [user, discipline] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: {
        favouriteDisciplineId: true,
        hiddenDisciplines: { where: { id: disciplineId }, select: { id: true } },
      },
    }),
    db.discipline.findFirst({
      where: {
        id: disciplineId,
        isArchived: false,
        OR: [{ isSystem: true }, { ownerId: session.user.id }],
      },
      select: { id: true },
    }),
  ])

  if (!user) return { error: "Nutzer nicht gefunden." }
  if (!discipline) return { error: "Disziplin nicht gefunden oder keine Berechtigung." }

  const isCurrentlyHidden = user.hiddenDisciplines.length > 0

  if (isCurrentlyHidden) {
    // Einblenden
    await db.user.update({
      where: { id: session.user.id },
      data: { hiddenDisciplines: { disconnect: { id: disciplineId } } },
    })
  } else {
    // Ausblenden — Favorit gleichzeitig entfernen, damit kein verwaister Favorit entsteht.
    const clearFavourite = user.favouriteDisciplineId === disciplineId
    await db.user.update({
      where: { id: session.user.id },
      data: {
        hiddenDisciplines: { connect: { id: disciplineId } },
        ...(clearFavourite ? { favouriteDisciplineId: null } : {}),
      },
    })
  }

  revalidateDisciplinePaths()
  return { success: true }
}
