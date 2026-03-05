import type { PdfSection } from "@/lib/exports/simplePdf"
import { parseShotsJson } from "@/lib/sessions/shots"
import type { ExportTrainingSession } from "./data"
import { buildFeedbackSection } from "./sections/feedback"
import { buildHitLocationSection } from "./sections/hitLocation"
import { buildPrognosisSection } from "./sections/prognosis"
import { buildReflectionSection } from "./sections/reflection"
import { buildResultSection } from "./sections/result"
import { buildWellbeingSection } from "./sections/wellbeing"

function hasHitLocationData(session: ExportTrainingSession): boolean {
  return (
    session.hitLocationHorizontalMm !== null &&
    session.hitLocationHorizontalDirection !== null &&
    session.hitLocationVerticalMm !== null &&
    session.hitLocationVerticalDirection !== null
  )
}

export function buildPdfSections(session: ExportTrainingSession): PdfSection[] {
  const sections: PdfSection[] = []
  const isDecimal = session.discipline?.scoringType === "TENTH"
  const hasScoring = session.type === "TRAINING" || session.type === "WETTKAMPF"

  const scoringShots = session.series
    .filter((series) => !series.isPractice)
    .flatMap((series) => parseShotsJson(series.shots))

  if (hasScoring) {
    sections.push(buildResultSection(session, isDecimal, scoringShots))
  }

  if (hasScoring && hasHitLocationData(session)) {
    sections.push(buildHitLocationSection(session))
  }

  if (session.wellbeing) {
    sections.push(buildWellbeingSection(session))
  }
  if (session.prognosis) {
    sections.push(buildPrognosisSection(session))
  }
  if (session.feedback) {
    sections.push(buildFeedbackSection(session))
  }
  if (session.reflection) {
    sections.push(buildReflectionSection(session))
  }

  if (sections.length === 0) {
    sections.push({
      title: "Hinweis",
      icon: "IN",
      lines: ["Für diese Einheit sind noch keine Detaildaten erfasst."],
    })
  }

  return sections
}
