import type { PdfSection } from "@/lib/exports/simplePdf"
import type { ExportTrainingSession } from "../data"

export function buildHitLocationSection(session: ExportTrainingSession): PdfSection {
  return {
    title: "Trefferlage",
    icon: "TL",
    lines: [],
    charts: [
      {
        type: "hitLocation",
        horizontalMm: session.hitLocationHorizontalMm!,
        horizontalDirection: session.hitLocationHorizontalDirection!,
        verticalMm: session.hitLocationVerticalMm!,
        verticalDirection: session.hitLocationVerticalDirection!,
        maxMm: 8,
      },
    ],
  }
}
