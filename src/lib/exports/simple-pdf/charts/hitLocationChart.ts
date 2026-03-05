import {
  circleFillCommand,
  clamp,
  lineCommand,
  polygonFillCommand,
  rectStrokeCommand,
  textCommand,
  wrapText,
  type Rgb,
} from "@/lib/exports/pdfPrimitives"
import {
  COLOR_GRID,
  COLOR_HIT_POINT,
  COLOR_HIT_VECTOR,
  COLOR_TEXT,
  COLOR_TEXT_SOFT,
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

export function drawHitLocationChart(
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

export function estimateHitLocationChartHeight(
  chart: Extract<PdfChart, { type: "hitLocation" }>
): number {
  const titleHeight = chart.title ? 14 : 0
  return titleHeight + 96
}
