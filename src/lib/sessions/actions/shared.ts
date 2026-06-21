import { db } from "@/lib/db"
import type { PrismaClient, TrainingSession } from "@/generated/prisma/client"
import { MAX_GOAL_IDS_PER_REQUEST } from "@/lib/sessions/actions/sessionSchemas"

// Oeffentliche API: Schemas, Konstanten und Parser werden hier gebuendelt
// re-exportiert, damit bestehende Aufrufer weiterhin nur aus diesem Modul
// importieren.
export {
  CreateSessionSchema,
  MeytonImportSchema,
  MAX_MEYTON_PDF_SIZE_BYTES,
  MAX_SERIES_PER_SESSION,
  MAX_SHOTS_PER_SERIES,
  MAX_SHOTS_JSON_LENGTH,
  MAX_GOAL_IDS_PER_REQUEST,
} from "@/lib/sessions/actions/sessionSchemas"
export {
  parseHitLocationFromFormData,
  type ParsedHitLocationInput,
} from "@/lib/sessions/actions/hitLocationParsing"
export {
  calculateSeriesTotal,
  mapShotToScoringType,
  parseSeriesFromFormData,
  type ParsedSeriesInput,
} from "@/lib/sessions/actions/seriesParsing"

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
