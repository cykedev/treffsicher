import { describe, expect, it } from "vitest"
import { drawBarsChart, estimateBarsChartHeight } from "@/lib/exports/simple-pdf/charts/barsChart"
import type { PdfChart } from "@/lib/exports/simple-pdf/types"

describe("estimateBarsChartHeight", () => {
  it("liefert 0 wenn keine numerisch gueltigen Balken vorhanden sind", () => {
    const chart: Extract<PdfChart, { type: "bars" }> = {
      type: "bars",
      items: [{ label: "A", value: Number.NaN }],
    }

    expect(estimateBarsChartHeight(chart)).toBe(0)
  })

  it("beruecksichtigt Titel und Zeilenhoehe gueltiger Balken", () => {
    const chart: Extract<PdfChart, { type: "bars" }> = {
      type: "bars",
      title: "Befinden",
      items: [
        { label: "Schlaf", value: 82 },
        { label: "Energie", value: 75 },
      ],
    }

    expect(estimateBarsChartHeight(chart)).toBe(50)
  })
})

describe("drawBarsChart", () => {
  it("rendert Balken, Label und Wert fuer gueltige Eintraege", () => {
    const chart: Extract<PdfChart, { type: "bars" }> = {
      type: "bars",
      title: "Befinden",
      maxValue: 100,
      items: [
        { label: "Schlaf", value: 82, displayValue: "82/100" },
        { label: "Stress", value: 200, displayValue: "200/100" },
      ],
    }
    const commands: string[] = []

    const height = drawBarsChart(chart, 40, 700, 260, (command) => commands.push(command))

    expect(height).toBeGreaterThan(0)
    expect(commands.some((command) => command.includes("(Befinden)"))).toBe(true)
    expect(commands.some((command) => command.includes("(Schlaf)"))).toBe(true)
    expect(commands.some((command) => command.includes("(82/100)"))).toBe(true)
    expect(commands.some((command) => command.includes(" 108 7 re f"))).toBe(true)
  })

  it("liefert 0 wenn alle Items verworfen werden", () => {
    const chart: Extract<PdfChart, { type: "bars" }> = {
      type: "bars",
      items: [{ label: "X", value: Number.NaN }],
    }

    expect(drawBarsChart(chart, 0, 0, 200, () => {})).toBe(0)
  })
})
