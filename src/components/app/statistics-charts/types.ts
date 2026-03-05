export type DisplayMode = "per_shot" | "projected"

export type RadarSeriesKey = "prognosis" | "feedback"

export type RadarLegendItem = {
  key: RadarSeriesKey
  label: string
  color: string
}

export type HitLocationPoint = {
  sessionId: string
  date: Date
  x: number
  y: number
  disciplineId: string | null
}

export type HitLocationPathPoint = {
  sessionId: string
  date: Date
  x: number
  y: number
}

export type HitLocationCurvePoint = {
  x: number
  y: number
}

export type ShotDistributionGranularity = "day" | "week" | "month"

export type AggregatedShotDistributionPoint = {
  i: number
  date: Date
  dateLabel: string
  tooltipLabel: string
  totalShots: number
  r0to6: number
  r7: number
  r8: number
  r9: number
  r10: number
}
