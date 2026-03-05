import {
  circleFillCommand,
  clamp,
  hexToRgb,
  lineCommand,
  polygonFillCommand,
  rectFillCommand,
  rectStrokeCommand,
  textCommand,
  wrapText,
  type Rgb,
} from "@/lib/exports/pdfPrimitives"
import {
  COLOR_BAR_BG,
  COLOR_BAR_DEFAULT,
  COLOR_GRID,
  COLOR_HIT_POINT,
  COLOR_HIT_VECTOR,
  COLOR_TEXT,
  COLOR_TEXT_SOFT,
  CONTENT_WIDTH,
} from "@/lib/exports/simple-pdf/constants"
import type { AddPdfCommand, PdfChart } from "@/lib/exports/simple-pdf/types"

function drawDirectionalArrow(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: Rgb,
  addCommand: AddPdfCommand,
  lineWidth = 1,
  headLength = 5,
  headWidth = 2.7
): void {
  addCommand(lineCommand(x1, y1, x2, y2, color, lineWidth))

  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 0.001) return

  const ux = dx / len
  const uy = dy / len
  const baseX = x2 - ux * headLength
  const baseY = y2 - uy * headLength
  const leftX = baseX - uy * headWidth
  const leftY = baseY + ux * headWidth
  const rightX = baseX + uy * headWidth
  const rightY = baseY - ux * headWidth

  addCommand(
    polygonFillCommand(
      [
        { x: x2, y: y2 },
        { x: leftX, y: leftY },
        { x: rightX, y: rightY },
      ],
      color
    )
  )
}

