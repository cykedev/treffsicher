import {
  clamp,
  hexToRgb,
  lineCommand,
  rectFillCommand,
  textCommand,
} from "@/lib/exports/pdfPrimitives"
import { COLOR_GRID, COLOR_TEXT_SOFT } from "@/lib/exports/simple-pdf/constants"
import type { AddPdfCommand, PdfChart } from "@/lib/exports/simple-pdf/types"

export function drawHistogramChart(
  chart: Extract<PdfChart, { type: "histogram" }>,
  x: number,
  topY: number,
  width: number,
  addCommand: AddPdfCommand
): number {
  if (chart.buckets.length === 0) return 0

  const buckets = chart.buckets.filter(
    (bucket) => Number.isFinite(bucket.value) && bucket.label.trim().length > 0
  )
  if (buckets.length === 0) return 0

  let cursorY = topY
  if (chart.title) {
    addCommand(textCommand(x, cursorY - 10, chart.title, 9.5, true, COLOR_TEXT_SOFT))
    cursorY -= 14
  }

  const yAxisWidth = 18
  const plotHeight = 86
  const labelHeight = 14
  const plotX = x + yAxisWidth
  const plotWidth = Math.max(120, width - yAxisWidth - 2)
  const plotTopY = cursorY - 2
  const plotBottomY = plotTopY - plotHeight
  const maxCount = Math.max(1, ...buckets.map((bucket) => bucket.value))

  for (let i = 0; i <= 4; i++) {
    const yPos = plotBottomY + (plotHeight / 4) * i
    addCommand(lineCommand(plotX, yPos, plotX + plotWidth, yPos, COLOR_GRID, 0.6))
  }

  addCommand(lineCommand(plotX, plotBottomY, plotX + plotWidth, plotBottomY, COLOR_TEXT_SOFT, 0.8))
  addCommand(lineCommand(plotX, plotBottomY, plotX, plotTopY, COLOR_TEXT_SOFT, 0.8))
  addCommand(textCommand(x, plotTopY - 7, String(maxCount), 8, false, COLOR_TEXT_SOFT))
  addCommand(textCommand(x + 4, plotBottomY - 2, "0", 8, false, COLOR_TEXT_SOFT))

  const gap = buckets.length > 1 ? 2 : 0
  const barWidth = Math.max(3, (plotWidth - gap * (buckets.length - 1)) / buckets.length)

  for (let i = 0; i < buckets.length; i++) {
    const bucket = buckets[i]
    const ratio = maxCount > 0 ? bucket.value / maxCount : 0
    // Balkenhöhe auf Plotfläche clampen, damit fehlerhafte Eingabedaten den Stream nicht sprengen.
    const barHeight = clamp((plotHeight - 2) * ratio, 0, plotHeight - 2)
    const barX = plotX + i * (barWidth + gap)
    const barTopY = plotBottomY + barHeight
    const fillColor = hexToRgb(bucket.colorHex, [0.48, 0.54, 0.6])

    if (barHeight > 0) {
      addCommand(rectFillCommand(barX, barTopY, barWidth, barHeight, fillColor))
    }

    const labelOffset = Math.max(0, barWidth / 2 - bucket.label.length * 2.1)
    addCommand(
      textCommand(barX + labelOffset, plotBottomY - 10, bucket.label, 8, false, COLOR_TEXT_SOFT)
    )
  }

  cursorY = plotBottomY - labelHeight
  return topY - cursorY + 2
}

export function estimateHistogramChartHeight(
  chart: Extract<PdfChart, { type: "histogram" }>
): number {
  if (chart.buckets.length === 0) return 0
  const titleHeight = chart.title ? 14 : 0
  return titleHeight + 112
}
