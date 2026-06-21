import { useMemo } from "react"
import type {
  HitLocationPathPoint,
  HitLocationPoint,
} from "@/components/app/statistics-charts/types"
import {
  buildCatmullRomCurvePoints,
  calculateMean,
  calculateTrend,
  computeCenteredAxis,
} from "@/components/app/statistics-charts/utils"

export function useHitLocationCloudState(
  filteredHitLocations: HitLocationPoint[],
  showCloudTrail: boolean
) {
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

  return {
    hitLocationCloudAxes,
    hitLocationMetrics,
    hitLocationCloudCurveSegments,
    hitLocationCloudPathStart,
    hitLocationCloudPathEnd,
  }
}
