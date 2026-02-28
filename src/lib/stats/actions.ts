"use server"

import { db } from "@/lib/db"
import { getAuthSession } from "@/lib/auth-helpers"

export type StatsFilters = {
  type?: "TRAINING" | "WETTKAMPF" | "all"
  from?: string // ISO-Datumsstring
  to?: string // ISO-Datumsstring
  disciplineId?: string // Optionaler Disziplin-Filter für server-seitige Abfragen
}

export type DisciplineForStats = {
  id: string
  name: string
  seriesCount: number
  shotsPerSeries: number
  scoringType: string
}

export type SeriesForStats = {
  position: number
  // Prisma Decimal wurde bereits zu number | null konvertiert — plain object für Client-Grenze
  scoreTotal: number | null
  isPractice: boolean
  // Tatsächliche Schussanzahl: aus shots-Array (wenn Einzelschüsse erfasst) oder Disziplin-Standard
  shotCount: number
  executionQuality: number | null
}

export type StatsSession = {
  id: string
  date: Date
  type: string
  disciplineId: string | null
  discipline: DisciplineForStats | null
  // Absolute Summe aller Wertungsserien (ohne Probeschüsse)
  totalScore: number | null
  // Normalisierter Durchschnitt pro Schuss — vergleichbar über Einheiten mit unterschiedlicher Schussanzahl
  avgPerShot: number | null
  // Gesamtschusszahl der Wertungsserien (Basis für avgPerShot)
  totalNonPracticeShots: number
  series: SeriesForStats[]
}

/**
 * Schussanzahl einer Serie bestimmen.
 * Wenn Einzelschüsse erfasst wurden, ist die Array-Länge die exakte Anzahl.
 * Ohne Einzelschüsse gilt der Disziplin-Standard (Näherungswert für flexible Serien).
 */
function resolveSeriesShotCount(shots: unknown, fallback: number): number {
  if (Array.isArray(shots) && shots.length > 0) return shots.length
  return fallback
}

