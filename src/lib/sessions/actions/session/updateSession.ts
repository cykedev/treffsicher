import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { type SessionTransactionClient } from "@/lib/sessions/actions/shared"
import {
  buildSessionWriteData,
  prepareSessionWriteInput,
  replaceSessionSeries,
  syncSessionGoals,
} from "@/lib/sessions/actions/session/sessionWriteShared"
import type { ActionResult } from "@/lib/sessions/actions/types"

export async function updateSessionAction(id: string, formData: FormData): Promise<ActionResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  const existing = await db.trainingSession.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  })
  if (!existing) return { error: "Einheit nicht gefunden" }

  const prepared = await prepareSessionWriteInput(formData, session.user.id, {
    action: "updateSession",
    sessionId: id,
  })
  if ("error" in prepared) return prepared

  await db.$transaction(async (tx: SessionTransactionClient) => {
    await tx.trainingSession.update({
      where: { id },
      data: buildSessionWriteData(prepared),
    })

    await replaceSessionSeries(tx, id, prepared.seriesData)
    await syncSessionGoals(tx, id, session.user.id, prepared.selectedGoalIds, true)
  })

  // Revalidierung vor Redirect sorgt für konsistente Listen/Detailansichten nach dem Speichern.
  revalidatePath("/sessions")
  revalidatePath(`/sessions/${id}`)
  revalidatePath("/goals")
  redirect(`/sessions/${id}`)
}
