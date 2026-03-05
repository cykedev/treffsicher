import { z } from "zod"
import { db } from "@/lib/db"
import type {
  HitLocationHorizontalDirection,
  HitLocationVerticalDirection,
  PrismaClient,
  ScoringType,
  TrainingSession,
} from "@/generated/prisma/client"

// Schemas
export const CreateSessionSchema = z.object({
  type: z.enum(["TRAINING", "WETTKAMPF", "TROCKENTRAINING", "MENTAL"] as const),
  date: z.string().min(1, "Datum ist erforderlich"),
  location: z.string().optional(),
  disciplineId: z.string().optional(),
  trainingGoal: z.string().optional(),
})

export const MeytonImportSchema = z.object({
  disciplineId: z.string().min(1, "Bitte Disziplin waehlen"),
  source: z.enum(["URL", "UPLOAD"] as const, {
    message: "Bitte Quelle waehlen",
  }),
  pdfUrl: z.string().optional(),
})

export const MAX_MEYTON_PDF_SIZE_BYTES = 10 * 1024 * 1024
export const MAX_SERIES_PER_SESSION = 120
export const MAX_SHOTS_PER_SERIES = 120
export const MAX_SHOTS_JSON_LENGTH = 16 * 1024
export const MAX_GOAL_IDS_PER_REQUEST = 100
// FormData ist untrusted Input.
// FormData kommt untrusted vom Client. Die Limits verhindern, dass einzelne
// Requests Speicher und CPU unverhaeltnismaessig binden.

const HORIZONTAL_DIRECTION_VALUES = ["LEFT", "RIGHT"] as const
const VERTICAL_DIRECTION_VALUES = ["HIGH", "LOW"] as const

export type ParsedHitLocationInput = {
  horizontalMm: number
  horizontalDirection: HitLocationHorizontalDirection
  verticalMm: number
  verticalDirection: HitLocationVerticalDirection
}

export type SessionTransactionClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>

export function isScoringSessionType(type: TrainingSession["type"]): boolean {
  return type === "TRAINING" || type === "WETTKAMPF"
}

export function parseGoalIdsFromFormData(formData: FormData): string[] {
  const deduped = new Set<string>()
  for (const value of formData.getAll("goalIds")) {
    if (typeof value !== "string" || value.length === 0) continue
    deduped.add(value)
    if (deduped.size >= MAX_GOAL_IDS_PER_REQUEST) break
  }
  return [...deduped]
}

function parseHitLocationMillimeters(rawValue: FormDataEntryValue | null): number | null {
  if (typeof rawValue !== "string") return null
  const normalized = rawValue.trim().replace(",", ".")
  if (!normalized) return null
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 9999.99) return null
  return Math.round(parsed * 100) / 100
}

export function parseHitLocationFromFormData(
  formData: FormData
): ParsedHitLocationInput | null | "INVALID" {
  const horizontalMmRaw = formData.get("hitLocationHorizontalMm")
  const horizontalDirectionRaw = formData.get("hitLocationHorizontalDirection")
  const verticalMmRaw = formData.get("hitLocationVerticalMm")
  const verticalDirectionRaw = formData.get("hitLocationVerticalDirection")

  const hasAnyValue =
    (typeof horizontalMmRaw === "string" && horizontalMmRaw.trim() !== "") ||
    (typeof horizontalDirectionRaw === "string" && horizontalDirectionRaw.trim() !== "") ||
    (typeof verticalMmRaw === "string" && verticalMmRaw.trim() !== "") ||
    (typeof verticalDirectionRaw === "string" && verticalDirectionRaw.trim() !== "")

  if (!hasAnyValue) return null

  // Drei Zustaende sind noetig:
  // null = bewusst nicht gesetzt, INVALID = teilweise/ungueltig gesetzt.
  // So kann der aufrufende Code praezise zwischen "optional leer" und
  // "muss als Fehler behandelt werden" unterscheiden.
  const horizontalMm = parseHitLocationMillimeters(horizontalMmRaw)
  const verticalMm = parseHitLocationMillimeters(verticalMmRaw)
  if (horizontalMm === null || verticalMm === null) return "INVALID"

  if (
    typeof horizontalDirectionRaw !== "string" ||
    typeof verticalDirectionRaw !== "string" ||
    !HORIZONTAL_DIRECTION_VALUES.includes(
      horizontalDirectionRaw as HitLocationHorizontalDirection
    ) ||
    !VERTICAL_DIRECTION_VALUES.includes(verticalDirectionRaw as HitLocationVerticalDirection)
  ) {
    return "INVALID"
  }

  return {
    horizontalMm,
    horizontalDirection: horizontalDirectionRaw as HitLocationHorizontalDirection,
    verticalMm,
    verticalDirection: verticalDirectionRaw as HitLocationVerticalDirection,
  }
}

export function parseSessionDateInput(rawValue: string): Date | null {
  const parsed = new Date(rawValue)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed
}

