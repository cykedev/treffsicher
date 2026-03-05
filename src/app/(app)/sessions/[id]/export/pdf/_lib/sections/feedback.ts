import type { PdfSection } from "@/lib/exports/simplePdf"
import { comparisonDimensions } from "../constants"
import type { ExportTrainingSession } from "../data"
import { hasValue } from "../format"

export function buildFeedbackSection(session: ExportTrainingSession): PdfSection {
  const feedback = session.feedback!
  const lines: string[] = []

  lines.push(
    `Leistungsziel erreicht: ${feedback.goalAchieved === true ? "Ja" : feedback.goalAchieved === false ? "Nein" : "-"}`
  )

  if (hasValue(feedback.goalAchievedNote)) {
    lines.push(`Anmerkung zum Ziel: ${feedback.goalAchievedNote}`)
  }
  if (hasValue(feedback.explanation)) {
    lines.push(`Erklärung / Abweichungen zur Prognose: ${feedback.explanation}`)
  }
  if (hasValue(feedback.progress)) {
    lines.push(`Fortschritte durch diese Einheit: ${feedback.progress}`)
  }
  if (hasValue(feedback.fiveBestShots)) {
    lines.push(`Five Best Shots: ${feedback.fiveBestShots}`)
  }
  if (hasValue(feedback.wentWell)) {
    lines.push(`Was lief besonders gut?: ${feedback.wentWell}`)
  }
  if (hasValue(feedback.insights)) {
    lines.push(`Aha-Erlebnisse: ${feedback.insights}`)
  }

  return {
    title: "Feedback",
    icon: "FB",
    lines,
    charts: [
      {
        type: "bars",
        title: "Tatsächlicher Stand (0-100)",
        maxValue: 100,
        items: comparisonDimensions.map((dimension) => ({
          label: dimension.label,
          value: Number(feedback[dimension.key]),
        })),
      },
    ],
  }
}
