import { clamp, hexToRgb, rectFillCommand, textCommand } from "@/lib/exports/pdfPrimitives"
import {
  COLOR_BAR_BG,
  COLOR_BAR_DEFAULT,
  COLOR_TEXT,
  COLOR_TEXT_SOFT,
} from "@/lib/exports/simple-pdf/constants"
import type { AddPdfCommand, PdfChart } from "@/lib/exports/simple-pdf/types"

export function drawBarsChart(
  chart: Extract<PdfChart, { type: "bars" }>,
  x: number,
  topY: number,
  width: number,
  addCommand: AddPdfCommand
): number {
  const items = chart.items.filter((item) => Number.isFinite(item.value))
  if (items.length === 0) return 0

  let cursorY = topY
  if (chart.title) {
    addCommand(textCommand(x, cursorY - 10, chart.title, 9.5, true, COLOR_TEXT_SOFT))
    cursorY -= 14
  }

  const labelWidth = 112
  const valueWidth = 30
  const trackGap = 10
  const rowHeight = 16
  const trackHeight = 7
  const trackWidth = Math.max(70, width - labelWidth - valueWidth - trackGap)
  const maxValue =
    chart.maxValue && chart.maxValue > 0
      ? chart.maxValue
      : Math.max(...items.map((item) => item.value), 1)

  for (const item of items) {
    // Clamp schützt den Renderer vor übergroßen Werten und hält Balken immer innerhalb des Tracks.
    const clampedValue = clamp(item.value, 0, maxValue)
    const fillRatio = maxValue > 0 ? clampedValue / maxValue : 0
    const fillWidth = clamp(trackWidth * fillRatio, 0, trackWidth)
    const trackX = x + labelWidth
    const rowBaseline = cursorY - 10
    const trackTopY = cursorY - 4

    addCommand(textCommand(x, rowBaseline, item.label, 9.5, false, COLOR_TEXT_SOFT))
    addCommand(rectFillCommand(trackX, trackTopY, trackWidth, trackHeight, COLOR_BAR_BG))

    if (fillWidth > 0) {
      const fillColor = hexToRgb(item.colorHex, COLOR_BAR_DEFAULT)
      addCommand(rectFillCommand(trackX, trackTopY, fillWidth, trackHeight, fillColor))
    }

    addCommand(
      textCommand(
        x + width - valueWidth + 2,
        rowBaseline,
        item.displayValue ?? String(item.value),
        9,
        true,
        COLOR_TEXT
      )
    )

    cursorY -= rowHeight
  }

  return topY - cursorY + 2
}

export function estimateBarsChartHeight(chart: Extract<PdfChart, { type: "bars" }>): number {
  const validItems = chart.items.filter((item) => Number.isFinite(item.value))
  if (validItems.length === 0) return 0
  const titleHeight = chart.title ? 14 : 0
  return titleHeight + validItems.length * 16 + 4
}
