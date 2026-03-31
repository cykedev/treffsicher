import type { RadarSeriesKey } from "@/components/app/statistics-charts/types"

// Farb-/Layoutkonstanten zentralisieren, damit alle Statistik-Karten dieselbe visuelle Sprache sprechen.
export const radarDimensions = [
  { label: "Kondition", prognosisKey: "fitnessPrognosis", feedbackKey: "fitnessFeedback" },
  { label: "Ernährung", prognosisKey: "nutritionPrognosis", feedbackKey: "nutritionFeedback" },
  { label: "Technik", prognosisKey: "techniquePrognosis", feedbackKey: "techniqueFeedback" },
  { label: "Taktik", prognosisKey: "tacticsPrognosis", feedbackKey: "tacticsFeedback" },
  {
    label: "Mentale Stärke",
    prognosisKey: "mentalStrengthPrognosis",
    feedbackKey: "mentalStrengthFeedback",
  },
  { label: "Umfeld", prognosisKey: "environmentPrognosis", feedbackKey: "environmentFeedback" },
  { label: "Material", prognosisKey: "equipmentPrognosis", feedbackKey: "equipmentFeedback" },
] as const

export const radarSeriesConfig: Record<RadarSeriesKey, { label: string; color: string }> = {
  prognosis: { label: "Prognose", color: "var(--chart-1)" },
  feedback: { label: "Feedback", color: "var(--chart-2)" },
}

const shotDistributionColors: Record<string, string> = {
  r0: "#edf1f5",
  r1: "#dae1e8",
  r2: "#c8d1da",
  r3: "#b5bec8",
  r4: "#9ca3af",
  r5: "#8896a0",
  r6: "#6b7280",
  r7: "#52606d",
  r8: "#374151",
  r9: "#eab308",
  r10: "#ef4444",
}

export const shotDistributionBundledColors = {
  r0to6: "color-mix(in srgb, #6b7280 74%, white 26%)",
  r7: shotDistributionColors.r7,
  r8: shotDistributionColors.r8,
  r9: shotDistributionColors.r9,
  r10: shotDistributionColors.r10,
} as const

export const HIT_LOCATION_CLOUD_MARGIN = { top: 12, right: 12, bottom: 12, left: 12 } as const
export const HIT_LOCATION_CLOUD_AXIS_SIZE = 44
export const HIT_LOCATION_CLOUD_TRAIL_STROKE = "color-mix(in srgb, var(--chart-1) 82%, white 18%)"
export const HIT_LOCATION_CLOUD_TRAIL_STROKE_WIDTH = 1.8
export const HIT_LOCATION_CLOUD_TRAIL_STROKE_OPACITY = 0.32
export const HIT_LOCATION_CLOUD_TRAIL_START_RADIUS = 1.8
export const HIT_LOCATION_CLOUD_TRAIL_END_RADIUS = 2.8
export const TREND_WINDOW_SIZE = 6
export const CHART_POINT_RADIUS = 6
export const CHART_POINT_OPACITY = 0.7
export const CHART_TREND_POINT_RADIUS = 3.8
export const CHART_TREND_POINT_ACTIVE_RADIUS = 4.8
export const CHART_TREND_POINT_OPACITY = 0.42
export const CHART_TREND_POINT_ACTIVE_OPACITY = 0.7
export const CHART_POINT_STROKE_WIDTH = 1
export const CHART_TREND_STROKE_WIDTH = 2.5
export const CHART_TREND_STROKE_OPACITY = 0.9
export const CHART_TREND_BAND_OPACITY = 0.3
export const CHART_TREND_BAND_FILL = "color-mix(in srgb, var(--chart-1) 72%, white 28%)"
export const TREND_BAND_STD_DEV_MULTIPLIER = 2.0
export const TREND_BAND_WINDOW_SIZE = 5
export const TREND_BAND_LOW_QUANTILE = 0.02
export const TREND_BAND_HIGH_QUANTILE = 0.98
export const TREND_BAND_MIN_DISTANCE_RATIO = 0.04
export const TREND_BAND_MAX_DISTANCE_RATIO = 0.35
export const HIT_LOCATION_TREND_BAND_OPACITY = 0.18
export const HIT_LOCATION_ZERO_LINE_STROKE_WIDTH = 0.8
export const HIT_LOCATION_ZERO_LINE_STROKE_OPACITY = 0.55
export const HIT_LOCATION_ZERO_LINE_STROKE =
  "color-mix(in oklch, var(--muted-foreground) 42%, oklch(1 0 0) 58%)"
export const CHART_TIME_AXIS_MAX_TICKS = 7
