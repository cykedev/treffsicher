import { calculateTotalScore } from "@/lib/sessions/calculateScore"
import { formatShotsForLine, parseShotsJson } from "@/lib/sessions/shots"
import type { PdfSection } from "@/lib/exports/simplePdf"
import { comparisonDimensions } from "./constants"
import type { ExportTrainingSession } from "./data"
import { formatScore, hasValue } from "./format"
import { buildShotHistogramBuckets } from "./histogram"

function buildResultSection(
  session: ExportTrainingSession,
  isDecimal: boolean,
  scoringShots: string[]
): PdfSection {
  const totalScore = calculateTotalScore(
    session.series.map((series) => ({
      scoreTotal: series.scoreTotal !== null ? parseFloat(String(series.scoreTotal)) : null,
      isPractice: series.isPractice,
    }))
  )
  const shotHistogramBuckets = buildShotHistogramBuckets(scoringShots, isDecimal)
  const resultLines: string[] = []
  const executionChartItems: Array<{
    label: string
    value: number
    displayValue: string
  }> = []
  const seriesSummaryRows: Array<{
    label: string
    score: string
    shots: string
  }> = []

  resultLines.push(`Gesamtergebnis: ${formatScore(totalScore, isDecimal)} Ringe`)
  resultLines.push(`Wertungsschüsse: ${scoringShots.length}`)
  resultLines.push(`Serien gesamt: ${session.series.length}`)

  if (session.series.length === 0) {
    resultLines.push("Serien: -")
  } else {
    let practiceCounter = 0
    let scoreCounter = 0
    session.series.forEach((series) => {
      const label = series.isPractice
        ? `Probe-Serie ${++practiceCounter}`
        : `Serie ${++scoreCounter}`
      const score = formatScore(
        series.scoreTotal !== null ? parseFloat(String(series.scoreTotal)) : null,
        isDecimal
      )
      const shots = parseShotsJson(series.shots)
      seriesSummaryRows.push({
        label,
        score: `${score} Ringe`,
        shots: shots.length > 0 ? formatShotsForLine(shots) : "-",
      })
      if (series.executionQuality !== null) {
        executionChartItems.push({
          label,
          value: series.executionQuality,
          displayValue: `${series.executionQuality}/5`,
        })
      }
    })
  }

  return {
    title: "Ergebnis",
    icon: "ER",
    lines: resultLines,
    charts: [
      ...(seriesSummaryRows.length > 0
        ? [
            {
              type: "seriesGrid" as const,
              title: "Serienübersicht",
              rows: seriesSummaryRows,
            },
          ]
        : []),
      ...(executionChartItems.length > 0
        ? [
            {
              type: "bars" as const,
              title: "Ausführung pro Serie (0-5)",
              maxValue: 5,
              items: executionChartItems,
            },
          ]
        : []),
      ...(scoringShots.length > 0
        ? [
            {
              type: "histogram" as const,
              title: `Schussverteilung (${scoringShots.length} Schüsse)`,
              buckets: shotHistogramBuckets,
            },
          ]
        : []),
    ],
  }
}

function buildHitLocationSection(session: ExportTrainingSession): PdfSection {
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

function buildWellbeingSection(session: ExportTrainingSession): PdfSection {
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

function buildPrognosisSection(session: ExportTrainingSession): PdfSection {
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

function buildFeedbackSection(session: ExportTrainingSession): PdfSection {
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

function buildReflectionSection(session: ExportTrainingSession): PdfSection {
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

export function buildPdfSections(session: ExportTrainingSession): PdfSection[] {
  const sections: PdfSection[] = []
  const isDecimal = session.discipline?.scoringType === "TENTH"
  const hasScoring = session.type === "TRAINING" || session.type === "WETTKAMPF"
  const hasHitLocation =
    hasScoring &&
    session.hitLocationHorizontalMm !== null &&
    session.hitLocationHorizontalDirection !== null &&
    session.hitLocationVerticalMm !== null &&
    session.hitLocationVerticalDirection !== null

  const scoringShots = session.series
    .filter((series) => !series.isPractice)
    .flatMap((series) => parseShotsJson(series.shots))

  if (hasScoring) {
    sections.push(buildResultSection(session, isDecimal, scoringShots))
  }
  if (hasHitLocation) {
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
