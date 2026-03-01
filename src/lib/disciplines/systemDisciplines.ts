import type { PrismaClient, ScoringType } from "../../generated/prisma/client"

interface SystemDiscipline {
  name: string
  seriesCount: number
  shotsPerSeries: number
  practiceSeries: number
  scoringType: ScoringType
}

const systemDisciplines: SystemDiscipline[] = [
  {
    name: "Luftpistole",
    seriesCount: 4,
    shotsPerSeries: 10,
    practiceSeries: 0,
    scoringType: "WHOLE",
  },
  {
    name: "Luftgewehr",
    seriesCount: 4,
    shotsPerSeries: 10,
    practiceSeries: 0,
    scoringType: "WHOLE",
  },
  {
    name: "Luftgewehr (Zehntel)",
    seriesCount: 4,
    shotsPerSeries: 10,
    practiceSeries: 0,
    scoringType: "TENTH",
  },
  {
    name: "Luftpistole Auflage",
    seriesCount: 3,
    shotsPerSeries: 10,
    practiceSeries: 0,
    scoringType: "TENTH",
  },
  {
    name: "Luftgewehr Auflage",
    seriesCount: 3,
    shotsPerSeries: 10,
    practiceSeries: 0,
    scoringType: "TENTH",
  },
]

function buildSystemDisciplineId(name: string): string {
  return `system-${name.toLowerCase().replace(/\s+/g, "-").replace(/[()]/g, "")}`
}

export async function ensureSystemDisciplines(prisma: PrismaClient): Promise<number> {
  let createdCount = 0

  for (const discipline of systemDisciplines) {
    const id = buildSystemDisciplineId(discipline.name)

    const existing = await prisma.discipline.findUnique({
      where: { id },
      select: { id: true },
    })

    if (existing) {
      continue
    }

    await prisma.discipline.create({
      data: {
        id,
        ...discipline,
        isSystem: true,
        ownerId: null,
      },
    })

    createdCount++
  }

  return createdCount
}
