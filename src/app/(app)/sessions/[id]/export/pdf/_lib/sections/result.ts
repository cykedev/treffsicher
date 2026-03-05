import { calculateTotalScore } from "@/lib/sessions/calculateScore"
import type { PdfSection } from "@/lib/exports/simplePdf"
import { formatShotsForLine, parseShotsJson } from "@/lib/sessions/shots"
import type { ExportTrainingSession } from "../data"
import { formatScore } from "../format"
import { buildShotHistogramBuckets } from "../histogram"

function toSeriesScoreTotal(value: unknown): number | null {
  if (value === null || value === undefined) return null
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : null
}

export function buildResultSection(
  session: ExportTrainingSession,
  isDecimal: boolean,
  scoringShots: string[]
): PdfSection {
  const totalScore = calculateTotalScore(
    session.series.map((series) => ({
      scoreTotal: toSeriesScoreTotal(series.scoreTotal),
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
      const score = formatScore(toSeriesScoreTotal(series.scoreTotal), isDecimal)
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
