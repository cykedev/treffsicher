import { useMemo } from "react"
import type { HitLocationTrendDataPoint } from "@/components/app/statistics-charts/tabs/types"
import type {
  HitLocationPathPoint,
  HitLocationPoint,
} from "@/components/app/statistics-charts/types"
import {
  buildCatmullRomCurvePoints,
  calculateMean,
  calculateTrend,
  calculateTrendBandsByQuantile,
  computeCenteredAxis,
  createTrendBandDistanceOptions,
  mapSessionToHitLocationPoint,
} from "@/components/app/statistics-charts/utils"
import type { StatsSession } from "@/lib/stats/actions"

interface Params {
  filteredForTrend: StatsSession[]
  filtered: StatsSession[]
  displayTimeZone: string
  showCloudTrail: boolean
  showHitLocationTrendX: boolean
  showHitLocationTrendY: boolean
}

export function useHitLocationChartState({
  filteredForTrend,
  filtered,
  displayTimeZone,
  showCloudTrail,
  showHitLocationTrendX,
  showHitLocationTrendY,
}: Params) {
  const filteredHitLocationsForTrend = useMemo<HitLocationPoint[]>(() => {
    return filteredForTrend
      .map(mapSessionToHitLocationPoint)
      .filter((point): point is HitLocationPoint => point !== null)
  }, [filteredForTrend])

  const filteredHitLocations = useMemo<HitLocationPoint[]>(() => {
    return filtered
      .map(mapSessionToHitLocationPoint)
      .filter((point): point is HitLocationPoint => point !== null)
  }, [filtered])

  const hitLocationCloudAxes = useMemo(() => {
    // Zentrierte Achsen:
    // Trefferlage soll sofort als "rechts/links, hoch/tief um die Mitte"
    // lesbar bleiben, unabhaengig von Ausreissern.
    const values = filteredHitLocations.flatMap((point) => [point.x, point.y])
    const centered = computeCenteredAxis(values, 1)
    return {
      xDomain: centered.domain,
      xTicks: centered.ticks,
      yDomain: centered.domain,
      yTicks: centered.ticks,
    }
  }, [filteredHitLocations])

  const hitLocationMetrics = useMemo(() => {
    const xs = filteredHitLocations.map((point) => point.x)
    const ys = filteredHitLocations.map((point) => point.y)

    return {
      meanX: calculateMean(xs),
      meanY: calculateMean(ys),
    }
  }, [filteredHitLocations])

  const hitLocationCloudPathPoints = useMemo<HitLocationPathPoint[]>(() => {
    if (!showCloudTrail || filteredHitLocations.length === 0) return []

    const xTrendValues = calculateTrend(filteredHitLocations.map((point) => point.x))
    const yTrendValues = calculateTrend(filteredHitLocations.map((point) => point.y))

    return filteredHitLocations
      .map((point, i) => ({
        sessionId: point.sessionId,
        date: point.date,
        x: xTrendValues[i],
        y: yTrendValues[i],
      }))
      .filter(
        (point): point is HitLocationPathPoint =>
          typeof point.x === "number" &&
          Number.isFinite(point.x) &&
          typeof point.y === "number" &&
          Number.isFinite(point.y)
      )
  }, [filteredHitLocations, showCloudTrail])

  const hitLocationCloudPathVisualPoints = useMemo(() => {
    if (hitLocationCloudPathPoints.length <= 2) return hitLocationCloudPathPoints

    const MIN_VISUAL_DISTANCE_MM = 0.45
    // Mindestabstand fuer den Pfad:
    // Ohne Verdichtung liegen Trendpunkte oft fast deckungsgleich und erzeugen
    // visuelles Rauschen statt lesbarer Bewegung.
    const result: HitLocationPathPoint[] = [hitLocationCloudPathPoints[0]]

    for (let i = 1; i < hitLocationCloudPathPoints.length - 1; i++) {
      const point = hitLocationCloudPathPoints[i]
      const previous = result[result.length - 1]
      const dx = point.x - previous.x
      const dy = point.y - previous.y
      const distance = Math.hypot(dx, dy)
      if (distance >= MIN_VISUAL_DISTANCE_MM) result.push(point)
    }

    const last = hitLocationCloudPathPoints[hitLocationCloudPathPoints.length - 1]
    const tail = result[result.length - 1]
    if (last.sessionId !== tail.sessionId) result.push(last)

    return result
  }, [hitLocationCloudPathPoints])

  const hitLocationCloudPathStart = hitLocationCloudPathVisualPoints[0] ?? null
  const hitLocationCloudPathEnd =
    hitLocationCloudPathVisualPoints.length > 0
      ? hitLocationCloudPathVisualPoints[hitLocationCloudPathVisualPoints.length - 1]
      : null

  const hitLocationCloudCurvePoints = useMemo(
    () => buildCatmullRomCurvePoints(hitLocationCloudPathVisualPoints),
    [hitLocationCloudPathVisualPoints]
  )

  const hitLocationCloudCurveSegments = useMemo(() => {
    if (hitLocationCloudCurvePoints.length < 2) return []
    return hitLocationCloudCurvePoints
      .slice(1)
      .map((point, i) => [hitLocationCloudCurvePoints[i], point] as const)
  }, [hitLocationCloudCurvePoints])

  const hitLocationTrendBySessionId = useMemo(() => {
    const xValues = filteredHitLocationsForTrend.map((point) => point.x)
    const yValues = filteredHitLocationsForTrend.map((point) => point.y)
    const xTrendValues = calculateTrend(xValues)
    const yTrendValues = calculateTrend(yValues)

    const xRange = xValues.length > 0 ? Math.max(...xValues) - Math.min(...xValues) : 0
    const yRange = yValues.length > 0 ? Math.max(...yValues) - Math.min(...yValues) : 0
    // Quantilbasierte Trend-Baender:
    // Standardabweichung reagiert stark auf Ausreisser. Quantile liefern
    // in kleinen Sport-Datensaetzen stabilere Trend-Bandbreiten.
    const xBandValues = calculateTrendBandsByQuantile(
      xValues,
      xTrendValues,
      createTrendBandDistanceOptions(xRange, 0.12, 1.8)
    )
    const yBandValues = calculateTrendBandsByQuantile(
      yValues,
      yTrendValues,
      createTrendBandDistanceOptions(yRange, 0.12, 1.8)
    )

    const trendById = new Map<
      string,
      {
        xTrend: number | null
        yTrend: number | null
        xTrendLow: number | null
        xTrendHigh: number | null
        yTrendLow: number | null
        yTrendHigh: number | null
      }
    >()
    filteredHitLocationsForTrend.forEach((point, i) => {
      const xBand = xBandValues[i]
      const yBand = yBandValues[i]
      trendById.set(point.sessionId, {
        xTrend: xTrendValues[i],
        yTrend: yTrendValues[i],
        xTrendLow: xBand?.low ?? null,
        xTrendHigh: xBand?.high ?? null,
        yTrendLow: yBand?.low ?? null,
        yTrendHigh: yBand?.high ?? null,
      })
    })
    return trendById
  }, [filteredHitLocationsForTrend])

  const hitLocationTrendData = useMemo<HitLocationTrendDataPoint[]>(() => {
    if (filteredHitLocations.length === 0) return []

    const formatter = new Intl.DateTimeFormat("de-CH", {
      day: "2-digit",
      month: "2-digit",
      timeZone: displayTimeZone,
    })

    return filteredHitLocations.map((point, i) => {
      const trendEntry = hitLocationTrendBySessionId.get(point.sessionId)
      const xTrendLow = trendEntry?.xTrendLow ?? null
      const xTrendHigh = trendEntry?.xTrendHigh ?? null
      const yTrendLow = trendEntry?.yTrendLow ?? null
      const yTrendHigh = trendEntry?.yTrendHigh ?? null

      return {
        i,
        date: point.date,
        dateLabel: formatter.format(new Date(point.date)),
        x: point.x,
        y: point.y,
        xTrend: trendEntry?.xTrend ?? null,
        yTrend: trendEntry?.yTrend ?? null,
        xTrendLow,
        xTrendHigh,
        yTrendLow,
        yTrendHigh,
        xTrendBand:
          xTrendLow !== null && xTrendHigh !== null ? ([xTrendLow, xTrendHigh] as const) : null,
        yTrendBand:
          yTrendLow !== null && yTrendHigh !== null ? ([yTrendLow, yTrendHigh] as const) : null,
      }
    })
  }, [displayTimeZone, filteredHitLocations, hitLocationTrendBySessionId])

  const hitLocationTrendAxis = useMemo<{ domain: [number, number]; ticks: number[] }>(() => {
    const showXSeries = showHitLocationTrendX || !showHitLocationTrendY
    const showYSeries = showHitLocationTrendY || !showHitLocationTrendX
    // Achse aus allen sichtbaren Serienwerten berechnen:
    // Beim Umschalten einzelner Serien soll die Achse nicht springen oder
    // Werte abschneiden.
    const values = hitLocationTrendData
      .flatMap((point) => {
        const result: Array<number | null> = []
        if (showXSeries) {
          result.push(point.x, point.xTrend, point.xTrendLow, point.xTrendHigh)
        }
        if (showYSeries) {
          result.push(point.y, point.yTrend, point.yTrendLow, point.yTrendHigh)
        }
        return result
      })
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    return computeCenteredAxis(values, 1)
  }, [hitLocationTrendData, showHitLocationTrendX, showHitLocationTrendY])

  const showHitLocationTrendXSeries = showHitLocationTrendX || !showHitLocationTrendY
  const showHitLocationTrendYSeries = showHitLocationTrendY || !showHitLocationTrendX

  return {
    filteredHitLocations,
    hitLocationCloudAxes,
    hitLocationMetrics,
    hitLocationCloudCurveSegments,
    hitLocationCloudPathStart,
    hitLocationCloudPathEnd,
    hitLocationTrendData,
    hitLocationTrendAxis,
    showHitLocationTrendXSeries,
    showHitLocationTrendYSeries,
  }
}
