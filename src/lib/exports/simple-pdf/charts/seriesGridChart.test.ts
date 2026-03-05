import { describe, expect, it } from "vitest"
import {
  drawSeriesGridChart,
  estimateSeriesGridChartHeight,
} from "@/lib/exports/simple-pdf/charts/seriesGridChart"
import type { PdfChart } from "@/lib/exports/simple-pdf/types"

describe("estimateSeriesGridChartHeight", () => {
  it("liefert 0 ohne gueltige Zeilenlabels", () => {
    const chart: Extract<PdfChart, { type: "seriesGrid" }> = {
      type: "seriesGrid",
      rows: [{ label: "   ", score: "80", shots: "9 8 7" }],
    }

    expect(estimateSeriesGridChartHeight(chart, 260)).toBe(0)
  })

  it("liefert positive Hoehe mit Header und Tabellenkoerper", () => {
    const chart: Extract<PdfChart, { type: "seriesGrid" }> = {
      type: "seriesGrid",
      title: "Serien",
      rows: [{ label: "Serie 1", score: "81", shots: "9 8 7 10 8" }],
    }

    expect(estimateSeriesGridChartHeight(chart, 260)).toBeGreaterThan(30)
  })
})

describe("drawSeriesGridChart", () => {
  it("rendert Tabellenheader und Datenzeilen", () => {
    const chart: Extract<PdfChart, { type: "seriesGrid" }> = {
      type: "seriesGrid",
      title: "Serien",
      rows: [
        { label: "Serie 1", score: "81", shots: "9 8 7 10 8" },
        { label: "Serie 2", score: "82", shots: "" },
      ],
    }
    const commands: string[] = []

    const height = drawSeriesGridChart(chart, 30, 650, 280, (command) => commands.push(command))

    expect(height).toBeGreaterThan(0)
    expect(commands.some((command) => command.includes("(Serie)"))).toBe(true)
    expect(commands.some((command) => command.includes("(Ringe)"))).toBe(true)
    expect(commands.some((command) => command.includes("(Sch"))).toBe(true)
    expect(commands.some((command) => command.includes("(Serie 1)"))).toBe(true)
    expect(commands.some((command) => command.includes("(81)"))).toBe(true)
    expect(commands.some((command) => command.includes("(-)"))).toBe(true)
  })

  it("liefert 0 wenn nach Filterung keine Zeilen uebrig bleiben", () => {
    const chart: Extract<PdfChart, { type: "seriesGrid" }> = {
      type: "seriesGrid",
      rows: [{ label: " ", score: "0", shots: "" }],
    }

    expect(drawSeriesGridChart(chart, 0, 0, 200, () => {})).toBe(0)
  })
})
