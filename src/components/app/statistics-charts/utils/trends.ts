import { calculateMovingAverage } from "@/lib/stats/calculateMovingAverage"
import {
  TREND_BAND_HIGH_QUANTILE,
  TREND_BAND_LOW_QUANTILE,
  TREND_BAND_MAX_DISTANCE_RATIO,
  TREND_BAND_MIN_DISTANCE_RATIO,
  TREND_BAND_SMOOTH_WINDOW,
  TREND_BAND_WINDOW_SIZE,
  TREND_WINDOW_SIZE,
} from "@/components/app/statistics-charts/constants"

export function calculateTrend(values: (number | null)[]): (number | null)[] {
  return calculateMovingAverage(values, TREND_WINDOW_SIZE)
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
    const end = i
    const windowValues = values.slice(start, end + 1)
    if (windowValues.length === 0) {
      return { low: 0, high: 0 }
    }

    const sorted = [...windowValues].sort((a, b) => a - b)
    return {
      low: calculateQuantile(sorted, lowQuantile),
      high: calculateQuantile(sorted, highQuantile),
    }
  })
}

function calculateTrailingMovingAverage(values: number[], windowSize: number): number[] {
  if (values.length === 0 || windowSize <= 0) return []

  return values.map((_, i) => {
    const start = Math.max(0, i - windowSize + 1)
    const end = i
    const windowValues = values.slice(start, end + 1)
    if (windowValues.length === 0) return values[i] ?? 0
    return windowValues.reduce((sum, value) => sum + value, 0) / windowValues.length
  })
}

export function calculateTrendBandsByQuantile(
  values: number[],
  trends: (number | null)[],
  options: {
    minLowerDistance: number
    minUpperDistance: number
    maxLowerDistance: number
    maxUpperDistance: number
  }
): Array<{ low: number; high: number } | null> {
  if (values.length === 0 || trends.length === 0) return []

  const bandWindowSize = Math.max(TREND_BAND_WINDOW_SIZE, TREND_WINDOW_SIZE + 1)
  const residualValues = values.map((value, i) => {
    const trend = trends[i]
    if (trend === null) return 0
    return value - trend
  })
  const quantileBand = calculateRollingQuantileBand(
    residualValues,
    bandWindowSize,
    TREND_BAND_LOW_QUANTILE,
    TREND_BAND_HIGH_QUANTILE
  )
  const rawResidualLows = quantileBand.map((band) => band.low)
  const rawResidualHighs = quantileBand.map((band) => band.high)
  const smoothedResidualLows = calculateTrailingMovingAverage(
    rawResidualLows,
    TREND_BAND_SMOOTH_WINDOW
  )
  const smoothedResidualHighs = calculateTrailingMovingAverage(
    rawResidualHighs,
    TREND_BAND_SMOOTH_WINDOW
  )

  return trends.map((trend, i) => {
    if (trend === null) return null

    let low = trend + (smoothedResidualLows[i] ?? rawResidualLows[i] ?? 0)
    let high = trend + (smoothedResidualHighs[i] ?? rawResidualHighs[i] ?? 0)

    if (!Number.isFinite(low) || !Number.isFinite(high)) return null
    if (high < low) {
      const temp = low
      low = high
      high = temp
    }

    const rawLowerDistance = Math.abs(Math.min(0, low - trend))
    const rawUpperDistance = Math.abs(Math.max(0, high - trend))
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

export function createTrendBandDistanceOptions(
  range: number,
  minDistanceFloor: number,
  maxDistanceFloor: number
): {
  minLowerDistance: number
  minUpperDistance: number
  maxLowerDistance: number
  maxUpperDistance: number
} {
  const minDistance = Math.max(range * TREND_BAND_MIN_DISTANCE_RATIO, minDistanceFloor)
  const maxDistance = Math.max(range * TREND_BAND_MAX_DISTANCE_RATIO, maxDistanceFloor)
  return {
    minLowerDistance: minDistance,
    minUpperDistance: minDistance,
    maxLowerDistance: maxDistance,
    maxUpperDistance: maxDistance,
  }
}
