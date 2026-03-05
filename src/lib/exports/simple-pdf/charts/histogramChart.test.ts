import { describe, expect, it } from "vitest"
import {
  drawHistogramChart,
  estimateHistogramChartHeight,
} from "@/lib/exports/simple-pdf/charts/histogramChart"
import type { PdfChart } from "@/lib/exports/simple-pdf/types"

describe("estimateHistogramChartHeight", () => {
  it("liefert 0 ohne Buckets", () => {
    const chart: Extract<PdfChart, { type: "histogram" }> = {
      type: "histogram",
      buckets: [],
    }

    expect(estimateHistogramChartHeight(chart)).toBe(0)
  })

  it("liefert Grundhoehe plus optionalen Titel", () => {
    const chart: Extract<PdfChart, { type: "histogram" }> = {
      type: "histogram",
      title: "Verteilung",
      buckets: [{ label: "10", value: 4 }],
    }

    expect(estimateHistogramChartHeight(chart)).toBe(126)
  })
})

describe("drawHistogramChart", () => {
  it("rendert Achsen, Balken und Labels fuer gueltige Buckets", () => {
    const chart: Extract<PdfChart, { type: "histogram" }> = {
      type: "histogram",
      title: "Verteilung",
      buckets: [
        { label: "10", value: 7 },
        { label: "9", value: 13 },
        { label: "8", value: 10 },
      ],
    }
    const commands: string[] = []

    const height = drawHistogramChart(chart, 20, 600, 280, (command) => commands.push(command))

    expect(height).toBeGreaterThan(0)
    expect(commands.some((command) => command.includes("(Verteilung)"))).toBe(true)
    expect(commands.some((command) => command.includes("(10)"))).toBe(true)
    expect(commands.some((command) => command.includes("(0)"))).toBe(true)
  })

  it("liefert 0 wenn keine Bucketlabels oder Werte gueltig sind", () => {
    const chart: Extract<PdfChart, { type: "histogram" }> = {
      type: "histogram",
      buckets: [
        { label: " ", value: 3 },
        { label: "10", value: Number.NaN },
      ],
    }

    expect(drawHistogramChart(chart, 0, 0, 200, () => {})).toBe(0)
  })
})
