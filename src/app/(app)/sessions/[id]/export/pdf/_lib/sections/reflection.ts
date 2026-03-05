import type { PdfSection } from "@/lib/exports/simplePdf"
import type { ExportTrainingSession } from "../data"
import { hasValue } from "../format"

export function buildReflectionSection(session: ExportTrainingSession): PdfSection {
  const reflection = session.reflection!
  const lines: string[] = []

  if (hasValue(reflection.observations)) {
    lines.push(`Beobachtungen: ${reflection.observations}`)
  }
  if (hasValue(reflection.insight)) {
    lines.push(`Heute ist mir klargeworden, dass ...: ${reflection.insight}`)
  }
  if (hasValue(reflection.learningQuestion)) {
    lines.push(`Was kann ich tun, um ...?: ${reflection.learningQuestion}`)
  }

  lines.push(
    `Schuss-Ablauf eingehalten: ${
      reflection.routineFollowed === true
        ? "Ja"
        : reflection.routineFollowed === false
          ? "Nein"
          : "-"
    }`
  )

  if (hasValue(reflection.routineDeviation)) {
    lines.push(`Abweichung: ${reflection.routineDeviation}`)
  }

  return {
    title: "Reflexion",
    icon: "RF",
    lines,
  }
}
