import type { SessionDetail } from "@/lib/sessions/actions"
import { calculateTotalScore } from "@/lib/sessions/calculateScore"
import { parseShotsJson } from "@/lib/sessions/shots"

export interface SessionDetailViewModel {
  totalScore: number | null
  hasScoring: boolean
  isDecimal: boolean
  hasPrognosisFeedback: boolean
  scoringShots: string[]
  hasAttachmentSection: boolean
  hasSeriesResults: boolean
  showShotDistribution: boolean
}

function toSeriesScoreTotal(value: unknown): number | null {
  if (typeof value === "number") return value
  if (value === null || value === undefined) return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

export function buildSessionDetailViewModel(sessionRecord: SessionDetail): SessionDetailViewModel {
  const hasScoring = sessionRecord.type === "TRAINING" || sessionRecord.type === "WETTKAMPF"
  const isDecimal = sessionRecord.discipline?.scoringType === "TENTH"
  const hasPrognosisFeedback = hasScoring

  const totalScore = calculateTotalScore(
    sessionRecord.series.map((series) => ({
      scoreTotal: toSeriesScoreTotal(series.scoreTotal),
      isPractice: series.isPractice,
    }))
  )

  const scoringShots = sessionRecord.series
    .filter((series) => !series.isPractice)
    .flatMap((series) => parseShotsJson(series.shots))

  const hasShots = scoringShots.length > 0
  const hasAttachmentSection = hasScoring
  const hasSeriesResults = hasScoring && sessionRecord.series.length > 0
  const showShotDistribution = hasScoring && hasShots

  return {
    totalScore,
    hasScoring,
    isDecimal,
    hasPrognosisFeedback,
    scoringShots,
    hasAttachmentSection,
    hasSeriesResults,
    showShotDistribution,
  }
}