/**
 * Lädt alle Einheiten des eingeloggten Nutzers mit den für Statistiken benötigten Daten.
 * Berechnet avgPerShot (normalisierter Durchschnitt pro Schuss) je Einheit —
 * damit sind Einheiten mit unterschiedlicher Serienzahl/Schussanzahl direkt vergleichbar.
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

  // Disziplin-Filter (optional, wird aktuell vom Client ausgeführt)
  if (filters.disciplineId && filters.disciplineId !== "all") {
    where.disciplineId = filters.disciplineId
  }

  // Zeitraum-Filter
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
      // Disziplin für Metadaten (Schusszahl, Wertungsart) und Hochrechnung
      discipline: {
        select: { id: true, name: true, seriesCount: true, shotsPerSeries: true, scoringType: true },
      },
      series: {
        select: {
          position: true,
          scoreTotal: true,
          isPractice: true,
          // shots wird benötigt um die tatsächliche Schussanzahl zu ermitteln
          shots: true,
          executionQuality: true,
        },
        orderBy: { position: "asc" },
      },
    },
    orderBy: { date: "asc" }, // Aufsteigend für Zeitverlauf-Charts
  })

  return sessions.map((s) => {
    const fallback = s.discipline?.shotsPerSeries ?? 10

    // Serien serialisieren + Schussanzahl pro Serie ermitteln
    const series: SeriesForStats[] = s.series.map((serie) => ({
      position: serie.position,
      scoreTotal: serie.scoreTotal !== null ? parseFloat(String(serie.scoreTotal)) : null,
      isPractice: serie.isPractice,
      shotCount: resolveSeriesShotCount(serie.shots, fallback),
      executionQuality: serie.executionQuality,
    }))

    // Nur Wertungsserien (keine Probeschüsse) mit vorhandenem Ergebnis
    const scoredNonPractice = series.filter((s) => !s.isPractice && s.scoreTotal !== null)
    const totalScore = scoredNonPractice.reduce((sum, s) => sum + (s.scoreTotal ?? 0), 0)
    const totalNonPracticeShots = scoredNonPractice.reduce((sum, s) => sum + s.shotCount, 0)

    return {
      id: s.id,
      date: s.date,
      type: s.type,
      disciplineId: s.disciplineId,
      discipline: s.discipline ?? null,
      totalScore: scoredNonPractice.length > 0 ? totalScore : null,
      // avgPerShot ist null wenn keine Wertungsserien vorhanden (z.B. Trockentraining ohne Ergebnis)
      avgPerShot: totalNonPracticeShots > 0 ? totalScore / totalNonPracticeShots : null,
      totalNonPracticeShots,
      series,
    }
  })
}

export type WellbeingCorrelationPoint = {
  // Normalisierter Durchschnitt pro Schuss — vergleichbar über Disziplinen
  avgPerShot: number
  disciplineId: string | null
  sleep: number
  energy: number
  stress: number
  motivation: number
}

/**
 * Lädt Einheiten mit Wellbeing-Daten für die Befinden-Korrelationsauswertung.
 * Verwendet avgPerShot statt totalScore — Disziplin-übergreifend vergleichbar.
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

  if (filters.disciplineId && filters.disciplineId !== "all") {
    where.disciplineId = filters.disciplineId
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
      discipline: { select: { shotsPerSeries: true } },
      series: {
        select: { scoreTotal: true, isPractice: true, shots: true },
      },
    },
  })

  const result: WellbeingCorrelationPoint[] = []
  for (const s of sessions) {
    if (!s.wellbeing) continue

    const fallback = s.discipline?.shotsPerSeries ?? 10
    let totalScore = 0
    let totalShots = 0

    for (const serie of s.series) {
      if (serie.isPractice || serie.scoreTotal === null) continue
      const score = parseFloat(String(serie.scoreTotal))
      if (isNaN(score)) continue
      totalScore += score
      totalShots += resolveSeriesShotCount(serie.shots, fallback)
    }

    const avgPerShot = totalShots > 0 ? totalScore / totalShots : null
    if (avgPerShot === null || avgPerShot <= 0) continue

    result.push({
      avgPerShot,
      disciplineId: s.disciplineId,
      sleep: s.wellbeing.sleep,
      energy: s.wellbeing.energy,
      stress: s.wellbeing.stress,
      motivation: s.wellbeing.motivation,
    })
  }

  return result
}

export type ShotDistributionPoint = {
  date: Date
  sessionId: string
  disciplineId: string | null
  totalShots: number
  // Ring-Buckets als Prozentsatz (0.0–100.0), Schlüssel "r0"–"r10"
  r0: number
  r1: number
  r2: number
  r3: number
  r4: number
  r5: number
  r6: number
  r7: number
  r8: number
  r9: number
  r10: number
}

/**
 * Lädt Einheiten mit Einzelschüssen für die zeitliche Schussverteilungs-Analyse.
 * Pro Einheit: Prozentsatz der Treffer je Ringwert (0–10), normalisiert auf 100%.
 * Einheiten ohne Einzelschüsse werden übersprungen.
 * Bei Zehntelwertung werden Schusswerte auf den nächsttieferen ganzen Ring gefloort.
 */
