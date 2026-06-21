import { useMemo } from "react"
import type { HitLocationTrendDataPoint } from "@/components/app/statistics-charts/tabs/types"
import type { HitLocationPoint } from "@/components/app/statistics-charts/types"
import {
  calculateTrend,
  calculateTrendBandsByQuantile,
  computeCenteredAxis,
  createTrendBandDistanceOptions,
} from "@/components/app/statistics-charts/utils"

interface Params {
  filteredHitLocationsForTrend: HitLocationPoint[]
  filteredHitLocations: HitLocationPoint[]
  displayTimeZone: string
  showHitLocationTrendX: boolean
  showHitLocationTrendY: boolean
}

export function useHitLocationTrendState({
  filteredHitLocationsForTrend,
  filteredHitLocations,
  displayTimeZone,
  showHitLocationTrendX,
  showHitLocationTrendY,
}: Params) {
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
    hitLocationTrendData,
    hitLocationTrendAxis,
    showHitLocationTrendXSeries,
    showHitLocationTrendYSeries,
  }
}
