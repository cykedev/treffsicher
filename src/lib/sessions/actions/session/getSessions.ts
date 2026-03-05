import { getAuthSession } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import type { SessionWithDiscipline } from "@/lib/sessions/actions/types"

export async function getSessionsAction(): Promise<SessionWithDiscipline[]> {
  const session = await getAuthSession()
  if (!session) return []

  return db.trainingSession.findMany({
    where: {
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
      wellbeing: { select: { id: true } },
      reflection: { select: { id: true } },
      prognosis: { select: { id: true } },
      feedback: { select: { id: true } },
    },
    orderBy: { date: "desc" },
  })
}
