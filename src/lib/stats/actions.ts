"use server"

import { db } from "@/lib/db"
import { getAuthSession } from "@/lib/auth-helpers"
import { calculateTotalScore } from "@/lib/sessions/calculateScore"

export type StatsFilters = {
  type?: "TRAINING" | "WETTKAMPF" | "all"
  from?: string // ISO-Datumsstring
  to?: string // ISO-Datumsstring
}

export type SeriesForStats = {
  position: number
  // Prisma Decimal wurde bereits zu number | null konvertiert — plain object für Client-Grenze
  scoreTotal: number | null
  isPractice: boolean
}

export type StatsSession = {
  id: string
  date: Date
  type: string
  totalScore: number | null
  series: SeriesForStats[]
}

/**
 * Lädt alle Einheiten des eingeloggten Nutzers mit den für Statistiken benötigten Daten.
 * Filter für Typ und Zeitraum werden serverseitig angewendet.
 */
export async function getStatsData(filters: StatsFilters): Promise<StatsSession[]> {
  const session = await getAuthSession()
  if (!session) return []

  const where: Record<string, unknown> = {
    userId: session.user.id,
  }

  // Typ-Filter: TRAINING, WETTKAMPF oder beides
  if (filters.type && filters.type !== "all") {
    where.type = filters.type
  }

  // Zeitraum-Filter
  if (filters.from || filters.to) {
    const dateFilter: Record<string, Date> = {}
    if (filters.from) dateFilter.gte = new Date(filters.from)
    if (filters.to) {
      // Bis-Datum inklusive: Ende des Tages setzen
      const to = new Date(filters.to)
      to.setHours(23, 59, 59, 999)
      dateFilter.lte = to
    }
    where.date = dateFilter
  }

  const sessions = await db.trainingSession.findMany({
    where,
    include: {
      series: {
        select: {
          position: true,
          scoreTotal: true,
          isPractice: true,
        },
        orderBy: { position: "asc" },
      },
    },
    orderBy: { date: "asc" }, // Aufsteigend für Zeitverlauf-Charts
  })

  return sessions.map((s) => {
    const seriesForCalc = s.series.map((serie) => ({
      scoreTotal: serie.scoreTotal !== null ? parseFloat(String(serie.scoreTotal)) : null,
      isPractice: serie.isPractice,
    }))

    const totalScore = calculateTotalScore(seriesForCalc)

    return {
      id: s.id,
      date: s.date,
      type: s.type,
      // Null wenn keine Wertungsserien vorhanden (z.B. Trockentraining)
      totalScore: s.series.some((s) => !s.isPractice) ? totalScore : null,
      // Decimal → number konvertieren: Prisma Decimal-Objekte können nicht über die
      // Server→Client-Grenze (Next.js serialisiert nur plain objects)
      series: s.series.map((serie) => ({
        position: serie.position,
        scoreTotal:
          serie.scoreTotal !== null ? parseFloat(String(serie.scoreTotal)) : null,
        isPractice: serie.isPractice,
      })),
    }
  })
}
