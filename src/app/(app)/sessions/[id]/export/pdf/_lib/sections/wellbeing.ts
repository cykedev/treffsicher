import type { PdfSection } from "@/lib/exports/simplePdf"
import type { ExportTrainingSession } from "../data"

export function buildWellbeingSection(session: ExportTrainingSession): PdfSection {
  return {
    title: "Befinden",
    icon: "BE",
    lines: [],
    charts: [
      {
        type: "bars",
        title: "Befinden (0-100)",
        maxValue: 100,
        items: [
          { label: "Schlaf", value: session.wellbeing!.sleep },
          { label: "Energie", value: session.wellbeing!.energy },
          { label: "Stress", value: session.wellbeing!.stress },
          { label: "Motivation", value: session.wellbeing!.motivation },
        ],
      },
    ],
  }
}
