import { calculateTotalScore } from "@/lib/sessions/calculateScore"
import { getSeriesMax, type ScoringType } from "@/lib/sessions/validation"
import { SESSION_TYPE_BADGE_CLASS, SESSION_TYPE_LABELS } from "@/lib/sessions/presentation"
import type { SessionWithDiscipline } from "@/lib/sessions/actions"

type NormalizedSeries = {
  scoreTotal: number | null
  isPractice: boolean
  shots: unknown
}

type SessionListResultModel = {
  formattedScore: string
  formattedMaxScore: string | null
  shotsLabel: string
  isPracticeOnly: boolean
}

export type SessionListItemModel = {
  id: string
  isFavourite: boolean
  typeLabel: string
  typeBadgeClass: string
  disciplineName: string | null
  formattedDate: string
  location: string | null
  trainingGoal: string | null
  mentalLabels: string[]
  result: SessionListResultModel | null
}

function formatDate(date: Date, displayTimeZone: string): string {
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: displayTimeZone,
  }).format(new Date(date))
}

function normalizeSeries(
  series: Array<{ scoreTotal: unknown; isPractice: boolean; shots: unknown }>
): NormalizedSeries[] {
  return series.map((entry) => ({
    scoreTotal: entry.scoreTotal !== null ? Number(entry.scoreTotal) : null,
    isPractice: entry.isPractice,
    shots: entry.shots,
  }))
}

function getSeriesShotCount(series: NormalizedSeries, shotsPerSeries: number): number {
  if (Array.isArray(series.shots) && series.shots.length > 0) {
    return series.shots.length
  }
  return shotsPerSeries
}

function buildResultModel(
  session: SessionWithDiscipline,
  normalizedSeries: NormalizedSeries[]
): SessionListResultModel | null {
  const totalScore = calculateTotalScore(
    normalizedSeries.map((series) => ({
      scoreTotal: series.scoreTotal,
      isPractice: series.isPractice,
    }))
  )
  const hasSeries = session.series.length > 0
  const scoringType = session.discipline?.scoringType as ScoringType | undefined
  const shotsPerSeries = session.discipline?.shotsPerSeries ?? 0

  const scoringSeries = normalizedSeries.filter(
    (series) => !series.isPractice && series.scoreTotal !== null
  )
  const totalScoringShots = scoringSeries.reduce(
    (sum, series) => sum + getSeriesShotCount(series, shotsPerSeries),
    0
  )

  const practiceSeries = normalizedSeries.filter(
    (series) => series.isPractice && series.scoreTotal !== null
  )
  const totalPracticeShots = practiceSeries.reduce(
    (sum, series) => sum + getSeriesShotCount(series, shotsPerSeries),
    0
  )
  const totalPracticeScore = practiceSeries.reduce(
    (sum, series) => sum + (series.scoreTotal ?? 0),
    0
  )

  const hasScoringResult = totalScore > 0
  const hasPracticeOnlyResult = scoringSeries.length === 0 && practiceSeries.length > 0
  const shouldShowResult = hasSeries && (hasScoringResult || hasPracticeOnlyResult)
  if (!shouldShowResult) return null

  // Für reine Probe-Einheiten trotzdem ein Ergebnis anzeigen, damit Listenkarten nicht "leer" wirken.
  const displayScore = hasPracticeOnlyResult ? totalPracticeScore : totalScore
  const displayShots = hasPracticeOnlyResult ? totalPracticeShots : totalScoringShots
  const displayMaxScore =
    scoringType && displayShots > 0 ? getSeriesMax(scoringType, displayShots) : 0
  const formattedScore = scoringType === "TENTH" ? displayScore.toFixed(1) : String(displayScore)
  const formattedMaxScore =
    displayMaxScore > 0
      ? scoringType === "TENTH"
        ? displayMaxScore.toFixed(1)
        : String(displayMaxScore)
      : null

  const shotsLabel = hasPracticeOnlyResult
    ? `${totalPracticeShots} Sch.`
    : // Probe-Schüsse separat ausweisen, damit Wettkampfschüsse vergleichbar bleiben.
      totalScoringShots > 0
      ? `${totalScoringShots} Sch.${totalPracticeShots > 0 ? ` + ${totalPracticeShots} Probe` : ""}`
      : ""

  return {
    formattedScore,
    formattedMaxScore,
    shotsLabel,
    isPracticeOnly: hasPracticeOnlyResult,
  }
}

function buildMentalLabels(session: SessionWithDiscipline): string[] {
  const hasIndividualShots = session.series.some(
    (series) => Array.isArray(series.shots) && (series.shots as unknown[]).length > 0
  )
  const hasHitLocation =
    session.hitLocationHorizontalMm !== null &&
    session.hitLocationHorizontalDirection !== null &&
    session.hitLocationVerticalMm !== null &&
    session.hitLocationVerticalDirection !== null

  return [
    session.wellbeing && "Befinden",
    session.prognosis && "Prognose",
    session.feedback && "Feedback",
    session.reflection && "Reflexion",
    hasIndividualShots && "Einzelschüsse",
    hasHitLocation && "Trefferlage",
  ].filter((entry): entry is string => Boolean(entry))
}

export function buildSessionListItemModel(
  session: SessionWithDiscipline,
  displayTimeZone: string
): SessionListItemModel {
  const normalizedSeries = normalizeSeries(session.series)

  return {
    id: session.id,
    isFavourite: session.isFavourite,
    typeLabel: SESSION_TYPE_LABELS[session.type] ?? session.type,
    typeBadgeClass: SESSION_TYPE_BADGE_CLASS[session.type] ?? "",
    disciplineName: session.discipline?.name ?? null,
    formattedDate: formatDate(session.date, displayTimeZone),
    location: session.location,
    trainingGoal: session.trainingGoal,
    mentalLabels: buildMentalLabels(session),
    result: buildResultModel(session, normalizedSeries),
  }
}
