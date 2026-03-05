export type StatsFilters = {
  type?: "TRAINING" | "WETTKAMPF" | "all"
  from?: string
  to?: string
  disciplineId?: string
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
  scoreTotal: number | null
  isPractice: boolean
  shotCount: number
  executionQuality: number | null
}

export type StatsSession = {
  id: string
  date: Date
  type: string
  disciplineId: string | null
  discipline: DisciplineForStats | null
  hitLocationHorizontalMm: number | null
  hitLocationHorizontalDirection: "LEFT" | "RIGHT" | null
  hitLocationVerticalMm: number | null
  hitLocationVerticalDirection: "HIGH" | "LOW" | null
  totalScore: number | null
  avgPerShot: number | null
  totalNonPracticeShots: number
  series: SeriesForStats[]
}

export type WellbeingCorrelationPoint = {
  sessionId: string
  avgPerShot: number
  disciplineId: string | null
  sleep: number
  energy: number
  stress: number
  motivation: number
}

export type ShotDistributionPoint = {
  date: Date
  sessionId: string
  disciplineId: string | null
  totalShots: number
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

export type QualityVsScorePoint = {
  sessionId: string
  quality: number
  scorePerShot: number
  disciplineId: string | null
}

export type RadarComparisonSession = {
  sessionId: string
  date: Date
  disciplineId: string | null
  fitnessPrognosis: number
  nutritionPrognosis: number
  techniquePrognosis: number
  tacticsPrognosis: number
  mentalStrengthPrognosis: number
  environmentPrognosis: number
  equipmentPrognosis: number
  fitnessFeedback: number
  nutritionFeedback: number
  techniqueFeedback: number
  tacticsFeedback: number
  mentalStrengthFeedback: number
  environmentFeedback: number
  equipmentFeedback: number
}
