import { calculateMovingAverage } from "@/lib/stats/calculateMovingAverage"
import type { DisciplineForStats, ShotDistributionPoint, StatsSession } from "@/lib/stats/actions"
import {
  CHART_POINT_OPACITY,
  CHART_POINT_RADIUS,
  CHART_POINT_STROKE_WIDTH,
  CHART_TREND_POINT_ACTIVE_OPACITY,
  CHART_TREND_POINT_ACTIVE_RADIUS,
  CHART_TREND_POINT_OPACITY,
  CHART_TREND_POINT_RADIUS,
  TREND_BAND_HIGH_QUANTILE,
  TREND_BAND_LOW_QUANTILE,
  TREND_BAND_MAX_DISTANCE_RATIO,
  TREND_BAND_MIN_DISTANCE_RATIO,
  TREND_BAND_SMOOTH_WINDOW,
  TREND_BAND_WINDOW_SIZE,
  TREND_WINDOW_SIZE,
} from "@/components/app/statistics-charts/constants"
import type {
  DisplayMode,
  HitLocationCurvePoint,
  HitLocationPathPoint,
  HitLocationPoint,
  ShotDistributionGranularity,
} from "@/components/app/statistics-charts/types"

function niceNumber(value: number, round: boolean): number {
  if (!Number.isFinite(value) || value <= 0) return 1

  const exponent = Math.floor(Math.log10(value))
  const fraction = value / 10 ** exponent

  let niceFraction: number
  if (round) {
    if (fraction < 1.5) niceFraction = 1
    else if (fraction < 3) niceFraction = 2
    else if (fraction < 7) niceFraction = 5
    else niceFraction = 10
  } else {
    if (fraction <= 1) niceFraction = 1
    else if (fraction <= 2) niceFraction = 2
    else if (fraction <= 5) niceFraction = 5
    else niceFraction = 10
  }

  return niceFraction * 10 ** exponent
}

export function computeStableAxis(
  values: number[],
  targetTickCount = 5
): { domain: [number, number]; ticks: number[] } {
  if (values.length === 0) {
    return { domain: [0, 1], ticks: [0, 0.25, 0.5, 0.75, 1] }
  }

  let min = Math.min(...values)
  let max = Math.max(...values)

  if (min === max) {
    const padding = Math.max(Math.abs(min) * 0.02, 0.1)
    min -= padding
    max += padding
  } else {
    const range = max - min
    const padding = Math.max(range * 0.08, 0.1)
    min -= padding
    max += padding
  }

  const niceRange = niceNumber(max - min, false)
  const step = niceNumber(niceRange / Math.max(targetTickCount - 1, 1), true)
  const niceMin = Math.floor(min / step) * step
  const niceMax = Math.ceil(max / step) * step

  const ticks: number[] = []
  for (let tick = niceMin; tick <= niceMax + step * 0.5; tick += step) {
    ticks.push(Number(tick.toFixed(6)))
    if (ticks.length >= 12) break
  }

  return {
    domain: [ticks[0] ?? niceMin, ticks[ticks.length - 1] ?? niceMax],
    ticks,
  }
}

export function computeCenteredAxis(
  values: number[],
  minAbsMax = 1
): { domain: [number, number]; ticks: number[] } {
  if (values.length === 0) {
    return { domain: [-minAbsMax, minAbsMax], ticks: [-minAbsMax, 0, minAbsMax] }
  }

  const absMaxRaw = Math.max(...values.map((v) => Math.abs(v)))
  const absMax = Math.max(minAbsMax, absMaxRaw)
  const niceMax = niceNumber(absMax * 1.12, false)
  const half = Math.round((niceMax / 2) * 100) / 100

  return {
    domain: [-niceMax, niceMax],
    ticks: [-niceMax, -half, 0, half, niceMax],
  }
}

export function calculateMean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function monthsAgo(months: number): string {
  const d = new Date()
  d.setMonth(d.getMonth() - months)
  return formatLocalDate(d)
}

export function today(): string {
  return formatLocalDate(new Date())
}

export function parseDateInput(value: string, endOfDay: boolean): Date | null {
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return null
  return endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0)
}

/**
 * Anzeigewert je nach Modus berechnen.
 * per_shot: normalisierter Wert (Ringe/Schuss), 2 Stellen.
 * projected: Hochrechnung auf die Gesamtschusszahl der Disziplin.
 */
export function computeDisplayValue(
  avgPerShot: number,
  mode: DisplayMode,
  discipline: DisciplineForStats | null
): number {
  if (mode === "projected" && discipline) {
    const total = avgPerShot * discipline.shotsPerSeries * discipline.seriesCount
    // Zehntelwertung: 1 Dezimalstelle; Ganzringe: auf ganze Ringe runden
    return discipline.scoringType === "TENTH" ? Math.round(total * 10) / 10 : Math.round(total)
  }
  return avgPerShot
}

export function formatDisplayScore(
  value: number,
  mode: DisplayMode,
  discipline: DisciplineForStats | null
): string {
  if (mode === "projected" && discipline) {
    return discipline.scoringType === "TENTH" ? value.toFixed(1) : String(value)
  }
  return value.toFixed(2)
}

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

