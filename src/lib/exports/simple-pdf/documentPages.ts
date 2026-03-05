import { lineCommand, textCommand } from "@/lib/exports/pdfPrimitives"
import {
  COLOR_DIVIDER,
  COLOR_TEXT_SOFT,
  CONTENT_WIDTH,
  MARGIN_X,
  PAGE_WIDTH,
} from "@/lib/exports/simple-pdf/constants"
import { createInitialLayoutContext } from "@/lib/exports/simple-pdf/layoutContext"
import { renderHeader } from "@/lib/exports/simple-pdf/headerRenderer"
import { renderSection } from "@/lib/exports/simple-pdf/sectionRenderer"
import type { StyledPdfDocument } from "@/lib/exports/simple-pdf/types"

function appendPageFooters(pages: string[][]): void {
  pages.forEach((commands, index) => {
    const pageLabel = `Seite ${index + 1}/${pages.length}`
    commands.push(
      lineCommand(MARGIN_X, 28, MARGIN_X + CONTENT_WIDTH, 28, COLOR_DIVIDER, 0.7),
      textCommand(MARGIN_X + 2, 16, "Treffsicher", 8.5, false, COLOR_TEXT_SOFT),
      textCommand(PAGE_WIDTH - MARGIN_X - 78, 16, pageLabel, 8.5, false, COLOR_TEXT_SOFT)
    )
  })
}

export function renderDocumentPages(document: StyledPdfDocument): string[][] {
  const context = createInitialLayoutContext()
  renderHeader(context, document)

  for (const section of document.sections) {
    renderSection(context, section)
  }

  appendPageFooters(context.pages)
  return context.pages
}
