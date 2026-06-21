import { z } from "zod"

export const CreateSessionSchema = z.object({
  type: z.enum(["TRAINING", "WETTKAMPF", "TROCKENTRAINING", "MENTAL"] as const),
  date: z.string().min(1, "Datum ist erforderlich"),
  location: z.string().max(200).optional(),
  disciplineId: z.string().optional(),
  trainingGoal: z.string().max(500).optional(),
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
