import { db } from "@/lib/db"
import { revalidateDisciplinePaths, requireAuthSession } from "@/lib/disciplines/actions/shared"
import type { ActionResult } from "@/lib/disciplines/types"

export async function setFavouriteDisciplineAction(disciplineId: string): Promise<ActionResult> {
  const session = await requireAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { favouriteDisciplineId: true },
  })
  if (!user) return { error: "Nutzer nicht gefunden." }

  const nextFavouriteId = user.favouriteDisciplineId === disciplineId ? null : disciplineId
  if (nextFavouriteId) {
    const discipline = await db.discipline.findFirst({
      where: {
        id: nextFavouriteId,
        isArchived: false,
        OR: [{ isSystem: true }, { ownerId: session.user.id }],
      },
      select: { id: true },
    })
    if (!discipline) {
      return { error: "Disziplin nicht gefunden oder keine Berechtigung." }
    }
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { favouriteDisciplineId: nextFavouriteId },
  })

  revalidateDisciplinePaths()
  return { success: true }
}
