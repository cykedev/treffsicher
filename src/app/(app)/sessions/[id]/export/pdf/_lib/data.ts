import { db } from "@/lib/db"

export async function fetchExportTrainingSession(id: string, userId: string) {
  return db.trainingSession.findFirst({
    where: {
      id,
      userId,
    },
    include: {
      discipline: {
        select: {
          name: true,
          scoringType: true,
        },
      },
      series: {
        orderBy: { position: "asc" },
      },
      wellbeing: true,
      reflection: true,
      prognosis: true,
      feedback: true,
      goals: {
        include: {
          goal: {
            select: {
              title: true,
            },
          },
        },
      },
    },
  })
}

export type ExportTrainingSession = NonNullable<
  Awaited<ReturnType<typeof fetchExportTrainingSession>>
>
