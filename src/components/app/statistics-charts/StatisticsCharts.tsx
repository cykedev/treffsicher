"use client"

import { useMemo, useState } from "react"
import { calculateSeriesStats } from "@/lib/stats/calculateSeriesStats"
import type { ChartConfig } from "@/components/ui/chart"
import {
  CHART_TIME_AXIS_MAX_TICKS,
  radarDimensions,
  radarSeriesConfig,
  shotDistributionBundledColors,
} from "@/components/app/statistics-charts/constants"
import type {
  StatisticsFiltersCardActions,
  StatisticsFiltersCardModel,
} from "@/components/app/statistics-charts/filterTypes"
import { StatisticsFiltersCard } from "@/components/app/statistics-charts/StatisticsFiltersCard"
import { StatisticsChartsTabs } from "@/components/app/statistics-charts/StatisticsChartsTabs"
import type { StatisticsChartsTabsModel } from "@/components/app/statistics-charts/tabs/types"
import { useStatisticsFilterState } from "@/components/app/statistics-charts/useStatisticsFilterState"
import { useStatisticsFilteredData } from "@/components/app/statistics-charts/useStatisticsFilteredData"
import type {
  AggregatedShotDistributionPoint,
  HitLocationPathPoint,
  HitLocationPoint,
  RadarLegendItem,
  RadarSeriesKey,
  StatisticsChartsDataBundle,
} from "@/components/app/statistics-charts/types"
import {
  buildCatmullRomCurvePoints,
  buildIndexTicks,
  calculateMean,
  calculateTrend,
  calculateTrendBandsByQuantile,
  computeCenteredAxis,
  computeDisplayValue,
  computeStableAxis,
  createTrendBandDistanceOptions,
  createTrendStroke,
  getShotDistributionBucketStart,
  getShotDistributionGranularity,
  mapSessionToHitLocationPoint,
} from "@/components/app/statistics-charts/utils"
import type {
  DisciplineForStats,
} from "@/lib/stats/actions"

interface Props {
  data: StatisticsChartsDataBundle
  displayTimeZone: string
}

