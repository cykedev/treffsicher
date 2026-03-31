import { calculateWeightedMovingAverage } from "@/lib/stats/calculateMovingAverage"
import {
  TREND_BAND_HIGH_QUANTILE,
  TREND_BAND_LOW_QUANTILE,
  TREND_BAND_MAX_DISTANCE_RATIO,
  TREND_BAND_MIN_DISTANCE_RATIO,
  TREND_BAND_STD_DEV_MULTIPLIER,
  TREND_BAND_WINDOW_SIZE,
  TREND_WINDOW_SIZE,
} from "@/components/app/statistics-charts/constants"

export function calculateTrend(values: (number | null)[]): (number | null)[] {
  return calculateWeightedMovingAverage(values, TREND_WINDOW_SIZE)
}

type DistanceOptions = {
  minLowerDistance: number
  minUpperDistance: number
  maxLowerDistance: number
  maxUpperDistance: number
}

// Gemeinsame Logik für Mindest-/Maximalabstände beider Band-Varianten.
function applyDistanceConstraints(
  trends: (number | null)[],
  residualBand: Array<{ low: number; high: number }>,
  options: DistanceOptions
): Array<{ low: number; high: number } | null> {
  return trends.map((trend, i) => {
    if (trend === null) return null

    const band = residualBand[i]
    if (!band) return null

    let low = trend + band.low
    let high = trend + band.high

    if (!Number.isFinite(low) || !Number.isFinite(high)) return null
    if (high < low) {
      const temp = low
      low = high
      high = temp
    }

    const rawLowerDistance = Math.abs(Math.min(0, low - trend))
    const rawUpperDistance = Math.abs(Math.max(0, high - trend))
    // Mindest-/Maximalabstände halten das Band visuell stabil über ruhige und volatile Phasen hinweg.
    const lowerDistance = Math.min(
      options.maxLowerDistance,
      Math.max(options.minLowerDistance, rawLowerDistance)
    )
    const upperDistance = Math.min(
      options.maxUpperDistance,
      Math.max(options.minUpperDistance, rawUpperDistance)
    )

    return { low: trend - lowerDistance, high: trend + upperDistance }
  })
}

function calculateRollingStdDevBand(
  residuals: number[],
  windowSize: number,
  multiplier: number
): Array<{ low: number; high: number }> {
  if (residuals.length === 0 || windowSize <= 0) return []

  return residuals.map((_, i) => {
    // Trailing-Window verhindert einen Look-Ahead-Effekt in historischen Trenddarstellungen.
    const start = Math.max(0, i - windowSize + 1)
    const windowValues = residuals.slice(start, i + 1)
    const mean = windowValues.reduce((sum, v) => sum + v, 0) / windowValues.length
    const variance = windowValues.reduce((sum, v) => sum + (v - mean) ** 2, 0) / windowValues.length
    const stdDev = Math.sqrt(variance)
    return { low: -multiplier * stdDev, high: multiplier * stdDev }
  })
}

function calculateQuantile(sortedValues: number[], quantile: number): number {
  if (sortedValues.length === 0) return 0
  if (sortedValues.length === 1) return sortedValues[0]

  const clampedQ = Math.max(0, Math.min(1, quantile))
  const index = (sortedValues.length - 1) * clampedQ
  const lowerIndex = Math.floor(index)
  const upperIndex = Math.ceil(index)

  if (lowerIndex === upperIndex) return sortedValues[lowerIndex]

  const weight = index - lowerIndex
  return sortedValues[lowerIndex] * (1 - weight) + sortedValues[upperIndex] * weight
}

function calculateRollingQuantileBand(
  values: number[],
  windowSize: number,
  lowQuantile = 0.2,
  highQuantile = 0.8
): Array<{ low: number; high: number }> {
  if (values.length === 0 || windowSize <= 0) return []

  return values.map((_, i) => {
    const start = Math.max(0, i - windowSize + 1)
    const windowValues = values.slice(start, i + 1)
    if (windowValues.length === 0) return { low: 0, high: 0 }
    const sorted = [...windowValues].sort((a, b) => a - b)
    return {
      low: calculateQuantile(sorted, lowQuantile),
      high: calculateQuantile(sorted, highQuantile),
    }
  })
}

// Std-Dev-basiertes Band für Ergebnis-Charts (Ringe/Punkte).
// Einzelne Ausreißer dominieren das Band nicht — es normalisiert sich
// sobald die volatile Phase aus dem Fenster rollt.
export function calculateTrendBands(
  values: number[],
  trends: (number | null)[],
  options: DistanceOptions
): Array<{ low: number; high: number } | null> {
  if (values.length === 0 || trends.length === 0) return []

  // Residuen (Messwert - Trend) zentrieren das Band um die Trendlinie statt um Rohwerte.
  const residuals = values.map((value, i) => {
    const trend = trends[i]
    if (trend === null) return 0
    return value - trend
  })
  const stdDevBand = calculateRollingStdDevBand(residuals, TREND_BAND_WINDOW_SIZE, TREND_BAND_STD_DEV_MULTIPLIER)
  return applyDistanceConstraints(trends, stdDevBand, options)
}

// Quantilbasiertes Band für Trefferlage-Charts (mm-Werte).
// Quantile liefern dort stabilere Bandbreiten als Std-Dev.
export function calculateTrendBandsByQuantile(
  values: number[],
  trends: (number | null)[],
  options: DistanceOptions
): Array<{ low: number; high: number } | null> {
  if (values.length === 0 || trends.length === 0) return []

  const residuals = values.map((value, i) => {
    const trend = trends[i]
    if (trend === null) return 0
    return value - trend
  })
  const quantileBand = calculateRollingQuantileBand(
    residuals,
    TREND_BAND_WINDOW_SIZE,
    TREND_BAND_LOW_QUANTILE,
    TREND_BAND_HIGH_QUANTILE
  )
  return applyDistanceConstraints(trends, quantileBand, options)
}

export function createTrendBandDistanceOptions(
  range: number,
  minDistanceFloor: number,
  maxDistanceFloor: number
): DistanceOptions {
  const minDistance = Math.max(range * TREND_BAND_MIN_DISTANCE_RATIO, minDistanceFloor)
  const maxDistance = Math.max(range * TREND_BAND_MAX_DISTANCE_RATIO, maxDistanceFloor)
  return {
    minLowerDistance: minDistance,
    minUpperDistance: minDistance,
    maxLowerDistance: maxDistance,
    maxUpperDistance: maxDistance,
  }
}
