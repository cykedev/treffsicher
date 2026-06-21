import { revalidatePath } from "next/cache"
import { getAuthSession } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import type { ActionResult } from "@/lib/sessions/actions/types"

export async function toggleFavouriteAction(sessionId: string): Promise<ActionResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet." }

  const existing = await db.trainingSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
    select: { isFavourite: true },
  })
  if (!existing) return { error: "Einheit nicht gefunden." }

  await db.trainingSession.update({
    where: { id: sessionId },
    data: { isFavourite: !existing.isFavourite },
  })

  revalidatePath("/sessions")
  revalidatePath(`/sessions/${sessionId}`)
  return { success: true }
}
