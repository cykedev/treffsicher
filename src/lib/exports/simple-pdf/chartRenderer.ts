import { CONTENT_WIDTH } from "@/lib/exports/simple-pdf/constants"
import { drawBarsChart, estimateBarsChartHeight } from "@/lib/exports/simple-pdf/charts/barsChart"
import {
  drawHistogramChart,
  estimateHistogramChartHeight,
} from "@/lib/exports/simple-pdf/charts/histogramChart"
import {
  drawSeriesGridChart,
  estimateSeriesGridChartHeight,
} from "@/lib/exports/simple-pdf/charts/seriesGridChart"
import {
  drawHitLocationChart,
  estimateHitLocationChartHeight,
} from "@/lib/exports/simple-pdf/charts/hitLocationChart"
import type { AddPdfCommand, PdfChart } from "@/lib/exports/simple-pdf/types"

export function estimateChartHeight(chart: PdfChart): number {
  if (chart.type === "bars") {
    return estimateBarsChartHeight(chart)
  }

  if (chart.type === "histogram") {
    return estimateHistogramChartHeight(chart)
  }

  if (chart.type === "seriesGrid") {
    const approxWidth = CONTENT_WIDTH - 24
    return estimateSeriesGridChartHeight(chart, approxWidth)
  }

  return estimateHitLocationChartHeight(chart)
}

export function drawChart(
  chart: PdfChart,
  x: number,
  topY: number,
  width: number,
  addCommand: AddPdfCommand
): number {
  if (chart.type === "bars") {
    return drawBarsChart(chart, x, topY, width, addCommand)
  }
  if (chart.type === "histogram") {
    return drawHistogramChart(chart, x, topY, width, addCommand)
  }
  if (chart.type === "seriesGrid") {
    return drawSeriesGridChart(chart, x, topY, width, addCommand)
  }

  return drawHitLocationChart(chart, x, topY, width, addCommand)
}
