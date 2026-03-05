import { NextRequest, NextResponse } from "next/server"
import { getAuthSession } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { calculateTotalScore } from "@/lib/sessions/calculateScore"
import { SESSION_TYPE_LABELS } from "@/lib/sessions/presentation"
import { formatShotsForLine, parseShotValue, parseShotsJson } from "@/lib/sessions/shots"
import { buildStyledPdf, type PdfSection } from "@/lib/exports/simplePdf"

const comparisonDimensions = [
  { key: "fitness", label: "Kondition" },
  { key: "nutrition", label: "Ernährung" },
  { key: "technique", label: "Technik" },
  { key: "tactics", label: "Taktik" },
  { key: "mentalStrength", label: "Mentale Stärke" },
  { key: "environment", label: "Umfeld" },
  { key: "equipment", label: "Material" },
] as const

const shotBucketColors = [
  "#ef4444",
  "#eab308",
  "#374151",
  "#52606d",
  "#6b7280",
  "#8896a0",
  "#9ca3af",
  "#b5bec8",
  "#c8d1da",
  "#dae1e8",
  "#edf1f5",
]

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

function formatDateForFile(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date))
}

function buildShotHistogramBuckets(shots: string[], isDecimal: boolean) {
  const counts = new Array<number>(11).fill(0)

  for (const shot of shots) {
    const value = parseShotValue(shot)
    if (value === null) continue
    const bucket = isDecimal ? Math.floor(value) : Math.round(value)
    const ring = Math.max(0, Math.min(10, bucket))
    counts[ring] += 1
  }

  return Array.from({ length: 11 }, (_, index) => {
    const ring = 10 - index
    return {
      label: String(ring),
      value: counts[ring],
      colorHex: shotBucketColors[index],
    }
  })
}

function formatScore(score: number | null, isDecimal: boolean): string {
  if (score === null) return "-"
  if (isDecimal) return score.toFixed(1)
  return String(Math.round(score))
}

