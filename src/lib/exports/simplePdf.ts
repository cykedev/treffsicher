import {
  concatBytes,
  encodeLatin1,
  lineCommand,
  rectFillCommand,
  rectStrokeCommand,
  sanitizeText,
  textCommand,
  wrapText,
} from "@/lib/exports/pdfPrimitives"
import { drawBadge } from "@/lib/exports/simple-pdf/badgeRenderer"
import { estimateChartHeight, drawChart } from "@/lib/exports/simple-pdf/chartRenderer"
import {
  CARD_GAP,
  COLOR_ACCENT,
  COLOR_DIVIDER,
  COLOR_HEADER_BG,
  COLOR_HEADER_BORDER,
  COLOR_HEADER_TITLE,
  COLOR_SECTION_BG,
  COLOR_SECTION_BORDER,
  COLOR_TEXT_SOFT,
  CONTENT_WIDTH,
  HEADER_LABEL_WIDTH,
  MARGIN_BOTTOM,
  MARGIN_TOP,
  MARGIN_X,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  SECTION_LABEL_WIDTH,
} from "@/lib/exports/simple-pdf/constants"
import { buildRows, drawRows } from "@/lib/exports/simple-pdf/rowRenderer"
import type { AddPdfCommand, PdfSection, StyledPdfDocument } from "@/lib/exports/simple-pdf/types"

export type {
  PdfChart,
  PdfChartBarItem,
  PdfChartHistogramBucket,
  PdfChartSeriesRow,
  PdfSection,
  StyledPdfDocument,
} from "@/lib/exports/simple-pdf/types"

export function buildStyledPdf(document: StyledPdfDocument): Uint8Array {
  const pages: string[][] = [[]]
  let pageIndex = 0
  let y = PAGE_HEIGHT - MARGIN_TOP

  const addCommand: AddPdfCommand = (command) => {
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
    drawBadge(badgeX, badgeTopY, "TS", COLOR_ACCENT, addCommand)

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
      drawRows(metaRows.rows, MARGIN_X + 12, titleBlockBottomY - 8, addCommand)
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
      drawBadge(MARGIN_X + 12, sectionY - 10, icon, COLOR_ACCENT, addCommand)
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
      drawRows(contentRows.rows, MARGIN_X + 12, cursorY, addCommand)
      cursorY -= contentRows.totalHeight
    }

    if (chartBlockHeight > 0) {
      if (hasTextRows) cursorY -= 6
      const drawableCharts = charts.filter((chart) => estimateChartHeight(chart) > 0)
      drawableCharts.forEach((chart, index) => {
        const drawnHeight = drawChart(chart, MARGIN_X + 12, cursorY, CONTENT_WIDTH - 24, addCommand)
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
