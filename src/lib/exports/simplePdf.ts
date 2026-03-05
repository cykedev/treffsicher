import {
  circleFillCommand,
  circleStrokeCommand,
  clamp,
  concatBytes,
  encodeLatin1,
  hexToRgb,
  lineCommand,
  polygonFillCommand,
  rectFillCommand,
  rectStrokeCommand,
  sanitizeText,
  textCommand,
  type Rgb,
  wrapText,
} from "@/lib/exports/pdfPrimitives"

const PAGE_WIDTH = 595
const PAGE_HEIGHT = 842
const MARGIN_X = 34
const MARGIN_TOP = 36
const MARGIN_BOTTOM = 36
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2
const CARD_GAP = 10
const INDENT_STEP = 12
const LINE_HEIGHT = 12
const HEADER_LABEL_WIDTH = 128
const SECTION_LABEL_WIDTH = 148

const COLOR_ACCENT: Rgb = [0.18, 0.41, 0.32]
const COLOR_HEADER_BG: Rgb = [0.962, 0.974, 0.967]
const COLOR_HEADER_BORDER: Rgb = [0.807, 0.862, 0.828]
const COLOR_HEADER_TITLE: Rgb = [0.11, 0.2, 0.165]
const COLOR_SECTION_BG: Rgb = [0.998, 0.999, 1]
const COLOR_SECTION_BORDER: Rgb = [0.87, 0.89, 0.91]
const COLOR_DIVIDER: Rgb = [0.86, 0.89, 0.92]
const COLOR_TEXT: Rgb = [0.17, 0.2, 0.24]
const COLOR_TEXT_SOFT: Rgb = [0.33, 0.37, 0.42]
const COLOR_BAR_BG: Rgb = [0.92, 0.94, 0.95]
const COLOR_BAR_DEFAULT: Rgb = [0.23, 0.48, 0.36]
const COLOR_GRID: Rgb = [0.86, 0.89, 0.92]
const COLOR_HIT_VECTOR: Rgb = [0.2, 0.42, 0.33]
const COLOR_HIT_POINT: Rgb = [0.9, 0.26, 0.24]

export type PdfChartBarItem = {
  label: string
  value: number
  colorHex?: string
  displayValue?: string
}

export type PdfChartHistogramBucket = {
  label: string
  value: number
  colorHex?: string
}

export type PdfChartSeriesRow = {
  label: string
  score: string
  shots: string
}

export type PdfChart =
  | {
      type: "bars"
      title?: string
      maxValue?: number
      items: PdfChartBarItem[]
    }
  | {
      type: "histogram"
      title?: string
      buckets: PdfChartHistogramBucket[]
    }
  | {
      type: "seriesGrid"
      title?: string
      rows: PdfChartSeriesRow[]
    }
  | {
      type: "hitLocation"
      title?: string
      horizontalMm: number
      horizontalDirection: "LEFT" | "RIGHT"
      verticalMm: number
      verticalDirection: "HIGH" | "LOW"
      maxMm?: number
    }

export type PdfSection = {
  title: string
  lines: string[]
  icon?: string
  charts?: PdfChart[]
}

export type StyledPdfDocument = {
  title: string
  subtitle?: string
  metaLines?: string[]
  sections: PdfSection[]
}

type FieldRow = {
  kind: "field"
  labelLines: string[]
  valueLines: string[]
  indent: number
  labelWidth: number
  height: number
}

type TextRow = {
  kind: "text"
  textLines: string[]
  indent: number
  height: number
}

type RenderRow = FieldRow | TextRow

function getIndent(rawLine: string): number {
  const leadingWhitespace = rawLine.match(/^\s*/)?.[0].length ?? 0
  return Math.min(2, Math.floor(leadingWhitespace / 2)) * INDENT_STEP
}

