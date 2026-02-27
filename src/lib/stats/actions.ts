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

export type WellbeingCorrelationPoint = {
  totalScore: number
  sleep: number
  energy: number
  stress: number
  motivation: number
}

/**
 * Lädt Einheiten mit Wellbeing-Daten für die Befinden-Korrelationsauswertung.
 * Nur Einheiten mit sowohl Wellbeing-Daten als auch einem Gesamtergebnis werden zurückgegeben.
 */
export async function getWellbeingCorrelationData(
  filters: StatsFilters
): Promise<WellbeingCorrelationPoint[]> {
  const session = await getAuthSession()
  if (!session) return []

  const where: Record<string, unknown> = {
    userId: session.user.id,
    // Nur Einheiten mit Wellbeing-Daten
    wellbeing: { isNot: null },
    // Nur schiessende Einheiten (haben Ergebnisse)
    type: filters.type && filters.type !== "all" ? filters.type : { in: ["TRAINING", "WETTKAMPF"] },
  }

  if (filters.from || filters.to) {
    const dateFilter: Record<string, Date> = {}
    if (filters.from) dateFilter.gte = new Date(filters.from)
    if (filters.to) {
      const to = new Date(filters.to)
      to.setHours(23, 59, 59, 999)
      dateFilter.lte = to
    }
    where.date = dateFilter
  }

  const sessions = await db.trainingSession.findMany({
    where,
    include: {
      wellbeing: true,
      series: {
        select: { scoreTotal: true, isPractice: true },
      },
    },
  })

  const result: WellbeingCorrelationPoint[] = []
  for (const s of sessions) {
    if (!s.wellbeing) continue
    const seriesForCalc = s.series.map((serie) => ({
      scoreTotal: serie.scoreTotal !== null ? parseFloat(String(serie.scoreTotal)) : null,
      isPractice: serie.isPractice,
    }))
    const totalScore = calculateTotalScore(seriesForCalc)
    // Nur Einheiten mit Ergebnis > 0 verwenden
    if (totalScore <= 0) continue

    result.push({
      totalScore,
      sleep: s.wellbeing.sleep,
      energy: s.wellbeing.energy,
      stress: s.wellbeing.stress,
      motivation: s.wellbeing.motivation,
    })
  }

  return result
}

export type QualityVsScorePoint = {
  quality: number
  score: number
}

/**
 * Lädt Serien mit Ausführungsqualität für die Qualitäts-/Ergebnis-Korrelation.
 * Nur Serien mit gesetzter Ausführungsqualität und einem Ergebnis werden zurückgegeben.
 */
export async function getQualityVsScoreData(
  filters: StatsFilters
): Promise<QualityVsScorePoint[]> {
  const session = await getAuthSession()
  if (!session) return []

  const where: Record<string, unknown> = {
    session: {
      userId: session.user.id,
      type:
        filters.type && filters.type !== "all"
          ? filters.type
          : { in: ["TRAINING", "WETTKAMPF"] },
    },
    // Nur Serien mit Ausführungsqualität
    executionQuality: { not: null },
    // Keine Probeschüsse
    isPractice: false,
    // Nur Serien mit Ergebnis
    scoreTotal: { not: null },
  }

  if (filters.from || filters.to) {
    const dateFilter: Record<string, Date> = {}
    if (filters.from) dateFilter.gte = new Date(filters.from)
    if (filters.to) {
      const to = new Date(filters.to)
      to.setHours(23, 59, 59, 999)
      dateFilter.lte = to
    }
    // Datum-Filter auf die verknüpfte Session anwenden
    where.session = { ...(where.session as object), date: dateFilter }
  }

  const series = await db.series.findMany({
    where,
    select: {
      executionQuality: true,
      scoreTotal: true,
    },
  })

  return series
    .filter((s) => s.executionQuality !== null && s.scoreTotal !== null)
    .map((s) => ({
      quality: s.executionQuality!,
      score: parseFloat(String(s.scoreTotal)),
    }))
}
