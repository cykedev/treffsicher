import { sanitizeText, textCommand, wrapText } from "@/lib/exports/pdfPrimitives"
import {
  COLOR_TEXT,
  COLOR_TEXT_SOFT,
  INDENT_STEP,
  LINE_HEIGHT,
} from "@/lib/exports/simple-pdf/constants"
import type { AddPdfCommand, RenderRow } from "@/lib/exports/simple-pdf/types"

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

export function buildRows(
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

export function drawRows(
  rows: RenderRow[],
  startX: number,
  startY: number,
  addCommand: AddPdfCommand
): void {
  let cursorY = startY

  for (const row of rows) {
    const rowX = startX + row.indent

    if (row.kind === "field") {
      for (let i = 0; i < row.labelLines.length; i++) {
        addCommand(
          textCommand(rowX, cursorY - i * LINE_HEIGHT, row.labelLines[i], 10, false, COLOR_TEXT_SOFT)
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
      addCommand(textCommand(rowX, cursorY - i * LINE_HEIGHT, row.textLines[i], 10, false, COLOR_TEXT))
    }
    cursorY -= row.height
  }
}