export async function resolveAccessibleDisciplineId(
  disciplineId: string | undefined,
  userId: string
): Promise<string | null> {
  if (!disciplineId) return null

  // Disziplinzugriff ist zweigleisig:
  // Disziplinen koennen global (System) oder nutzerspezifisch sein.
  // Wir akzeptieren beides, aber niemals archivierte Eintraege.
  const discipline = await db.discipline.findFirst({
    where: {
      id: disciplineId,
      isArchived: false,
      OR: [{ isSystem: true }, { ownerId: userId }],
    },
    select: { id: true },
  })

  return discipline?.id ?? null
}

export function mapShotToScoringType(value: number, scoringType: ScoringType): string {
  if (scoringType === "WHOLE") {
    // Meyton liefert Zehntelwerte.
    // Meyton liefert Zehntelwerte; fuer Ganzring-Disziplinen muss der Schuss
    // pro Wert auf einen gueltigen Ganzringwert zurueckgefuehrt werden.
    return String(Math.floor(value))
  }

  return value.toFixed(1)
}

export function calculateSeriesTotal(shots: string[], scoringType: ScoringType): string {
  const sum = shots.reduce((total, shot) => total + Number(shot), 0)

  if (scoringType === "WHOLE") {
    // Gesamtsumme muss zum ScoringType passen.
    // Seriengesamtwert muss zum gewaehlten ScoringType passen und darf keine
    // versteckten Zehntel behalten.
    return String(Math.floor(sum))
  }

  return (Math.round(sum * 10) / 10).toFixed(1)
}

// Schema fuer eine einzelne Serie inkl. Phase-2-Felder
const SeriesInputSchema = z.object({
  position: z.number().int().min(1),
  isPractice: z.boolean(),
  // Decimal als String fuer praezise Darstellung, null wenn nicht eingegeben
  scoreTotal: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? v : null)),
  // Einzelschuesse als JSON-String-Array, optional
  shots: z
    .string()
    .max(MAX_SHOTS_JSON_LENGTH)
    .optional()
    .transform((v) => {
      if (!v) return null
      try {
        const parsed = JSON.parse(v)
        if (!Array.isArray(parsed)) return null
        // Nur nicht-leere, valide Strings behalten
        const values = parsed
          .filter((s: unknown) => typeof s === "string" && s !== "")
          .slice(0, MAX_SHOTS_PER_SERIES) as string[]
        return values
      } catch {
        return null
      }
    }),
  // Ausfuehrungsqualitaet 1–5, optional
  executionQuality: z
    .string()
    .optional()
    .transform((v) => {
      if (!v || v === "") return null
      const n = parseInt(v, 10)
      return n >= 1 && n <= 5 ? n : null
    }),
})

export type ParsedSeriesInput = z.infer<typeof SeriesInputSchema>

export function parseSeriesFromFormData(formData: FormData): ParsedSeriesInput[] | null {
  const seriesData: ParsedSeriesInput[] = []

  let i = 0
  while (
    i < MAX_SERIES_PER_SESSION &&
    (formData.has(`series[${i}][scoreTotal]`) || formData.has(`series[${i}][isPractice]`))
  ) {
    const scoreTotalRaw = formData.get(`series[${i}][scoreTotal]`) as string | null
    const isPracticeRaw = formData.get(`series[${i}][isPractice]`)
    const shotsRaw = formData.get(`series[${i}][shots]`) as string | null
    const qualityRaw = formData.get(`series[${i}][executionQuality]`) as string | null

    const seriesParsed = SeriesInputSchema.safeParse({
      position: i + 1,
      isPractice: isPracticeRaw === "true",
      scoreTotal: scoreTotalRaw ?? "",
      shots: shotsRaw ?? undefined,
      executionQuality: qualityRaw ?? undefined,
    })

    if (!seriesParsed.success) {
      // Kein Teilimport:
      // Teilimporte fuehren zu schwer nachvollziehbaren Abweichungen
      // zwischen sichtbarer Eingabe und gespeicherten Werten.
      console.warn("Session-Import abgebrochen: ungueltige Serien-Daten", {
        index: i,
        issues: seriesParsed.error.issues,
      })
      return null
    }
    // Downstream bekommt nur validierte Daten.
    // downstream (DB write, score calc) arbeitet ausschliesslich mit diesem
    // Array und kann dadurch auf erneute Strukturpruefungen verzichten.
    seriesData.push(seriesParsed.data)
    i++
  }

  if (
    i >= MAX_SERIES_PER_SESSION &&
    (formData.has(`series[${i}][scoreTotal]`) || formData.has(`series[${i}][isPractice]`))
  ) {
    console.warn("Session-Import abgebrochen: zu viele Serien im Request", {
      maxAllowed: MAX_SERIES_PER_SESSION,
    })
    return null
  }

  return seriesData
}