export function buildIndexTicks(length: number, maxTicks: number): number[] {
  if (length <= 0) return []
  if (length <= maxTicks) return Array.from({ length }, (_, i) => i)
  if (maxTicks <= 1) return [0]

  const lastIndex = length - 1
  const step = lastIndex / (maxTicks - 1)
  const ticks = new Set<number>([0, lastIndex])

  for (let i = 1; i < maxTicks - 1; i++) {
    ticks.add(Math.round(step * i))
  }

  return [...ticks].sort((a, b) => a - b)
}

export function getShotDistributionGranularity(
  points: ShotDistributionPoint[]
): ShotDistributionGranularity {
  if (points.length <= 1) return "day"

  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY

  for (const point of points) {
    const time = new Date(point.date).getTime()
    if (!Number.isFinite(time)) continue
    min = Math.min(min, time)
    max = Math.max(max, time)
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) return "day"
  const spanDays = (max - min) / (24 * 60 * 60 * 1000)
  // Feiner aggregieren: bei moderaten Datenmengen und bis ca. 4-5 Monaten
  // Tagesansicht, bei langen Verläufen Wochenansicht; Monate erst bei sehr langen Zeiträumen.
  if (points.length <= 45 || spanDays <= 140) return "day"
  if (spanDays <= 500) return "week"
  return "month"
}

export function getShotDistributionBucketStart(
  dateValue: Date,
  granularity: ShotDistributionGranularity
): Date {
  const date = new Date(dateValue)
  date.setHours(0, 0, 0, 0)

  if (granularity === "month") {
    date.setDate(1)
    return date
  }

  if (granularity === "week") {
    const weekday = date.getDay()
    const distanceToMonday = (weekday + 6) % 7
    date.setDate(date.getDate() - distanceToMonday)
  }

  return date
}

export function createDotStyle(color: string) {
  return {
    r: CHART_TREND_POINT_RADIUS,
    fill: color,
    fillOpacity: CHART_TREND_POINT_OPACITY,
    stroke: "var(--background)",
    strokeWidth: CHART_POINT_STROKE_WIDTH,
  }
}

export function createActiveDotStyle(color: string) {
  return {
    r: CHART_TREND_POINT_ACTIVE_RADIUS,
    fill: color,
    fillOpacity: CHART_TREND_POINT_ACTIVE_OPACITY,
    stroke: "var(--background)",
    strokeWidth: CHART_POINT_STROKE_WIDTH,
  }
}

export function renderScatterPoint(props: { cx?: number; cy?: number }, color: string) {
  return (
    <circle
      cx={props.cx}
      cy={props.cy}
      r={CHART_POINT_RADIUS}
      fill={color}
      opacity={CHART_POINT_OPACITY}
      stroke="var(--background)"
      strokeWidth={CHART_POINT_STROKE_WIDTH}
    />
  )
}

export function createTrendStroke(color: string): string {
  // In sRGB bleibt der Original-Farbton stabiler; nur leicht mit Weiß aufhellen.
  return `color-mix(in srgb, ${color} 85%, white 15%)`
}

export function formatSignedMillimeters(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "–"
  const sign = value > 0 ? "+" : value < 0 ? "−" : "±"
  return `${sign}${Math.abs(value).toFixed(2)} mm`
}

export function formatDirectionalMillimeters(value: number | null, axis: "x" | "y"): string {
  if (value === null || !Number.isFinite(value)) return "–"

  const absValue = `${Math.abs(value).toFixed(2)} mm`

  if (axis === "x") {
    if (value > 0) return `→ ${absValue}`
    if (value < 0) return `← ${absValue}`
    return `↔ ${absValue}`
  }

  if (value > 0) return `↑ ${absValue}`
  if (value < 0) return `↓ ${absValue}`
  return `↕ ${absValue}`
}

export function mapSessionToHitLocationPoint(session: StatsSession): HitLocationPoint | null {
  if (
    session.hitLocationHorizontalMm === null ||
    session.hitLocationHorizontalDirection === null ||
    session.hitLocationVerticalMm === null ||
    session.hitLocationVerticalDirection === null
  ) {
    return null
  }

  const signedX =
    session.hitLocationHorizontalDirection === "RIGHT"
      ? session.hitLocationHorizontalMm
      : -session.hitLocationHorizontalMm
  const signedY =
    session.hitLocationVerticalDirection === "HIGH"
      ? session.hitLocationVerticalMm
      : -session.hitLocationVerticalMm

  return {
    sessionId: session.id,
    date: session.date,
    x: Math.round(signedX * 100) / 100,
    y: Math.round(signedY * 100) / 100,
    disciplineId: session.disciplineId,
  }
}

export function buildCatmullRomCurvePoints(
  points: HitLocationPathPoint[],
  samplesPerSegment = 8
): HitLocationCurvePoint[] {
  if (points.length === 0) return []
  if (points.length === 1) return [{ x: points[0].x, y: points[0].y }]
  if (points.length === 2) return points.map((point) => ({ x: point.x, y: point.y }))

  const curve: HitLocationCurvePoint[] = [{ x: points[0].x, y: points[0].y }]

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]

    for (let step = 1; step <= samplesPerSegment; step++) {
      const t = step / samplesPerSegment
      const t2 = t * t
      const t3 = t2 * t

      const x =
        0.5 *
        ((2 * p1.x +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3) as number)
      const y =
        0.5 *
        ((2 * p1.y +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3) as number)

      curve.push({ x, y })
    }
  }

  return curve
}
