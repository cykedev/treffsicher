import {
  circleFillCommand,
  circleStrokeCommand,
  lineCommand,
  polygonFillCommand,
  rectFillCommand,
  rectStrokeCommand,
  sanitizeText,
  type Rgb,
} from "@/lib/exports/pdfPrimitives"
import type { AddPdfCommand } from "@/lib/exports/simple-pdf/types"

export function drawBadge(
  x: number,
  topY: number,
  label: string,
  fill: Rgb,
  addCommand: AddPdfCommand
): void {
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