function drawBarsChart(
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

function drawHistogramChart(
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

function drawSeriesGridChart(
  chart: Extract<PdfChart, { type: "seriesGrid" }>,
  x: number,
  topY: number,
  width: number,
  addCommand: AddPdfCommand
): number {
  const rows = chart.rows.filter((row) => row.label.trim().length > 0)
  if (rows.length === 0) return 0

  let cursorY = topY
  if (chart.title) {
    addCommand(textCommand(x, cursorY - 10, chart.title, 9.5, true, COLOR_TEXT_SOFT))
    cursorY -= 14
  }

  const colLabelWidth = Math.min(116, Math.max(86, width * 0.22))
  const colScoreWidth = Math.min(88, Math.max(68, width * 0.16))
  const colGap = 8
  const shotsWidth = Math.max(90, width - colLabelWidth - colScoreWidth - colGap * 2)
  const scoreX = x + colLabelWidth + colGap
  const shotsX = scoreX + colScoreWidth + colGap
  const lineHeight = 11

  addCommand(textCommand(x, cursorY - 10, "Serie", 9, true, COLOR_TEXT_SOFT))
  addCommand(textCommand(scoreX, cursorY - 10, "Ringe", 9, true, COLOR_TEXT_SOFT))
  addCommand(textCommand(shotsX, cursorY - 10, "Schüsse", 9, true, COLOR_TEXT_SOFT))
  addCommand(lineCommand(x, cursorY - 14, x + width, cursorY - 14, COLOR_GRID, 0.7))
  cursorY -= 18

  for (const row of rows) {
    const labelLines = wrapText(row.label, colLabelWidth, 9)
    const scoreLines = wrapText(row.score, colScoreWidth, 9)
    const shotsLines = wrapText(row.shots || "-", shotsWidth, 9)
    const lineCount = Math.max(labelLines.length, scoreLines.length, shotsLines.length)
    const rowHeight = lineCount * lineHeight + 4
    const rowBaseline = cursorY - 9

    for (let i = 0; i < labelLines.length; i++) {
      addCommand(textCommand(x, rowBaseline - i * lineHeight, labelLines[i], 9, false, COLOR_TEXT))
    }
    for (let i = 0; i < scoreLines.length; i++) {
      addCommand(
        textCommand(scoreX, rowBaseline - i * lineHeight, scoreLines[i], 9, true, COLOR_TEXT)
      )
    }
    for (let i = 0; i < shotsLines.length; i++) {
      addCommand(
        textCommand(shotsX, rowBaseline - i * lineHeight, shotsLines[i], 9, false, COLOR_TEXT_SOFT)
      )
    }

    cursorY -= rowHeight
    addCommand(lineCommand(x, cursorY + 2, x + width, cursorY + 2, COLOR_GRID, 0.55))
  }

  return topY - cursorY + 2
}

function drawHitLocationChart(
  chart: Extract<PdfChart, { type: "hitLocation" }>,
  x: number,
  topY: number,
  width: number,
  addCommand: AddPdfCommand
): number {
  let cursorY = topY
  if (chart.title) {
    addCommand(textCommand(x, cursorY - 10, chart.title, 9.5, true, COLOR_TEXT_SOFT))
    cursorY -= 14
  }

  const plotSize = Math.min(96, Math.max(78, width * 0.2))
  const plotX = x + 6
  const plotTopY = cursorY - 4
  const plotBottomY = plotTopY - plotSize
  const centerX = plotX + plotSize / 2
  const centerY = plotBottomY + plotSize / 2
  const infoX = plotX + plotSize + 14
  const infoWidth = Math.max(120, x + width - infoX)

  addCommand(rectStrokeCommand(plotX, plotTopY, plotSize, plotSize, COLOR_GRID, 0.8))
  addCommand(lineCommand(centerX, plotBottomY, centerX, plotTopY, COLOR_GRID, 0.6))
  addCommand(lineCommand(plotX, centerY, plotX + plotSize, centerY, COLOR_GRID, 0.6))

  const signedX =
    (chart.horizontalDirection === "RIGHT" ? 1 : -1) * Math.max(0, Math.abs(chart.horizontalMm))
  const signedY =
    (chart.verticalDirection === "HIGH" ? 1 : -1) * Math.max(0, Math.abs(chart.verticalMm))
  const maxMm = Math.max(1, chart.maxMm ?? Math.max(Math.abs(signedX), Math.abs(signedY), 5))
  const maxRadius = plotSize / 2 - 10
  const dx = clamp((signedX / maxMm) * maxRadius, -maxRadius, maxRadius)
  const dy = clamp((signedY / maxMm) * maxRadius, -maxRadius, maxRadius)
  const pointX = centerX + dx
  const pointY = centerY + dy

  drawDirectionalArrow(centerX, centerY, pointX, pointY, COLOR_HIT_VECTOR, addCommand, 1.1)
  addCommand(circleFillCommand(pointX, pointY, 2.5, COLOR_HIT_POINT))
  addCommand(circleFillCommand(centerX, centerY, 1.2, COLOR_TEXT_SOFT))

  const infoRows = [
    {
      label: "Horizontal",
      value: `${Math.abs(chart.horizontalMm).toFixed(2)} mm ${
        chart.horizontalDirection === "RIGHT" ? "rechts" : "links"
      }`,
    },
    {
      label: "Vertikal",
      value: `${Math.abs(chart.verticalMm).toFixed(2)} mm ${
        chart.verticalDirection === "HIGH" ? "hoch" : "tief"
      }`,
    },
    {
      label: "Richtung",
      value: `${chart.horizontalDirection === "RIGHT" ? "rechts" : "links"}, ${
        chart.verticalDirection === "HIGH" ? "hoch" : "tief"
      }`,
    },
  ] as const

  let infoCursorY = plotTopY - 10
  for (const row of infoRows) {
    addCommand(textCommand(infoX, infoCursorY, `${row.label}:`, 8.8, false, COLOR_TEXT_SOFT))
    const valueLines = wrapText(row.value, Math.max(80, infoWidth - 64), 8.8)
    for (let i = 0; i < valueLines.length; i++) {
      addCommand(
        textCommand(infoX + 64, infoCursorY - i * 11, valueLines[i], 8.8, false, COLOR_TEXT)
      )
    }
    infoCursorY -= Math.max(1, valueLines.length) * 11 + 5
  }

  const infoBottomY = infoCursorY + 4
  const contentBottomY = Math.min(plotBottomY, infoBottomY)
  cursorY = contentBottomY - 4
  return topY - cursorY + 2
}

export function estimateChartHeight(chart: PdfChart): number {
  if (chart.type === "bars") {
    const validItems = chart.items.filter((item) => Number.isFinite(item.value))
    if (validItems.length === 0) return 0
    const titleHeight = chart.title ? 14 : 0
    return titleHeight + validItems.length * 16 + 4
  }

  if (chart.type === "histogram") {
    if (chart.buckets.length === 0) return 0
    const titleHeight = chart.title ? 14 : 0
    return titleHeight + 112
  }

  if (chart.type === "seriesGrid") {
    const rows = chart.rows.filter((row) => row.label.trim().length > 0)
    if (rows.length === 0) return 0

    const approxWidth = CONTENT_WIDTH - 24
    const colLabelWidth = 92
    const colScoreWidth = 74
    const colGap = 8
    const shotsWidth = Math.max(90, approxWidth - colLabelWidth - colScoreWidth - colGap * 2)
    const titleHeight = chart.title ? 14 : 0
    const headerHeight = 18

    let bodyHeight = 0
    for (const row of rows) {
      const labelLines = wrapText(row.label, colLabelWidth, 9)
      const scoreLines = wrapText(row.score, colScoreWidth, 9)
      const shotsLines = wrapText(row.shots || "-", shotsWidth, 9)
      const lineCount = Math.max(labelLines.length, scoreLines.length, shotsLines.length)
      bodyHeight += lineCount * 11 + 4
    }

    return titleHeight + headerHeight + bodyHeight + 2
  }

  const titleHeight = chart.title ? 14 : 0
  return titleHeight + 96
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
