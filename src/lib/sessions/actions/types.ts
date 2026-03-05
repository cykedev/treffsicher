import type {
  Attachment,
  Discipline,
  Feedback,
  GoalType,
  HitLocationHorizontalDirection,
  HitLocationVerticalDirection,
  Prognosis,
  Reflection,
  Series,
  TrainingSession,
  Wellbeing,
} from "@/generated/prisma/client"

export type SessionWithDiscipline = TrainingSession & {
  discipline: Discipline | null
  series: Array<{ scoreTotal: unknown; isPractice: boolean; shots: unknown }>
  // Fuer Tagebuch-Indikatoren: nur Vorhandensein pruefen, kein vollstaendiges Laden noetig
  wellbeing: { id: string } | null
  reflection: { id: string } | null
  prognosis: { id: string } | null
  feedback: { id: string } | null
}

// Prognosis mit serialisierten Decimal-Feldern — kann ueber die Server→Client-Grenze uebergeben werden
export type SerializedPrognosis = Omit<Prognosis, "expectedScore"> & {
  expectedScore: string | null // Decimal → string serialisiert
}

// SeriesDetail mit serialisierten Decimal-Feldern
export type SerializedSeries = Omit<Series, "scoreTotal"> & {
  shots: unknown // Json-Feld aus Prisma
  scoreTotal: number | null // Decimal → number serialisiert
}

export type SessionGoalSummary = {
  goalId: string
  goal: {
    id: string
    title: string
    type: GoalType
  }
}

export type SessionDetail = TrainingSession & {
  discipline: Discipline | null
  // Decimal-Felder sind zu plain types serialisiert — keine Prisma Decimal-Objekte
  series: SerializedSeries[]
  attachments: Attachment[]
  goals: SessionGoalSummary[]
  // Mentaltraining-Daten — alle optional (Phase 3)
  wellbeing: Wellbeing | null
  reflection: Reflection | null
  prognosis: SerializedPrognosis | null
  feedback: Feedback | null
}

export type ActionResult = {
  error?: string
  success?: boolean
}

export type MeytonImportPreviewSeries = {
  nr: number
  scoreTotal: string
  shots: string[]
}

export type MeytonImportPreviewHitLocation = {
  horizontalMm: number
  horizontalDirection: HitLocationHorizontalDirection
  verticalMm: number
  verticalDirection: HitLocationVerticalDirection
}

export type MeytonImportPreview = {
  date: string | null
  series: MeytonImportPreviewSeries[]
  hitLocation: MeytonImportPreviewHitLocation | null
}

export type MeytonImportPreviewResult = {
  error?: string
  data?: MeytonImportPreview
}
