import { z } from "zod"
import type { ScoringType } from "@/generated/prisma/client"
import {
  MAX_SERIES_PER_SESSION,
  MAX_SHOTS_JSON_LENGTH,
  MAX_SHOTS_PER_SERIES,
} from "@/lib/sessions/actions/sessionSchemas"

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
