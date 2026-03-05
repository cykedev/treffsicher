import {
  lineCommand,
  rectFillCommand,
  rectStrokeCommand,
  sanitizeText,
  textCommand,
  wrapText,
} from "@/lib/exports/pdfPrimitives"
import { drawBadge } from "@/lib/exports/simple-pdf/badgeRenderer"
import { drawChart, estimateChartHeight } from "@/lib/exports/simple-pdf/chartRenderer"
import {
  CARD_GAP,
  COLOR_ACCENT,
  COLOR_DIVIDER,
  COLOR_SECTION_BG,
  COLOR_SECTION_BORDER,
  CONTENT_WIDTH,
  MARGIN_X,
  SECTION_LABEL_WIDTH,
} from "@/lib/exports/simple-pdf/constants"
import { addCommand, ensureSpace, type LayoutContext } from "@/lib/exports/simple-pdf/layoutContext"
import { buildRows, drawRows } from "@/lib/exports/simple-pdf/rowRenderer"
import type { PdfSection } from "@/lib/exports/simple-pdf/types"

export function renderSection(context: LayoutContext, section: PdfSection): void {
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

  ensureSpace(context, sectionHeight + CARD_GAP)

  const sectionY = context.y
  addCommand(
    context,
    rectFillCommand(MARGIN_X, sectionY, CONTENT_WIDTH, sectionHeight, COLOR_SECTION_BG)
  )
  addCommand(
    context,
    rectStrokeCommand(MARGIN_X, sectionY, CONTENT_WIDTH, sectionHeight, COLOR_SECTION_BORDER, 0.8)
  )
  addCommand(context, rectFillCommand(MARGIN_X, sectionY, 4, sectionHeight, COLOR_ACCENT))

  const titleX = MARGIN_X + 12 + iconSpace
  let cursorY = sectionY - 18
  if (icon) {
    drawBadge(MARGIN_X + 12, sectionY - 10, icon, COLOR_ACCENT, (command) =>
      addCommand(context, command)
    )
  }

  for (const line of titleWrapped) {
    addCommand(context, textCommand(titleX, cursorY, line, 12, true, [0.14, 0.24, 0.33]))
    cursorY -= 15
  }

  addCommand(
    context,
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
    drawRows(contentRows.rows, MARGIN_X + 12, cursorY, (command) => addCommand(context, command))
    cursorY -= contentRows.totalHeight
  }

  if (chartBlockHeight > 0) {
    if (hasTextRows) cursorY -= 6
    const drawableCharts = charts.filter((chart) => estimateChartHeight(chart) > 0)

    drawableCharts.forEach((chart, index) => {
      const drawnHeight = drawChart(chart, MARGIN_X + 12, cursorY, CONTENT_WIDTH - 24, (command) =>
        addCommand(context, command)
      )
      if (drawnHeight > 0) {
        cursorY -= drawnHeight
        if (index < drawableCharts.length - 1) {
          cursorY -= 8
        }
      }
    })
  }

  context.y -= sectionHeight + CARD_GAP
}
