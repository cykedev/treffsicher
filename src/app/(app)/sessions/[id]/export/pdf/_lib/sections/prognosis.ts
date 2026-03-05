import type { PdfSection } from "@/lib/exports/simplePdf"
import { comparisonDimensions } from "../constants"
import type { ExportTrainingSession } from "../data"
import { hasValue } from "../format"

export function buildPrognosisSection(session: ExportTrainingSession): PdfSection {
  const prognosis = session.prognosis!
  const lines: string[] = []

  if (hasValue(prognosis.performanceGoal)) {
    lines.push(`Leistungsziel: ${prognosis.performanceGoal}`)
  }
  if (prognosis.expectedScore !== null) {
    lines.push(`Erwartetes Ergebnis (Ringe): ${String(prognosis.expectedScore)}`)
  }
  if (prognosis.expectedCleanShots !== null) {
    lines.push(`Erwartete saubere Schüsse: ${prognosis.expectedCleanShots}`)
  }

  return {
    title: "Prognose",
    icon: "PR",
    lines,
    charts: [
      {
        type: "bars",
        title: "Selbsteinschätzung (0-100)",
        maxValue: 100,
        items: comparisonDimensions.map((dimension) => ({
          label: dimension.label,
          value: Number(prognosis[dimension.key]),
        })),
      },
    ],
  }
}
