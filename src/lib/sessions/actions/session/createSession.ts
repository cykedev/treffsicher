import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { type SessionTransactionClient } from "@/lib/sessions/actions/shared"
import { buildSessionWriteData, createSessionSeries, prepareSessionWriteInput, syncSessionGoals } from "@/lib/sessions/actions/session/sessionWriteShared"
import type { ActionResult } from "@/lib/sessions/actions/types"

export async function createSessionAction(formData: FormData): Promise<ActionResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  const prepared = await prepareSessionWriteInput(formData, session.user.id, {
    action: "createSession",
  })
  if ("error" in prepared) return prepared

  const created = await db.$transaction(async (tx: SessionTransactionClient) => {
    const trainingSession = await tx.trainingSession.create({
      data: {
        userId: session.user.id,
        ...buildSessionWriteData(prepared),
      },
    })

    await createSessionSeries(tx, trainingSession.id, prepared.seriesData)
    await syncSessionGoals(tx, trainingSession.id, session.user.id, prepared.selectedGoalIds, false)

    return trainingSession
  })

  revalidatePath("/sessions")
  revalidatePath("/goals")
  redirect(`/sessions/${created.id}`)
}