function hasValue(value: string | null | undefined): boolean {
  return value != null && value.trim().length > 0
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession()
  if (!session) {
    return new NextResponse("Nicht angemeldet", { status: 401 })
  }

  const { id } = await params
  const trainingSession = await db.trainingSession.findFirst({
    where: {
      id,
      userId: session.user.id,
    },
    include: {
      discipline: {
        select: {
          name: true,
          scoringType: true,
        },
      },
      series: {
        orderBy: { position: "asc" },
      },
      wellbeing: true,
      reflection: true,
      prognosis: true,
      feedback: true,
      goals: {
        include: {
          goal: {
            select: {
              title: true,
            },
          },
        },
      },
    },
  })

  if (!trainingSession) {
    return new NextResponse("Einheit nicht gefunden", { status: 404 })
  }

  const isDecimal = trainingSession.discipline?.scoringType === "TENTH"
  const hasScoring = trainingSession.type === "TRAINING" || trainingSession.type === "WETTKAMPF"
  const hasHitLocation =
    hasScoring &&
    trainingSession.hitLocationHorizontalMm !== null &&
    trainingSession.hitLocationHorizontalDirection !== null &&
    trainingSession.hitLocationVerticalMm !== null &&
    trainingSession.hitLocationVerticalDirection !== null
  const displayName = session.user.name ?? session.user.email ?? "-"

  const totalScore = calculateTotalScore(
    trainingSession.series.map((serie) => ({
      scoreTotal: serie.scoreTotal !== null ? parseFloat(String(serie.scoreTotal)) : null,
      isPractice: serie.isPractice,
    }))
  )
  const scoringShots = trainingSession.series
    .filter((serie) => !serie.isPractice)
    .flatMap((serie) => parseShotsJson(serie.shots))
  const shotHistogramBuckets = buildShotHistogramBuckets(scoringShots, isDecimal)

  const metaLines = [
    `Name: ${displayName}`,
    `Typ: ${SESSION_TYPE_LABELS[trainingSession.type] ?? trainingSession.type}`,
    `Disziplin: ${trainingSession.discipline?.name ?? "-"}`,
    `Ort: ${trainingSession.location ?? "-"}`,
    `Trainingsziel: ${trainingSession.trainingGoal ?? "-"}`,
    `Saisonziele: ${
      trainingSession.goals.length > 0
        ? trainingSession.goals.map((entry) => entry.goal.title).join(", ")
        : "-"
    }`,
  ]

  const sections: PdfSection[] = []

  if (hasScoring) {
    const resultLines: string[] = []
    const executionChartItems: {
      label: string
      value: number
      displayValue: string
    }[] = []
    const seriesSummaryRows: {
      label: string
      score: string
      shots: string
    }[] = []
    resultLines.push(`Gesamtergebnis: ${formatScore(totalScore, isDecimal)} Ringe`)
    resultLines.push(`Wertungsschüsse: ${scoringShots.length}`)
    resultLines.push(`Serien gesamt: ${trainingSession.series.length}`)

    if (trainingSession.series.length === 0) {
      resultLines.push("Serien: -")
    } else {
      let practiceCounter = 0
      let scoreCounter = 0
      trainingSession.series.forEach((serie) => {
        const label = serie.isPractice
          ? `Probe-Serie ${++practiceCounter}`
          : `Serie ${++scoreCounter}`
        const score = formatScore(
          serie.scoreTotal !== null ? parseFloat(String(serie.scoreTotal)) : null,
          isDecimal
        )
        const shots = parseShotsJson(serie.shots)
        seriesSummaryRows.push({
          label,
          score: `${score} Ringe`,
          shots: shots.length > 0 ? formatShotsForLine(shots) : "-",
        })
        if (serie.executionQuality !== null) {
          executionChartItems.push({
            label,
            value: serie.executionQuality,
            displayValue: `${serie.executionQuality}/5`,
          })
        }
      })
    }

    sections.push({
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
    })
  }

  if (
    hasHitLocation &&
    trainingSession.hitLocationHorizontalMm !== null &&
    trainingSession.hitLocationHorizontalDirection !== null &&
    trainingSession.hitLocationVerticalMm !== null &&
    trainingSession.hitLocationVerticalDirection !== null
  ) {
    sections.push({
      title: "Trefferlage",
      icon: "TL",
      lines: [],
      charts: [
        {
          type: "hitLocation",
          horizontalMm: trainingSession.hitLocationHorizontalMm,
          horizontalDirection: trainingSession.hitLocationHorizontalDirection,
          verticalMm: trainingSession.hitLocationVerticalMm,
          verticalDirection: trainingSession.hitLocationVerticalDirection,
          maxMm: 8,
        },
      ],
    })
  }

  if (trainingSession.wellbeing) {
    sections.push({
      title: "Befinden",
      icon: "BE",
      lines: [],
      charts: [
        {
          type: "bars",
          title: "Befinden (0-100)",
          maxValue: 100,
          items: [
            { label: "Schlaf", value: trainingSession.wellbeing.sleep },
            { label: "Energie", value: trainingSession.wellbeing.energy },
            { label: "Stress", value: trainingSession.wellbeing.stress },
            { label: "Motivation", value: trainingSession.wellbeing.motivation },
          ],
        },
      ],
    })
  }

  if (trainingSession.prognosis) {
    const prognosisData = trainingSession.prognosis
    const prognosisLines: string[] = []
    if (hasValue(prognosisData.performanceGoal)) {
      prognosisLines.push(`Leistungsziel: ${prognosisData.performanceGoal}`)
    }
    if (prognosisData.expectedScore !== null) {
      prognosisLines.push(`Erwartetes Ergebnis (Ringe): ${String(prognosisData.expectedScore)}`)
    }
    if (prognosisData.expectedCleanShots !== null) {
      prognosisLines.push(`Erwartete saubere Schüsse: ${prognosisData.expectedCleanShots}`)
    }

    sections.push({
      title: "Prognose",
      icon: "PR",
      lines: prognosisLines,
      charts: [
        {
          type: "bars",
          title: "Selbsteinschätzung (0-100)",
          maxValue: 100,
          items: comparisonDimensions.map((dimension) => ({
            label: dimension.label,
            value: Number(prognosisData[dimension.key as keyof typeof prognosisData]),
          })),
        },
      ],
    })
  }

  if (trainingSession.feedback) {
    const feedbackData = trainingSession.feedback
    const feedbackLines: string[] = []
    feedbackLines.push(
      `Leistungsziel erreicht: ${feedbackData.goalAchieved === true ? "Ja" : feedbackData.goalAchieved === false ? "Nein" : "-"}`
    )
    if (hasValue(feedbackData.goalAchievedNote)) {
      feedbackLines.push(`Anmerkung zum Ziel: ${feedbackData.goalAchievedNote}`)
    }
    if (hasValue(feedbackData.explanation)) {
      feedbackLines.push(`Erklärung / Abweichungen zur Prognose: ${feedbackData.explanation}`)
    }
    if (hasValue(feedbackData.progress)) {
      feedbackLines.push(`Fortschritte durch diese Einheit: ${feedbackData.progress}`)
    }
    if (hasValue(feedbackData.fiveBestShots)) {
      feedbackLines.push(`Five Best Shots: ${feedbackData.fiveBestShots}`)
    }
    if (hasValue(feedbackData.wentWell)) {
      feedbackLines.push(`Was lief besonders gut?: ${feedbackData.wentWell}`)
    }
    if (hasValue(feedbackData.insights)) {
      feedbackLines.push(`Aha-Erlebnisse: ${feedbackData.insights}`)
    }

    sections.push({
      title: "Feedback",
      icon: "FB",
      lines: feedbackLines,
      charts: [
        {
          type: "bars",
          title: "Tatsächlicher Stand (0-100)",
          maxValue: 100,
          items: comparisonDimensions.map((dimension) => ({
            label: dimension.label,
            value: Number(feedbackData[dimension.key as keyof typeof feedbackData]),
          })),
        },
      ],
    })
  }

  if (trainingSession.reflection) {
    const reflectionLines: string[] = []
    if (hasValue(trainingSession.reflection.observations)) {
      reflectionLines.push(`Beobachtungen: ${trainingSession.reflection.observations}`)
    }
    if (hasValue(trainingSession.reflection.insight)) {
      reflectionLines.push(
        `Heute ist mir klargeworden, dass ...: ${trainingSession.reflection.insight}`
      )
    }
    if (hasValue(trainingSession.reflection.learningQuestion)) {
      reflectionLines.push(
        `Was kann ich tun, um ...?: ${trainingSession.reflection.learningQuestion}`
      )
    }
    reflectionLines.push(
      `Schuss-Ablauf eingehalten: ${
        trainingSession.reflection.routineFollowed === true
          ? "Ja"
          : trainingSession.reflection.routineFollowed === false
            ? "Nein"
            : "-"
      }`
    )
    if (hasValue(trainingSession.reflection.routineDeviation)) {
      reflectionLines.push(`Abweichung: ${trainingSession.reflection.routineDeviation}`)
    }

    sections.push({
      title: "Reflexion",
      icon: "RF",
      lines: reflectionLines,
    })
  }

  if (sections.length === 0) {
    sections.push({
      title: "Hinweis",
      icon: "IN",
      lines: ["Für diese Einheit sind noch keine Detaildaten erfasst."],
    })
  }

  const pdf = buildStyledPdf({
    title: "Treffsicher - Einheitenexport",
    subtitle: formatDateTime(trainingSession.date),
    metaLines,
    sections,
  })
  const fileDate = formatDateForFile(trainingSession.date)
  const pdfBytes = new Uint8Array(pdf.length)
  pdfBytes.set(pdf)

  return new NextResponse(pdfBytes.buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="session-${fileDate}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  })
}