function getFieldWidths(
  totalWidth: number,
  indent: number,
  preferredLabelWidth: number
): { labelWidth: number; valueWidth: number } {
  const availableWidth = Math.max(160, totalWidth - indent)
  const labelWidth = Math.min(preferredLabelWidth, Math.max(92, Math.floor(availableWidth * 0.38)))
  const valueWidth = Math.max(72, availableWidth - labelWidth - 10)
  return { labelWidth, valueWidth }
}

function parseFieldLine(rawLine: string): { label: string; value: string; indent: number } | null {
  const sanitized = sanitizeText(rawLine).replace(/\s+$/g, "")
  const match = sanitized.match(/^(\s*)([^:]{1,90}):(.*)$/)
  if (!match) return null

  const label = match[2].trim()
  if (!label) return null

  return {
    label,
    value: match[3].trim() || "-",
    indent: getIndent(rawLine),
  }
}

function buildRows(
  lines: string[],
  maxWidth: number,
  labelWidth: number,
  fallbackIfEmpty = true
): { rows: RenderRow[]; totalHeight: number } {
  const sourceLines = lines.length > 0 ? lines : fallbackIfEmpty ? ["-"] : []
  const rows: RenderRow[] = []
  let totalHeight = 0

  for (const sourceLine of sourceLines) {
    const field = parseFieldLine(sourceLine)
    if (field) {
      const widths = getFieldWidths(maxWidth, field.indent, labelWidth)
      const labelLines = wrapText(field.label, widths.labelWidth, 10)
      const valueLines = wrapText(field.value, widths.valueWidth, 10)
      const height = Math.max(labelLines.length, valueLines.length) * LINE_HEIGHT + 2

      rows.push({
        kind: "field",
        labelLines,
        valueLines,
        indent: field.indent,
        labelWidth: widths.labelWidth,
        height,
      })
      totalHeight += height
      continue
    }

    const indent = getIndent(sourceLine)
    const text = sanitizeText(sourceLine).trim() || "-"
    const textLines = wrapText(text, Math.max(120, maxWidth - indent), 10)
    const height = textLines.length * LINE_HEIGHT + 2

    rows.push({
      kind: "text",
      textLines,
      indent,
      height,
    })
    totalHeight += height
  }

  return { rows, totalHeight }
}

