import { revalidatePath } from "next/cache"
import { getAuthSession } from "@/lib/auth-helpers"
import { db } from "@/lib/db"

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
