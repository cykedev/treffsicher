import { NextRequest, NextResponse } from "next/server"
import { getAuthSession } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import { calculateTotalScore } from "@/lib/sessions/calculateScore"
import { buildStyledPdf, type PdfSection } from "@/lib/exports/simplePdf"

const sessionTypeLabels: Record<string, string> = {
  TRAINING: "Training",
  WETTKAMPF: "Wettkampf",
  TROCKENTRAINING: "Trockentraining",
  MENTAL: "Mentaltraining",
}

const comparisonDimensions = [
  { key: "fitness", label: "Kondition" },
  { key: "nutrition", label: "Ernährung" },
  { key: "technique", label: "Technik" },
  { key: "tactics", label: "Taktik" },
  { key: "mentalStrength", label: "Mentale Stärke" },
  { key: "environment", label: "Umfeld" },
  { key: "equipment", label: "Material" },
] as const

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

function parseShotsJson(shots: unknown): string[] {
  if (!Array.isArray(shots)) return []
  return shots.filter((entry): entry is string => typeof entry === "string")
}

function formatScore(score: number | null, isDecimal: boolean): string {
  if (score === null) return "-"
  if (isDecimal) return score.toFixed(1)
  return String(Math.round(score))
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

  const totalScore = calculateTotalScore(
    trainingSession.series.map((serie) => ({
      scoreTotal: serie.scoreTotal !== null ? parseFloat(String(serie.scoreTotal)) : null,
      isPractice: serie.isPractice,
    }))
  )

  const metaLines = [
    `Typ: ${sessionTypeLabels[trainingSession.type] ?? trainingSession.type}`,
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
    resultLines.push(`Gesamtergebnis: ${formatScore(totalScore, isDecimal)} Ringe`)

    if (trainingSession.series.length === 0) {
      resultLines.push("Serien: -")
    } else {
      let practiceCounter = 0
      let scoreCounter = 0
      trainingSession.series.forEach((serie) => {
        const label = serie.isPractice ? `Probe ${++practiceCounter}` : `Serie ${++scoreCounter}`
        const score = formatScore(
          serie.scoreTotal !== null ? parseFloat(String(serie.scoreTotal)) : null,
          isDecimal
        )
        const shots = parseShotsJson(serie.shots)
        resultLines.push(`${label}: ${score} Ringe`)
        if (shots.length > 0) {
          resultLines.push(`  Schüsse: ${shots.join(" · ")}`)
        }
      })
    }

    sections.push({
      title: "Ergebnis",
      lines: resultLines,
    })
  }

  if (trainingSession.wellbeing) {
    sections.push({
      title: "Befinden",
      lines: [
        `Schlaf: ${trainingSession.wellbeing.sleep}`,
        `Energie: ${trainingSession.wellbeing.energy}`,
        `Stress: ${trainingSession.wellbeing.stress}`,
        `Motivation: ${trainingSession.wellbeing.motivation}`,
      ],
    })
  }

  if (trainingSession.prognosis) {
    const prognosisLines: string[] = []
    prognosisLines.push(`Leistungsziel: ${trainingSession.prognosis.performanceGoal ?? "-"}`)
    prognosisLines.push(
      `Erwartete Ringe: ${
        trainingSession.prognosis.expectedScore !== null
          ? String(trainingSession.prognosis.expectedScore)
          : "-"
      }`
    )
    prognosisLines.push(
      `Erwartete saubere Schüsse: ${trainingSession.prognosis.expectedCleanShots ?? "-"}`
    )

    for (const dimension of comparisonDimensions) {
      prognosisLines.push(
        `${dimension.label}: ${
          trainingSession.prognosis[dimension.key as keyof typeof trainingSession.prognosis]
        }`
      )
    }

    sections.push({
      title: "Prognose",
      lines: prognosisLines,
    })
  }

  if (trainingSession.feedback) {
    const feedbackLines: string[] = []
    feedbackLines.push(
      `Leistungsziel erreicht: ${trainingSession.feedback.goalAchieved === true ? "Ja" : trainingSession.feedback.goalAchieved === false ? "Nein" : "-"}`
    )
    feedbackLines.push(`Notiz Zielerreichung: ${trainingSession.feedback.goalAchievedNote ?? "-"}`)
    feedbackLines.push(`Erklärung: ${trainingSession.feedback.explanation ?? "-"}`)
    feedbackLines.push(`Fortschritt: ${trainingSession.feedback.progress ?? "-"}`)
    feedbackLines.push(`Five Best Shots: ${trainingSession.feedback.fiveBestShots ?? "-"}`)
    feedbackLines.push(`Was lief gut: ${trainingSession.feedback.wentWell ?? "-"}`)
    feedbackLines.push(`Aha-Erlebnisse: ${trainingSession.feedback.insights ?? "-"}`)

    for (const dimension of comparisonDimensions) {
      feedbackLines.push(
        `${dimension.label}: ${
          trainingSession.feedback[dimension.key as keyof typeof trainingSession.feedback]
        }`
      )
    }

    sections.push({
      title: "Feedback",
      lines: feedbackLines,
    })
  }

  if (trainingSession.reflection) {
    sections.push({
      title: "Reflexion",
      lines: [
        `Beobachtungen: ${trainingSession.reflection.observations ?? "-"}`,
        `Heute ist mir klargeworden: ${trainingSession.reflection.insight ?? "-"}`,
        `Was kann ich tun, um ...: ${trainingSession.reflection.learningQuestion ?? "-"}`,
        `Ablauf eingehalten: ${
          trainingSession.reflection.routineFollowed === true
            ? "Ja"
            : trainingSession.reflection.routineFollowed === false
              ? "Nein"
              : "-"
        }`,
        `Notiz zum Ablauf: ${trainingSession.reflection.routineDeviation ?? "-"}`,
      ],
    })
  }

  if (sections.length === 0) {
    sections.push({
      title: "Hinweis",
      lines: ["Für diese Einheit sind noch keine Detaildaten erfasst."],
    })
  }

  const pdf = buildStyledPdf({
    title: "Treffsicher - Einheit Export",
    subtitle: formatDateTime(trainingSession.date),
    metaLines,
    sections,
  })
  const fileDate = formatDateForFile(trainingSession.date)

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="einheit-${fileDate}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  })
}