export function buildStyledPdf(document: StyledPdfDocument): Uint8Array {
  const pages: string[][] = [[]]
  let pageIndex = 0
  let y = PAGE_HEIGHT - MARGIN_TOP

  const addCommand = (command: string): void => {
    pages[pageIndex].push(command)
  }

  const addPage = (): void => {
    pages.push([])
    pageIndex = pages.length - 1
    y = PAGE_HEIGHT - MARGIN_TOP
  }

  const ensureSpace = (requiredHeight: number): void => {
    if (y - requiredHeight < MARGIN_BOTTOM) {
      addPage()
    }
  }

  const drawRows = (rows: RenderRow[], startX: number, startY: number): void => {
    let cursorY = startY

    for (const row of rows) {
      const rowX = startX + row.indent

      if (row.kind === "field") {
        for (let i = 0; i < row.labelLines.length; i++) {
          addCommand(
            textCommand(
              rowX,
              cursorY - i * LINE_HEIGHT,
              row.labelLines[i],
              10,
              false,
              COLOR_TEXT_SOFT
            )
          )
        }

        const valueX = rowX + row.labelWidth + 10
        for (let i = 0; i < row.valueLines.length; i++) {
          addCommand(
            textCommand(valueX, cursorY - i * LINE_HEIGHT, row.valueLines[i], 10, false, COLOR_TEXT)
          )
        }

        cursorY -= row.height
        continue
      }

      for (let i = 0; i < row.textLines.length; i++) {
        addCommand(
          textCommand(rowX, cursorY - i * LINE_HEIGHT, row.textLines[i], 10, false, COLOR_TEXT)
        )
      }
      cursorY -= row.height
    }
  }

  const drawBadge = (x: number, topY: number, label: string, fill: Rgb): void => {
    const iconId = sanitizeText(label).trim().slice(0, 2).toUpperCase() || "?"
    const glyph: Rgb = [1, 1, 1]
    const size = 16
    const cx = x + size / 2
    const cy = topY - size / 2

    addCommand(rectFillCommand(x, topY, 16, 16, fill))
    addCommand(rectStrokeCommand(x, topY, 16, 16, [0.1, 0.2, 0.17], 0.5))

    if (iconId === "TS") {
      addCommand(circleStrokeCommand(cx, cy, 5.2, glyph, 1))
      addCommand(circleStrokeCommand(cx, cy, 2.7, glyph, 1))
      addCommand(lineCommand(cx - 5.2, cy, cx + 5.2, cy, glyph, 0.9))
      addCommand(lineCommand(cx, cy - 5.2, cx, cy + 5.2, glyph, 0.9))
      addCommand(circleFillCommand(cx, cy, 0.9, glyph))
      return
    }

    if (iconId === "ER") {
      addCommand(circleStrokeCommand(cx, cy, 5.3, glyph, 1))
      addCommand(circleStrokeCommand(cx, cy, 2.6, glyph, 1))
      addCommand(lineCommand(cx - 5.6, cy, cx + 5.6, cy, glyph, 0.9))
      addCommand(lineCommand(cx, cy - 5.6, cx, cy + 5.6, glyph, 0.9))
      addCommand(circleFillCommand(cx, cy, 1, glyph))
      return
    }

    if (iconId === "TL") {
      addCommand(circleStrokeCommand(cx, cy, 5.2, glyph, 1))
      addCommand(lineCommand(cx - 5.2, cy, cx + 5.2, cy, glyph, 0.9))
      addCommand(lineCommand(cx, cy - 5.2, cx, cy + 5.2, glyph, 0.9))
      addCommand(lineCommand(cx, cy, cx + 2.3, cy + 1.8, glyph, 1))
      addCommand(circleFillCommand(cx + 2.3, cy + 1.8, 1.2, glyph))
      return
    }

    if (iconId === "BE") {
      addCommand(circleFillCommand(cx - 2.1, cy + 1.6, 2.3, glyph))
      addCommand(circleFillCommand(cx + 2.1, cy + 1.6, 2.3, glyph))
      const heartBaseY = cy + 0.8
      addCommand(
        polygonFillCommand(
          [
            { x: cx - 4.6, y: heartBaseY },
            { x: cx + 4.6, y: heartBaseY },
            { x: cx, y: cy - 5.4 },
          ],
          glyph
        )
      )
      return
    }

    if (iconId === "PR") {
      addCommand(circleStrokeCommand(cx, cy, 5.1, glyph, 1))
      addCommand(lineCommand(cx - 4.3, cy - 2.5, cx + 4.3, cy - 2.5, glyph, 0.9))
      addCommand(lineCommand(cx, cy, cx + 3.7, cy + 2.8, glyph, 1))
      addCommand(circleFillCommand(cx, cy, 0.9, glyph))
      return
    }

    if (iconId === "FB") {
      addCommand(circleStrokeCommand(cx, cy, 5.2, glyph, 1))
      addCommand(lineCommand(cx - 2.8, cy - 0.2, cx - 0.6, cy - 2.6, glyph, 1.1))
      addCommand(lineCommand(cx - 0.6, cy - 2.6, cx + 3.2, cy + 2, glyph, 1.1))
      return
    }

    if (iconId === "RF") {
      addCommand(rectStrokeCommand(x + 2.7, topY - 2.4, 10.6, 7.8, glyph, 1))
      addCommand(
        polygonFillCommand(
          [
            { x: x + 6.9, y: topY - 10.2 },
            { x: x + 8.7, y: topY - 10.2 },
            { x: x + 7.5, y: topY - 12.8 },
          ],
          glyph
        )
      )
      addCommand(lineCommand(x + 4.4, topY - 5.2, x + 11, topY - 5.2, glyph, 0.8))
      addCommand(lineCommand(x + 4.4, topY - 7.2, x + 9.4, topY - 7.2, glyph, 0.8))
      return
    }

    if (iconId === "IN") {
      addCommand(circleStrokeCommand(cx, cy, 5.2, glyph, 1))
      addCommand(lineCommand(cx, cy - 2.3, cx, cy + 1.8, glyph, 1))
      addCommand(circleFillCommand(cx, cy + 3.5, 0.9, glyph))
      return
    }

    addCommand(circleFillCommand(cx, cy, 1.2, glyph))
  }

  const estimateChartHeight = (chart: PdfChart): number => {
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

  const drawBarsChart = (
    chart: Extract<PdfChart, { type: "bars" }>,
    x: number,
    topY: number,
    width: number
  ): number => {
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

  const drawHistogramChart = (
    chart: Extract<PdfChart, { type: "histogram" }>,
    x: number,
    topY: number,
    width: number
  ): number => {
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

    addCommand(
      lineCommand(plotX, plotBottomY, plotX + plotWidth, plotBottomY, COLOR_TEXT_SOFT, 0.8)
    )
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

  const drawSeriesGridChart = (
    chart: Extract<PdfChart, { type: "seriesGrid" }>,
    x: number,
    topY: number,
    width: number
  ): number => {
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
        addCommand(
          textCommand(x, rowBaseline - i * lineHeight, labelLines[i], 9, false, COLOR_TEXT)
        )
      }
      for (let i = 0; i < scoreLines.length; i++) {
        addCommand(
          textCommand(scoreX, rowBaseline - i * lineHeight, scoreLines[i], 9, true, COLOR_TEXT)
        )
      }
      for (let i = 0; i < shotsLines.length; i++) {
        addCommand(
          textCommand(
            shotsX,
            rowBaseline - i * lineHeight,
            shotsLines[i],
            9,
            false,
            COLOR_TEXT_SOFT
          )
        )
      }

      cursorY -= rowHeight
      addCommand(lineCommand(x, cursorY + 2, x + width, cursorY + 2, COLOR_GRID, 0.55))
    }

    return topY - cursorY + 2
  }

  const drawDirectionalArrow = (
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: Rgb,
    lineWidth = 1,
    headLength = 5,
    headWidth = 2.7
  ): void => {
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

  const drawHitLocationChart = (
    chart: Extract<PdfChart, { type: "hitLocation" }>,
    x: number,
    topY: number,
    width: number
  ): number => {
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

    drawDirectionalArrow(centerX, centerY, pointX, pointY, COLOR_HIT_VECTOR, 1.1)
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
        value: `${
          chart.horizontalDirection === "RIGHT" ? "rechts" : "links"
        }, ${chart.verticalDirection === "HIGH" ? "hoch" : "tief"}`,
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

  const drawChart = (chart: PdfChart, x: number, topY: number, width: number): number => {
    if (chart.type === "bars") {
      return drawBarsChart(chart, x, topY, width)
    }
    if (chart.type === "histogram") {
      return drawHistogramChart(chart, x, topY, width)
    }
    if (chart.type === "seriesGrid") {
      return drawSeriesGridChart(chart, x, topY, width)
    }
    return drawHitLocationChart(chart, x, topY, width)
  }

  const renderHeader = (): void => {
    const meta = (document.metaLines ?? []).filter((line) => line.trim().length > 0)
    const titleLines = wrapText(document.title, CONTENT_WIDTH - 92, 20)
    const subtitleLines = document.subtitle
      ? wrapText(document.subtitle, CONTENT_WIDTH - 92, 11)
      : []
    const titleHeight = titleLines.length * 22
    const subtitleHeight = subtitleLines.length > 0 ? 5 + subtitleLines.length * 13 : 0
    const titleBlockHeight = Math.max(34, titleHeight + subtitleHeight)
    const metaRows = buildRows(meta, CONTENT_WIDTH - 24, HEADER_LABEL_WIDTH, false)
    const metaBlockHeight = metaRows.totalHeight > 0 ? 12 + metaRows.totalHeight : 0
    const headerHeight = 18 + titleBlockHeight + metaBlockHeight + 14

    ensureSpace(headerHeight + CARD_GAP)

    const headerY = y
    addCommand(rectFillCommand(MARGIN_X, headerY, CONTENT_WIDTH, headerHeight, COLOR_HEADER_BG))
    addCommand(
      rectStrokeCommand(MARGIN_X, headerY, CONTENT_WIDTH, headerHeight, COLOR_HEADER_BORDER, 1)
    )
    addCommand(rectFillCommand(MARGIN_X, headerY, 6, headerHeight, COLOR_ACCENT))

    const badgeX = MARGIN_X + 14
    const badgeTopY = headerY - 18
    drawBadge(badgeX, badgeTopY, "TS", COLOR_ACCENT)

    const titleX = badgeX + 28
    let titleCursorY = headerY - 26
    for (const line of titleLines) {
      addCommand(textCommand(titleX, titleCursorY, line, 20, true, COLOR_HEADER_TITLE))
      titleCursorY -= 22
    }

    if (subtitleLines.length > 0) {
      titleCursorY -= 3
      for (const line of subtitleLines) {
        addCommand(textCommand(titleX, titleCursorY, line, 11, false, COLOR_TEXT_SOFT))
        titleCursorY -= 13
      }
    }

    if (metaRows.totalHeight > 0) {
      const titleBlockBottomY = headerY - 18 - titleBlockHeight
      const separatorY = titleBlockBottomY + 5
      addCommand(
        lineCommand(
          MARGIN_X + 12,
          separatorY,
          MARGIN_X + CONTENT_WIDTH - 12,
          separatorY,
          COLOR_DIVIDER,
          0.8
        )
      )
      drawRows(metaRows.rows, MARGIN_X + 12, titleBlockBottomY - 8)
    }

    y -= headerHeight + CARD_GAP
  }

  const renderSection = (section: PdfSection): void => {
    const icon = sanitizeText(section.icon ?? section.title.slice(0, 2))
      .trim()
      .slice(0, 2)
    const iconSpace = icon ? 24 : 0
    const titleWrapped = wrapText(section.title, CONTENT_WIDTH - 24 - iconSpace, 12)
    const charts = section.charts ?? []
    const estimatedChartHeights = charts.map(estimateChartHeight).filter((height) => height > 0)
    const chartBlockHeight =
      estimatedChartHeights.length > 0
        ? estimatedChartHeights.reduce((sum, height) => sum + height, 0) +
          (estimatedChartHeights.length - 1) * 8
        : 0
    const contentRows = buildRows(
      section.lines,
      CONTENT_WIDTH - 24,
      SECTION_LABEL_WIDTH,
      chartBlockHeight === 0
    )
    const hasTextRows = contentRows.rows.length > 0
    const sectionHeight =
      14 +
      titleWrapped.length * 15 +
      8 +
      contentRows.totalHeight +
      (hasTextRows && chartBlockHeight > 0 ? 6 : 0) +
      chartBlockHeight +
      12

    ensureSpace(sectionHeight + CARD_GAP)

    const sectionY = y
    addCommand(rectFillCommand(MARGIN_X, sectionY, CONTENT_WIDTH, sectionHeight, COLOR_SECTION_BG))
    addCommand(
      rectStrokeCommand(MARGIN_X, sectionY, CONTENT_WIDTH, sectionHeight, COLOR_SECTION_BORDER, 0.8)
    )
    addCommand(rectFillCommand(MARGIN_X, sectionY, 4, sectionHeight, COLOR_ACCENT))

    const titleX = MARGIN_X + 12 + iconSpace
    let cursorY = sectionY - 18
    if (icon) {
      drawBadge(MARGIN_X + 12, sectionY - 10, icon, COLOR_ACCENT)
    }

    for (const line of titleWrapped) {
      addCommand(textCommand(titleX, cursorY, line, 12, true, [0.14, 0.24, 0.33]))
      cursorY -= 15
    }
    addCommand(
      lineCommand(
        MARGIN_X + 12,
        cursorY + 5,
        MARGIN_X + CONTENT_WIDTH - 12,
        cursorY + 5,
        COLOR_DIVIDER,
        0.7
      )
    )
    cursorY -= 6

    if (hasTextRows) {
      drawRows(contentRows.rows, MARGIN_X + 12, cursorY)
      cursorY -= contentRows.totalHeight
    }

    if (chartBlockHeight > 0) {
      if (hasTextRows) cursorY -= 6
      const drawableCharts = charts.filter((chart) => estimateChartHeight(chart) > 0)
      drawableCharts.forEach((chart, index) => {
        const drawnHeight = drawChart(chart, MARGIN_X + 12, cursorY, CONTENT_WIDTH - 24)
        if (drawnHeight > 0) {
          cursorY -= drawnHeight
          if (index < drawableCharts.length - 1) {
            cursorY -= 8
          }
        }
      })
    }

    y -= sectionHeight + CARD_GAP
  }

  renderHeader()
  for (const section of document.sections) {
    renderSection(section)
  }

  pages.forEach((commands, index) => {
    const pageLabel = `Seite ${index + 1}/${pages.length}`
    commands.push(
      lineCommand(MARGIN_X, 28, MARGIN_X + CONTENT_WIDTH, 28, COLOR_DIVIDER, 0.7),
      textCommand(MARGIN_X + 2, 16, "Treffsicher", 8.5, false, COLOR_TEXT_SOFT),
      textCommand(PAGE_WIDTH - MARGIN_X - 78, 16, pageLabel, 8.5, false, COLOR_TEXT_SOFT)
    )
  })

  const maxObjectId = 4 + pages.length * 2
  const objects = new Map<number, string>()

  pages.forEach((commands, index) => {
    const pageObjectId = 5 + index * 2
    const contentObjectId = pageObjectId + 1
    const content = commands.join("\n")
    const streamData = `${content}\n`
    const streamLength = encodeLatin1(streamData).length

    objects.set(contentObjectId, `<< /Length ${streamLength} >>\nstream\n${streamData}endstream`)
    objects.set(
      pageObjectId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectId} 0 R >>`
    )
  })

  const pageKids = pages.map((_, index) => `${5 + index * 2} 0 R`).join(" ")

  objects.set(1, "<< /Type /Catalog /Pages 2 0 R >>")
  objects.set(2, `<< /Type /Pages /Kids [${pageKids}] /Count ${pages.length} >>`)
  objects.set(
    3,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"
  )
  objects.set(
    4,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
  )

  const chunks: Uint8Array[] = []
  const offsets: number[] = new Array(maxObjectId + 1).fill(0)
  let offset = 0

  const push = (value: string): void => {
    const bytes = encodeLatin1(value)
    chunks.push(bytes)
    offset += bytes.length
  }

  push("%PDF-1.4\n")

  for (let objectId = 1; objectId <= maxObjectId; objectId++) {
    offsets[objectId] = offset
    push(`${objectId} 0 obj\n${objects.get(objectId) ?? ""}\nendobj\n`)
  }

  const xrefOffset = offset
  push(`xref\n0 ${maxObjectId + 1}\n`)
  push("0000000000 65535 f \n")

  for (let objectId = 1; objectId <= maxObjectId; objectId++) {
    push(`${String(offsets[objectId]).padStart(10, "0")} 00000 n \n`)
  }

  push(`trailer\n<< /Size ${maxObjectId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`)

  return concatBytes(chunks)
}
