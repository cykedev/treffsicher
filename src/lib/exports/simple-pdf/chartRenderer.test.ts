import { describe, expect, it } from "vitest"
import { CONTENT_WIDTH } from "@/lib/exports/simple-pdf/constants"
import { drawChart, estimateChartHeight } from "@/lib/exports/simple-pdf/chartRenderer"
import { estimateBarsChartHeight } from "@/lib/exports/simple-pdf/charts/barsChart"
import { estimateHistogramChartHeight } from "@/lib/exports/simple-pdf/charts/histogramChart"
import { estimateHitLocationChartHeight } from "@/lib/exports/simple-pdf/charts/hitLocationChart"
import { estimateSeriesGridChartHeight } from "@/lib/exports/simple-pdf/charts/seriesGridChart"
import type { PdfChart } from "@/lib/exports/simple-pdf/types"

describe("estimateChartHeight", () => {
  it("delegiert pro Charttyp an den passenden Estimator", () => {
    const bars: PdfChart = { type: "bars", items: [{ label: "A", value: 1 }] }
    const histogram: PdfChart = { type: "histogram", buckets: [{ label: "10", value: 3 }] }
    const grid: PdfChart = {
      type: "seriesGrid",
      rows: [{ label: "Serie 1", score: "81", shots: "9 8 7" }],
    }
    const hit: PdfChart = {
      type: "hitLocation",
      horizontalMm: 1,
      horizontalDirection: "RIGHT",
      verticalMm: 1,
      verticalDirection: "HIGH",
    }

    expect(estimateChartHeight(bars)).toBe(estimateBarsChartHeight(bars))
    expect(estimateChartHeight(histogram)).toBe(estimateHistogramChartHeight(histogram))
    expect(estimateChartHeight(grid)).toBe(estimateSeriesGridChartHeight(grid, CONTENT_WIDTH - 24))
    expect(estimateChartHeight(hit)).toBe(estimateHitLocationChartHeight(hit))
  })
})

describe("drawChart", () => {
  it("rendert jeden Charttyp ueber den Dispatcher", () => {
    const charts: PdfChart[] = [
      { type: "bars", items: [{ label: "A", value: 2 }] },
      { type: "histogram", buckets: [{ label: "10", value: 1 }] },
      { type: "seriesGrid", rows: [{ label: "Serie 1", score: "80", shots: "9 8 7" }] },
      {
        type: "hitLocation",
        horizontalMm: 1,
        horizontalDirection: "RIGHT",
        verticalMm: 1,
        verticalDirection: "HIGH",
      },
    ]

    for (const chart of charts) {
      const commands: string[] = []
      const height = drawChart(chart, 20, 500, 260, (command) => commands.push(command))
      expect(height).toBeGreaterThan(0)
      expect(commands.length).toBeGreaterThan(0)
    }
  })
})
