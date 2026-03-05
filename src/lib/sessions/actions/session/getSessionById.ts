import { getAuthSession } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import type { SessionDetail } from "@/lib/sessions/actions/types"

export async function getSessionByIdAction(id: string): Promise<SessionDetail | null> {
  const session = await getAuthSession()
  if (!session) return null

  const result = await db.trainingSession.findFirst({
    where: {
      id,
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

  return {
    ...result,
    series: result.series.map((series) => ({
      ...series,
      scoreTotal: series.scoreTotal !== null ? parseFloat(String(series.scoreTotal)) : null,
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