export function StatisticsCharts({ data, displayTimeZone }: Props) {
  const { sessions, wellbeingData, qualityData, shotDistributionData, radarData } = data
  const DISPLAY_TIME_ZONE = displayTimeZone
  const [showCloudTrail, setShowCloudTrail] = useState(false)
  const [showHitLocationTrendX, setShowHitLocationTrendX] = useState(true)
  const [showHitLocationTrendY, setShowHitLocationTrendY] = useState(true)

  // Verfügbare Disziplinen aus den Einheitendaten ableiten — keine separate Abfrage nötig
  const availableDisciplines = useMemo<DisciplineForStats[]>(() => {
    const seen = new Set<string>()
    const result: DisciplineForStats[] = []
    for (const s of sessions) {
      if (s.discipline && !seen.has(s.discipline.id)) {
        seen.add(s.discipline.id)
        result.push(s.discipline)
      }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name, "de"))
  }, [sessions])
  const {
    typeFilter,
    setTypeFilter,
    from,
    setFrom,
    to,
    setTo,
    disciplineFilter,
    setDisciplineFilter,
    setDisplayMode,
    selectedDiscipline,
    effectiveDisplayMode,
    fromDate,
    toDate,
    presetToday,
    presetFrom6Months,
    presetFrom3Months,
    presetFrom1Month,
    activeTimePreset,
  } = useStatisticsFilterState({
    availableDisciplines,
  })

  const {
    filteredForTrend,
    filtered,
    filteredWellbeing,
    filteredQuality,
    filteredShotDistribution,
    filteredRadarSessions,
  } = useStatisticsFilteredData({
    sessions,
    wellbeingData,
    qualityData,
    shotDistributionData,
    radarData,
    typeFilter,
    disciplineFilter,
    fromDate,
    toDate,
  })

  const aggregatedShotDistribution = useMemo<AggregatedShotDistributionPoint[]>(() => {
    if (filteredShotDistribution.length === 0) return []

    const granularity = getShotDistributionGranularity(filteredShotDistribution)
    const byBucket = new Map<
      string,
      {
        date: Date
        totalShots: number
        weightedR0to6: number
        weightedR7: number
        weightedR8: number
        weightedR9: number
        weightedR10: number
      }
    >()

    for (const point of filteredShotDistribution) {
      const totalShots = Math.max(0, point.totalShots)
      if (totalShots <= 0) continue

      const bucketDate = getShotDistributionBucketStart(new Date(point.date), granularity)
      const bucketKey = bucketDate.toISOString()
      const current = byBucket.get(bucketKey) ?? {
        date: bucketDate,
        totalShots: 0,
        weightedR0to6: 0,
        weightedR7: 0,
        weightedR8: 0,
        weightedR9: 0,
        weightedR10: 0,
      }
      const r0to6 = point.r0 + point.r1 + point.r2 + point.r3 + point.r4 + point.r5 + point.r6

      current.totalShots += totalShots
      current.weightedR0to6 += r0to6 * totalShots
      current.weightedR7 += point.r7 * totalShots
      current.weightedR8 += point.r8 * totalShots
      current.weightedR9 += point.r9 * totalShots
      current.weightedR10 += point.r10 * totalShots
      byBucket.set(bucketKey, current)
    }

    const shortDayFormatter = new Intl.DateTimeFormat("de-CH", {
      day: "2-digit",
      month: "2-digit",
      timeZone: DISPLAY_TIME_ZONE,
    })
    const monthFormatter = new Intl.DateTimeFormat("de-CH", {
      month: "2-digit",
      year: "2-digit",
      timeZone: DISPLAY_TIME_ZONE,
    })
    const fullDateFormatter = new Intl.DateTimeFormat("de-CH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: DISPLAY_TIME_ZONE,
    })

    return [...byBucket.values()]
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((bucket, index) => {
        const round1 = (value: number) => Math.round(value * 10) / 10
        const r7 = round1(bucket.weightedR7 / bucket.totalShots)
        const r8 = round1(bucket.weightedR8 / bucket.totalShots)
        const r9 = round1(bucket.weightedR9 / bucket.totalShots)
        const r10 = round1(bucket.weightedR10 / bucket.totalShots)
        const r0to6 = round1(Math.max(0, 100 - r7 - r8 - r9 - r10))

        const dateLabel =
          granularity === "month"
            ? monthFormatter.format(bucket.date)
            : shortDayFormatter.format(bucket.date)
        const tooltipLabel =
          granularity === "day"
            ? fullDateFormatter.format(bucket.date)
            : granularity === "week"
              ? `Woche ab ${fullDateFormatter.format(bucket.date)}`
              : `Monat ${monthFormatter.format(bucket.date)}`

        return {
          i: index,
          date: bucket.date,
          dateLabel,
          tooltipLabel,
          totalShots: bucket.totalShots,
          r0to6,
          r7,
          r8,
          r9,
          r10,
        }
      })
  }, [filteredShotDistribution, DISPLAY_TIME_ZONE])

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

  // Dezente Verlaufsspur in der Cloud: gleitender Schwerpunkt (X/Y) über die Zeit.
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

  const hitLocationTrendData = useMemo(() => {
    if (filteredHitLocations.length === 0) return []

    return filteredHitLocations.map((point, i) => {
      const trendEntry = hitLocationTrendBySessionId.get(point.sessionId)
      const xTrendLow = trendEntry?.xTrendLow ?? null
      const xTrendHigh = trendEntry?.xTrendHigh ?? null
      const yTrendLow = trendEntry?.yTrendLow ?? null
      const yTrendHigh = trendEntry?.yTrendHigh ?? null

      return {
        i,
        date: point.date,
        dateLabel: new Intl.DateTimeFormat("de-CH", {
          day: "2-digit",
          month: "2-digit",
          timeZone: DISPLAY_TIME_ZONE,
        }).format(new Date(point.date)),
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
  }, [filteredHitLocations, hitLocationTrendBySessionId, DISPLAY_TIME_ZONE])

  const hitLocationTrendAxis = useMemo<{ domain: [number, number]; ticks: number[] }>(() => {
    const showXSeries = showHitLocationTrendX || !showHitLocationTrendY
    const showYSeries = showHitLocationTrendY || !showHitLocationTrendX
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

  // Befinden-Anzeigedaten: bei Hochrechnung auf Gesamtschusszahl der Disziplin projizieren
  const wellbeingDisplayData = useMemo(() => {
    return filteredWellbeing.map((p) => ({
      ...p,
      displayScore:
        effectiveDisplayMode === "projected" && selectedDiscipline
          ? computeDisplayValue(p.avgPerShot, "projected", selectedDiscipline)
          : p.avgPerShot,
    }))
  }, [filteredWellbeing, effectiveDisplayMode, selectedDiscipline])

  // Ausführungsqualität-Anzeigedaten: bei Hochrechnung auf Ringe/Serie (shotsPerSeries) projizieren,
  // nicht auf den Gesamtschuss — Serienergebnis ist der sinnvolle Vergleichswert hier
  const qualityDisplayData = useMemo(() => {
    return filteredQuality.map((p) => ({
      ...p,
      displayScore:
        effectiveDisplayMode === "projected" && selectedDiscipline
          ? selectedDiscipline.scoringType === "TENTH"
            ? Math.round(p.scorePerShot * selectedDiscipline.shotsPerSeries * 10) / 10
            : Math.round(p.scorePerShot * selectedDiscipline.shotsPerSeries)
          : p.scorePerShot,
    }))
  }, [filteredQuality, effectiveDisplayMode, selectedDiscipline])

  const wellbeingYAxis = useMemo<{ domain: [number, number]; ticks: number[] }>(() => {
    const values = wellbeingDisplayData
      .map((p) => p.displayScore)
      .filter((v): v is number => Number.isFinite(v))
    return computeStableAxis(values)
  }, [wellbeingDisplayData])

  const qualityYAxis = useMemo<{ domain: [number, number]; ticks: number[] }>(() => {
    const values = qualityDisplayData
      .map((p) => p.displayScore)
      .filter((v): v is number => Number.isFinite(v))
    return computeStableAxis(values)
  }, [qualityDisplayData])

  // Nur Einheiten mit normalisiertem Ergebnis (avgPerShot) für den Verlaufschart.
  // Trend-Basis nutzt dabei ältere passende Werte (filteredForTrend), Sichtbarkeit bleibt bei filtered.
  const withScoreForTrend = filteredForTrend.filter((s) => s.avgPerShot !== null)
  const withScore = filtered.filter((s) => s.avgPerShot !== null)

  // Anzeigewerte je nach effektivem Modus berechnen
  const displayValuesForTrend = withScoreForTrend.map((s) =>
    computeDisplayValue(s.avgPerShot as number, effectiveDisplayMode, selectedDiscipline)
  )
  const displayValues = withScore.map((s) =>
    computeDisplayValue(s.avgPerShot as number, effectiveDisplayMode, selectedDiscipline)
  )

  // Gleitender Durchschnitt über die Trend-Basiswerte
  const movingAvgForTrend = calculateTrend(displayValuesForTrend)
  const movingAvgBySessionId = new Map<string, number | null>(
    withScoreForTrend.map((session, i) => [session.id, movingAvgForTrend[i]])
  )
  const trendBandBySessionId = (() => {
    if (withScoreForTrend.length === 0) return new Map<string, { low: number; high: number }>()

    const minValue = Math.min(...displayValuesForTrend)
    const maxValue = Math.max(...displayValuesForTrend)
    const range = Number.isFinite(maxValue - minValue) ? maxValue - minValue : 0
    const minBandWidth = Math.max(range * 0.035, effectiveDisplayMode === "projected" ? 0.35 : 0.03)
    const maxBandWidth = Math.max(range * 0.45, effectiveDisplayMode === "projected" ? 3.2 : 0.3)
    const bands = calculateTrendBandsByQuantile(
      displayValuesForTrend,
      movingAvgForTrend,
      createTrendBandDistanceOptions(range, minBandWidth / 2, maxBandWidth)
    )

    return new Map<string, { low: number; high: number }>(
      withScoreForTrend.flatMap((session, i) => {
        const band = bands[i]
        if (!band) return []
        return [[session.id, band] as const]
      })
    )
  })()

  // Gesamtschusszahl der gewählten Disziplin (für Hochrechnung-Label)
  const totalDisciplineShots = selectedDiscipline
    ? selectedDiscipline.shotsPerSeries * selectedDiscipline.seriesCount
    : null

  // Label für Legende und Y-Achsen-Beschriftung (Ergebnisverlauf)
  const metricLabel =
    effectiveDisplayMode === "projected" && selectedDiscipline
      ? `Hochrechnung (${totalDisciplineShots} Sch.)`
      : "Ringe/Sch."

  // Y-Achsen-Labels für Befinden- und Qualitätscharts
  const wellbeingScoreLabel =
    effectiveDisplayMode === "projected" && selectedDiscipline
      ? `Ringe (${totalDisciplineShots} Sch.)`
      : "Ringe/Sch."
  const qualityScoreLabel =
    effectiveDisplayMode === "projected" && selectedDiscipline
      ? `Ringe/Serie (${selectedDiscipline.shotsPerSeries} Sch.)`
      : "Ringe/Sch."

  // Daten für den Verlaufschart
  const lineData = withScore.map((s, i) => {
    const trend = movingAvgBySessionId.get(s.id) ?? null
    const band = trendBandBySessionId.get(s.id)

    const trendLow = trend !== null && band ? band.low : null
    const trendHigh = trend !== null && band ? band.high : null

    return {
      i,
      datum: new Intl.DateTimeFormat("de-CH", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        timeZone: DISPLAY_TIME_ZONE,
      }).format(new Date(s.date)),
      // Feste Keys statt dynamischer — Recharts braucht stabile dataKey-Referenzen
      wert: displayValues[i],
      trend,
      trendLow,
      trendHigh,
      trendBand: trendLow !== null && trendHigh !== null ? [trendLow, trendHigh] : null,
    }
  })
  const resultTrendYAxis = useMemo<{ domain: [number, number]; ticks: number[] }>(() => {
    const values = lineData
      .flatMap((point) => [point.wert, point.trend, point.trendLow, point.trendHigh])
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value))
    return computeStableAxis(values)
  }, [lineData])

  const lineChartTicks = useMemo(
    () => buildIndexTicks(lineData.length, CHART_TIME_AXIS_MAX_TICKS),
    [lineData.length]
  )
  const hitLocationTrendTicks = useMemo(
    () => buildIndexTicks(hitLocationTrendData.length, CHART_TIME_AXIS_MAX_TICKS),
    [hitLocationTrendData.length]
  )
  const shotDistributionTicks = useMemo(
    () => buildIndexTicks(aggregatedShotDistribution.length, CHART_TIME_AXIS_MAX_TICKS),
    [aggregatedShotDistribution.length]
  )

  // Serien-Statistiken für BarChart
  const seriesStats = useMemo(() => calculateSeriesStats(filtered), [filtered])
  const barData = seriesStats.map((s) => ({
    name: `S${s.position}`,
    Min: s.min,
    Max: s.max,
    Avg: s.avg,
  }))
  const seriesValues = useMemo(() => {
    return barData
      .flatMap((s) => [s.Min, s.Avg, s.Max])
      .filter((v): v is number => Number.isFinite(v))
  }, [barData])

  const seriesYAxis = useMemo<{ domain: [number, number]; ticks: number[] }>(() => {
    return computeStableAxis(seriesValues)
  }, [seriesValues])

  const seriesHasDecimals = useMemo(() => {
    return seriesValues.some((v) => Math.abs(v - Math.round(v)) > 1e-6)
  }, [seriesValues])

  const hasData = withScore.length > 0

  const radarChartData = useMemo(() => {
    if (filteredRadarSessions.length === 0) return []
    const count = filteredRadarSessions.length

    return radarDimensions.map((dimension) => {
      const prognosisSum = filteredRadarSessions.reduce(
        (sum, entry) => sum + entry[dimension.prognosisKey],
        0
      )
      const feedbackSum = filteredRadarSessions.reduce(
        (sum, entry) => sum + entry[dimension.feedbackKey],
        0
      )

      return {
        dimension: dimension.label,
        prognosis: Math.round((prognosisSum / count) * 10) / 10,
        feedback: Math.round((feedbackSum / count) * 10) / 10,
      }
    })
  }, [filteredRadarSessions])

  const radarDateLabel = useMemo(() => {
    if (filteredRadarSessions.length === 0) return null
    const first = filteredRadarSessions[0]
    const last = filteredRadarSessions[filteredRadarSessions.length - 1]
    const format = new Intl.DateTimeFormat("de-CH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: DISPLAY_TIME_ZONE,
    })
    return `${format.format(new Date(first.date))} bis ${format.format(new Date(last.date))}`
  }, [filteredRadarSessions, DISPLAY_TIME_ZONE])

  const radarLegendItems = useMemo<RadarLegendItem[]>(() => {
    return (
      Object.entries(radarSeriesConfig) as Array<
        [RadarSeriesKey, (typeof radarSeriesConfig)[RadarSeriesKey]]
      >
    ).map(([key, config]) => {
      return {
        key,
        label: config.label,
        color: config.color,
      }
    })
  }, [])

  const lineChartConfig = useMemo<ChartConfig>(
    () => ({
      wert: { label: `${metricLabel} (Punkte)`, color: "var(--chart-1)" },
      trend: { label: "Trend", color: createTrendStroke("var(--chart-1)") },
    }),
    [metricLabel]
  )

  const seriesChartConfig = useMemo<ChartConfig>(
    () => ({
      Min: { label: "Min", color: "var(--chart-2)" },
      Avg: { label: "Ø", color: "var(--chart-1)" },
      Max: { label: "Max", color: "var(--chart-1)" },
    }),
    []
  )

  const radarChartConfig = useMemo<ChartConfig>(
    () => ({
      prognosis: {
        label: radarSeriesConfig.prognosis.label,
        color: radarSeriesConfig.prognosis.color,
      },
      feedback: {
        label: radarSeriesConfig.feedback.label,
        color: radarSeriesConfig.feedback.color,
      },
    }),
    []
  )

  const wellbeingChartConfig = useMemo<ChartConfig>(
    () => ({
      displayScore: { label: wellbeingScoreLabel, color: "var(--chart-1)" },
      sleep: { label: "Schlaf" },
      energy: { label: "Energie" },
      stress: { label: "Stress" },
      motivation: { label: "Motivation" },
    }),
    [wellbeingScoreLabel]
  )

  const qualityChartConfig = useMemo<ChartConfig>(
    () => ({
      displayScore: { label: qualityScoreLabel, color: "var(--chart-2)" },
      quality: { label: "Ausführung" },
    }),
    [qualityScoreLabel]
  )

  const shotDistributionChartConfig = useMemo<ChartConfig>(
    () => ({
      r10: { label: "10er", color: shotDistributionBundledColors.r10 },
      r9: { label: "9er", color: shotDistributionBundledColors.r9 },
      r8: { label: "8er", color: shotDistributionBundledColors.r8 },
      r7: { label: "7er", color: shotDistributionBundledColors.r7 },
      r0to6: { label: "0–6er", color: shotDistributionBundledColors.r0to6 },
    }),
    []
  )

  const hitLocationCloudChartConfig = useMemo<ChartConfig>(
    () => ({
      x: { label: "X (rechts+/links−)", color: "var(--chart-1)" },
      y: { label: "Y (hoch+/tief−)", color: "var(--chart-2)" },
    }),
    []
  )

  const hitLocationTrendChartConfig = useMemo<ChartConfig>(
    () => ({
      x: { label: "→ X Punkte", color: "var(--chart-1)" },
      xTrend: { label: "→ X Trend", color: createTrendStroke("var(--chart-1)") },
      y: { label: "↑ Y Punkte", color: "var(--chart-2)" },
      yTrend: { label: "↑ Y Trend", color: createTrendStroke("var(--chart-2)") },
    }),
    []
  )

  const tabsModel: StatisticsChartsTabsModel = {
    trend: {
      hasData,
      effectiveDisplayMode,
      selectedDiscipline,
      totalDisciplineShots,
      lineChartConfig,
      lineData,
      lineChartTicks,
      resultTrendYAxis,
      metricLabel,
      barData,
      disciplineFilter,
      seriesChartConfig,
      seriesYAxis,
      seriesHasDecimals,
    },
    hitLocation: {
      filteredHitLocations,
      showCloudTrail,
      onToggleCloudTrail: () => setShowCloudTrail((current) => !current),
      hitLocationCloudChartConfig,
      hitLocationCloudAxes,
      displayTimeZone: DISPLAY_TIME_ZONE,
      hitLocationCloudCurveSegments,
      hitLocationCloudPathStart,
      hitLocationCloudPathEnd,
      hitLocationMetrics,
      showHitLocationTrendX,
      showHitLocationTrendY,
      onToggleHitLocationTrendX: () => setShowHitLocationTrendX((current) => !current),
      onToggleHitLocationTrendY: () => setShowHitLocationTrendY((current) => !current),
      hitLocationTrendChartConfig,
      hitLocationTrendData,
      hitLocationTrendTicks,
      hitLocationTrendAxis,
      showHitLocationTrendXSeries,
      showHitLocationTrendYSeries,
    },
    selfAssessment: {
      radarChartData,
      filteredRadarSessionsCount: filteredRadarSessions.length,
      radarDateLabel,
      radarChartConfig,
      radarLegendItems,
    },
    wellbeing: {
      filteredWellbeingCount: filteredWellbeing.length,
      wellbeingChartConfig,
      wellbeingYAxis,
      wellbeingScoreLabel,
      wellbeingDisplayData,
      effectiveDisplayMode,
      selectedDiscipline,
    },
    quality: {
      filteredQualityCount: filteredQuality.length,
      qualityChartConfig,
      qualityYAxis,
      qualityScoreLabel,
      qualityDisplayData,
      effectiveDisplayMode,
      selectedDiscipline,
      aggregatedShotDistribution,
      shotDistributionChartConfig,
      shotDistributionTicks,
    },
  }
  const filtersModel: StatisticsFiltersCardModel = {
    typeFilter,
    disciplineFilter,
    availableDisciplines,
    from,
    to,
    activeTimePreset,
    selectedDiscipline,
    effectiveDisplayMode,
    totalDisciplineShots,
    filteredCount: filtered.length,
    withScoreCount: withScore.length,
  }
  const filtersActions: StatisticsFiltersCardActions = {
    typeFilterChange: setTypeFilter,
    disciplineFilterChange: setDisciplineFilter,
    fromChange: setFrom,
    toChange: setTo,
    selectAllTime: () => {
      setFrom("")
      setTo("")
    },
    select6Months: () => {
      setFrom(presetFrom6Months)
      setTo(presetToday)
    },
    select3Months: () => {
      setFrom(presetFrom3Months)
      setTo(presetToday)
    },
    select1Month: () => {
      setFrom(presetFrom1Month)
      setTo(presetToday)
    },
    displayModeChange: setDisplayMode,
  }

  return (
    <div className="space-y-6">
      <StatisticsFiltersCard model={filtersModel} actions={filtersActions} />

      <StatisticsChartsTabs model={tabsModel} />
    </div>
  )
}
