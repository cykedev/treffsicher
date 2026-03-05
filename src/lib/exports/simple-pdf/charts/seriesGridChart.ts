import { lineCommand, textCommand, wrapText } from "@/lib/exports/pdfPrimitives"
import { COLOR_GRID, COLOR_TEXT, COLOR_TEXT_SOFT } from "@/lib/exports/simple-pdf/constants"
import type { AddPdfCommand, PdfChart } from "@/lib/exports/simple-pdf/types"

export function drawSeriesGridChart(
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

export function estimateSeriesGridChartHeight(
  chart: Extract<PdfChart, { type: "seriesGrid" }>,
  approxWidth: number
): number {
  const rows = chart.rows.filter((row) => row.label.trim().length > 0)
  if (rows.length === 0) return 0

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