export async function getShotDistributionData(
  filters: StatsFilters
): Promise<ShotDistributionPoint[]> {
  const session = await getAuthSession()
  if (!session) return []

  const where: Record<string, unknown> = {
    userId: session.user.id,
  }

  if (filters.type && filters.type !== "all") {
    where.type = filters.type
  }

  if (filters.disciplineId && filters.disciplineId !== "all") {
    where.disciplineId = filters.disciplineId
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
    select: {
      id: true,
      date: true,
      disciplineId: true,
      discipline: { select: { scoringType: true } },
      series: {
        select: { shots: true, isPractice: true },
      },
    },
    orderBy: { date: "asc" },
  })

  const result: ShotDistributionPoint[] = []

  for (const s of sessions) {
    const isDecimal = s.discipline?.scoringType === "TENTH"

    // Alle Schüsse aus Wertungsserien sammeln
    const allShots: number[] = []
    for (const serie of s.series) {
      if (serie.isPractice) continue
      if (!Array.isArray(serie.shots)) continue
      for (const shot of serie.shots as unknown[]) {
        if (typeof shot !== "string") continue
        const value = parseFloat(shot)
        if (isNaN(value)) continue
        allShots.push(value)
      }
    }

    // Einheiten ohne Einzelschüsse überspringen
    const totalShots = allShots.length
    if (totalShots === 0) continue

    // Buckets zählen — flooren für Zehntelwertung
    const counts = new Array(11).fill(0)
    for (const value of allShots) {
      const bucket = isDecimal ? Math.floor(value) : Math.round(value)
      const clamped = Math.max(0, Math.min(10, bucket))
      counts[clamped]++
    }

    // Prozentsatz pro Bucket berechnen (auf 1 Dezimalstelle gerundet)
    const toPercent = (count: number) =>
      Math.round((count / totalShots) * 1000) / 10

    result.push({
      date: s.date,
      sessionId: s.id,
      disciplineId: s.disciplineId,
      totalShots,
      r0: toPercent(counts[0]),
      r1: toPercent(counts[1]),
      r2: toPercent(counts[2]),
      r3: toPercent(counts[3]),
      r4: toPercent(counts[4]),
      r5: toPercent(counts[5]),
      r6: toPercent(counts[6]),
      r7: toPercent(counts[7]),
      r8: toPercent(counts[8]),
      r9: toPercent(counts[9]),
      r10: toPercent(counts[10]),
    })
  }

  return result
}

export type QualityVsScorePoint = {
  quality: number
  // Normalisiert: Ringe/Schuss dieser Serie — vergleichbar über Serien unterschiedlicher Länge
  scorePerShot: number
  disciplineId: string | null
}

/**
 * Lädt Serien mit Ausführungsqualität für die Qualitäts-/Ergebnis-Korrelation.
 * Normalisiert auf Ringe/Schuss damit Serien unterschiedlicher Länge vergleichbar sind.
 */
export async function getQualityVsScoreData(
  filters: StatsFilters
): Promise<QualityVsScorePoint[]> {
  const session = await getAuthSession()
  if (!session) return []

  const sessionFilter: Record<string, unknown> = {
    userId: session.user.id,
    type:
      filters.type && filters.type !== "all"
        ? filters.type
        : { in: ["TRAINING", "WETTKAMPF"] },
  }

  if (filters.disciplineId && filters.disciplineId !== "all") {
    sessionFilter.disciplineId = filters.disciplineId
  }

  if (filters.from || filters.to) {
    const dateFilter: Record<string, Date> = {}
    if (filters.from) dateFilter.gte = new Date(filters.from)
    if (filters.to) {
      const to = new Date(filters.to)
      to.setHours(23, 59, 59, 999)
      dateFilter.lte = to
    }
    sessionFilter.date = dateFilter
  }

  const series = await db.series.findMany({
    where: {
      session: sessionFilter,
      executionQuality: { not: null },
      isPractice: false,
      scoreTotal: { not: null },
    },
    select: {
      executionQuality: true,
      scoreTotal: true,
      shots: true,
      session: {
        select: {
          disciplineId: true,
          discipline: { select: { shotsPerSeries: true } },
        },
      },
    },
  })

  return series
    .filter((s) => s.executionQuality !== null && s.scoreTotal !== null)
    .map((s) => {
      const score = parseFloat(String(s.scoreTotal))
      const fallback = s.session.discipline?.shotsPerSeries ?? 10
      const shotCount = resolveSeriesShotCount(s.shots, fallback)
      return {
        quality: s.executionQuality!,
        scorePerShot: score / shotCount,
        disciplineId: s.session.disciplineId,
      }
    })
}
