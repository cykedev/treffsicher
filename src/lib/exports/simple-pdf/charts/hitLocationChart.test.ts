import { describe, expect, it } from "vitest"
import {
  drawHitLocationChart,
  estimateHitLocationChartHeight,
} from "@/lib/exports/simple-pdf/charts/hitLocationChart"
import type { PdfChart } from "@/lib/exports/simple-pdf/types"

describe("estimateHitLocationChartHeight", () => {
  it("liefert feste Basishoehe mit optionalem Titelaufschlag", () => {
    const baseChart: Extract<PdfChart, { type: "hitLocation" }> = {
      type: "hitLocation",
      horizontalMm: 1.2,
      horizontalDirection: "RIGHT",
      verticalMm: 0.7,
      verticalDirection: "HIGH",
    }

    expect(estimateHitLocationChartHeight(baseChart)).toBe(96)
    expect(estimateHitLocationChartHeight({ ...baseChart, title: "Trefferlage" })).toBe(110)
  })
})

describe("drawHitLocationChart", () => {
  it("rendert Zielscheibe, Richtungsvektor und Infozeilen", () => {
    const chart: Extract<PdfChart, { type: "hitLocation" }> = {
      type: "hitLocation",
      title: "Trefferlage",
      horizontalMm: 2.34,
      horizontalDirection: "RIGHT",
      verticalMm: 1.11,
      verticalDirection: "HIGH",
      maxMm: 5,
    }
    const commands: string[] = []

    const height = drawHitLocationChart(chart, 40, 620, 280, (command) => commands.push(command))

    expect(height).toBeGreaterThan(0)
    expect(commands.some((command) => command.includes("(Trefferlage)"))).toBe(true)
    expect(commands.some((command) => command.includes("(Horizontal:)"))).toBe(true)
    expect(commands.some((command) => command.includes("(2.34 mm rechts)"))).toBe(true)
    expect(commands.some((command) => command.includes("(1.11 mm hoch)"))).toBe(true)
  })

  it("formatiert Links/Tief-Richtung korrekt", () => {
    const chart: Extract<PdfChart, { type: "hitLocation" }> = {
      type: "hitLocation",
      horizontalMm: 8,
      horizontalDirection: "LEFT",
      verticalMm: 9,
      verticalDirection: "LOW",
      maxMm: 4,
    }
    const commands: string[] = []

    drawHitLocationChart(chart, 20, 500, 260, (command) => commands.push(command))

    expect(commands.some((command) => command.includes("(8.00 mm links)"))).toBe(true)
    expect(commands.some((command) => command.includes("(9.00 mm tief)"))).toBe(true)
    expect(commands.some((command) => command.includes("(links, tief)"))).toBe(true)
  })
})
