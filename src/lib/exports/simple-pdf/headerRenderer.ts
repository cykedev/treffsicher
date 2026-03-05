import {
  lineCommand,
  rectFillCommand,
  rectStrokeCommand,
  textCommand,
  wrapText,
} from "@/lib/exports/pdfPrimitives"
import { drawBadge } from "@/lib/exports/simple-pdf/badgeRenderer"
import {
  CARD_GAP,
  COLOR_ACCENT,
  COLOR_DIVIDER,
  COLOR_HEADER_BG,
  COLOR_HEADER_BORDER,
  COLOR_HEADER_TITLE,
  COLOR_TEXT_SOFT,
  CONTENT_WIDTH,
  HEADER_LABEL_WIDTH,
  MARGIN_X,
} from "@/lib/exports/simple-pdf/constants"
import { addCommand, ensureSpace, type LayoutContext } from "@/lib/exports/simple-pdf/layoutContext"
import { buildRows, drawRows } from "@/lib/exports/simple-pdf/rowRenderer"
import type { StyledPdfDocument } from "@/lib/exports/simple-pdf/types"

export function renderHeader(context: LayoutContext, document: StyledPdfDocument): void {
  const meta = (document.metaLines ?? []).filter((line) => line.trim().length > 0)
  const titleLines = wrapText(document.title, CONTENT_WIDTH - 92, 20)
  const subtitleLines = document.subtitle ? wrapText(document.subtitle, CONTENT_WIDTH - 92, 11) : []
  const titleHeight = titleLines.length * 22
  const subtitleHeight = subtitleLines.length > 0 ? 5 + subtitleLines.length * 13 : 0
  const titleBlockHeight = Math.max(34, titleHeight + subtitleHeight)
  const metaRows = buildRows(meta, CONTENT_WIDTH - 24, HEADER_LABEL_WIDTH, false)
  const metaBlockHeight = metaRows.totalHeight > 0 ? 12 + metaRows.totalHeight : 0
  const headerHeight = 18 + titleBlockHeight + metaBlockHeight + 14

  ensureSpace(context, headerHeight + CARD_GAP)

  const headerY = context.y
  addCommand(
    context,
    rectFillCommand(MARGIN_X, headerY, CONTENT_WIDTH, headerHeight, COLOR_HEADER_BG)
  )
  addCommand(
    context,
    rectStrokeCommand(MARGIN_X, headerY, CONTENT_WIDTH, headerHeight, COLOR_HEADER_BORDER, 1)
  )
  addCommand(context, rectFillCommand(MARGIN_X, headerY, 6, headerHeight, COLOR_ACCENT))

  const badgeX = MARGIN_X + 14
  const badgeTopY = headerY - 18
  drawBadge(badgeX, badgeTopY, "TS", COLOR_ACCENT, (command) => addCommand(context, command))

  const titleX = badgeX + 28
  let titleCursorY = headerY - 26
  for (const line of titleLines) {
    addCommand(context, textCommand(titleX, titleCursorY, line, 20, true, COLOR_HEADER_TITLE))
    titleCursorY -= 22
  }

  if (subtitleLines.length > 0) {
    titleCursorY -= 3
    for (const line of subtitleLines) {
      addCommand(context, textCommand(titleX, titleCursorY, line, 11, false, COLOR_TEXT_SOFT))
      titleCursorY -= 13
    }
  }

  if (metaRows.totalHeight > 0) {
    const titleBlockBottomY = headerY - 18 - titleBlockHeight
    const separatorY = titleBlockBottomY + 5
    addCommand(
      context,
      lineCommand(
        MARGIN_X + 12,
        separatorY,
        MARGIN_X + CONTENT_WIDTH - 12,
        separatorY,
        COLOR_DIVIDER,
        0.8
      )
    )
    drawRows(metaRows.rows, MARGIN_X + 12, titleBlockBottomY - 8, (command) =>
      addCommand(context, command)
    )
  }

  context.y -= headerHeight + CARD_GAP
}
