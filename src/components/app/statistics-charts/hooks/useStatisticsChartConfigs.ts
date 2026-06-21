import { useMemo } from "react"
import type { ChartConfig } from "@/components/ui/chart"
import {
  radarSeriesConfig,
  shotDistributionBundledColors,
} from "@/components/app/statistics-charts/constants"
import { createTrendStroke } from "@/components/app/statistics-charts/utils"

interface Params {
  metricLabel: string
  wellbeingScoreLabel: string
  qualityScoreLabel: string
}

export interface StatisticsChartConfigs {
  lineChartConfig: ChartConfig
  seriesChartConfig: ChartConfig
  radarChartConfig: ChartConfig
  wellbeingChartConfig: ChartConfig
  qualityChartConfig: ChartConfig
  shotDistributionChartConfig: ChartConfig
  hitLocationCloudChartConfig: ChartConfig
  hitLocationTrendChartConfig: ChartConfig
}

export function useStatisticsChartConfigs({
  metricLabel,
  wellbeingScoreLabel,
  qualityScoreLabel,
}: Params): StatisticsChartConfigs {
  const lineChartConfig = useMemo<ChartConfig>(
    () => ({
      // Dynamisches Label:
      // Gleicher Chart wird fuer Ringe/Schuss und Hochrechnung genutzt;
      // das Label muss den gewaehlten Modus transparent machen.
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

  return {
    lineChartConfig,
    seriesChartConfig,
    radarChartConfig,
    wellbeingChartConfig,
    qualityChartConfig,
    shotDistributionChartConfig,
    hitLocationCloudChartConfig,
    hitLocationTrendChartConfig,
  }
}
