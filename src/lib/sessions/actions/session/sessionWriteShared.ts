import { z } from "zod"
import {
  CreateSessionSchema,
  parseGoalIdsFromFormData,
  parseHitLocationFromFormData,
  parseSeriesFromFormData,
  parseSessionDateInput,
  resolveAccessibleDisciplineId,
  type ParsedHitLocationInput,
  type ParsedSeriesInput,
  type SessionTransactionClient,
} from "@/lib/sessions/actions/shared"
import type { ActionResult } from "@/lib/sessions/actions/types"

type ParsedSessionInput = z.infer<typeof CreateSessionSchema>

export type PreparedSessionWriteInput = {
  parsed: ParsedSessionInput
  sessionDate: Date
  disciplineId: string | null
  seriesData: ParsedSeriesInput[]
  selectedGoalIds: string[]
  hitLocationInput: ParsedHitLocationInput | null
}

type PrepareContext = {
  action: "createSession" | "updateSession"
  sessionId?: string
}

function parseBaseSessionInput(
  formData: FormData,
  context: PrepareContext
): ParsedSessionInput | ActionResult {
  const parsed = CreateSessionSchema.safeParse({
    type: formData.get("type"),
    date: formData.get("date"),
    location: formData.get("location") || undefined,
    disciplineId: formData.get("disciplineId") || undefined,
    trainingGoal: formData.get("trainingGoal") || undefined,
  })

  if (!parsed.success) {
    const suffix = context.action === "updateSession" ? " beim Update" : ""
    console.error(`Validierungsfehler${suffix}:`, parsed.error.flatten())
    return { error: "Bitte die Pflichtfelder prüfen." }
  }

  return parsed.data
}

export async function prepareSessionWriteInput(
  formData: FormData,
  userId: string,
  context: PrepareContext
): Promise<PreparedSessionWriteInput | ActionResult> {
  const parsed = parseBaseSessionInput(formData, context)
  if ("error" in parsed) return parsed

  const sessionDate = parseSessionDateInput(parsed.date)
  if (!sessionDate) return { error: "Datum/Uhrzeit ist ungültig." }

  const disciplineId = await resolveAccessibleDisciplineId(parsed.disciplineId, userId)
  if (parsed.disciplineId && !disciplineId) {
    console.warn(`${context.action}: ungueltige oder nicht erlaubte disciplineId`, {
      userId,
      ...(context.sessionId ? { sessionId: context.sessionId } : {}),
    })
    return { error: "Die gewählte Disziplin ist nicht verfügbar." }
  }

  const seriesData = parseSeriesFromFormData(formData)
  if (seriesData === null) {
    return { error: "Seriendaten sind ungültig oder überschreiten die Grenzwerte." }
  }

  const selectedGoalIds = parseGoalIdsFromFormData(formData)
  const hitLocationInput = parseHitLocationFromFormData(formData)
  if (hitLocationInput === "INVALID") {
    return { error: "Trefferlage ist ungültig." }
  }

  return {
    parsed,
    sessionDate,
    disciplineId,
    seriesData,
    selectedGoalIds,
    hitLocationInput,
  }
}

export function buildSessionWriteData(input: PreparedSessionWriteInput): {
  type: ParsedSessionInput["type"]
  date: Date
  location: string | null
  disciplineId: string | null
  trainingGoal: string | null
  hitLocationHorizontalMm: number | null
  hitLocationHorizontalDirection: ParsedHitLocationInput["horizontalDirection"] | null
  hitLocationVerticalMm: number | null
  hitLocationVerticalDirection: ParsedHitLocationInput["verticalDirection"] | null
} {
  return {
    type: input.parsed.type,
    date: input.sessionDate,
    location: input.parsed.location ?? null,
    disciplineId: input.disciplineId,
    trainingGoal: input.parsed.trainingGoal || null,
    hitLocationHorizontalMm: input.hitLocationInput?.horizontalMm ?? null,
    hitLocationHorizontalDirection: input.hitLocationInput?.horizontalDirection ?? null,
    hitLocationVerticalMm: input.hitLocationInput?.verticalMm ?? null,
    hitLocationVerticalDirection: input.hitLocationInput?.verticalDirection ?? null,
  }
}

export async function createSessionSeries(
  tx: SessionTransactionClient,
  sessionId: string,
  seriesData: ParsedSeriesInput[]
): Promise<void> {
  if (seriesData.length === 0) return

  await tx.series.createMany({
    data: seriesData.map((series) => ({
      sessionId,
      position: series.position,
      isPractice: series.isPractice,
      scoreTotal: series.scoreTotal ? series.scoreTotal : null,
      shots: series.shots ?? undefined,
      executionQuality: series.executionQuality ?? null,
    })),
  })
}

export async function replaceSessionSeries(
  tx: SessionTransactionClient,
  sessionId: string,
  seriesData: ParsedSeriesInput[]
): Promise<void> {
  await tx.series.deleteMany({ where: { sessionId } })
  await createSessionSeries(tx, sessionId, seriesData)
}

export async function syncSessionGoals(
  tx: SessionTransactionClient,
  sessionId: string,
  userId: string,
  selectedGoalIds: string[],
  clearExisting: boolean
): Promise<void> {
  if (clearExisting) {
    await tx.sessionGoal.deleteMany({ where: { sessionId } })
  }
  if (selectedGoalIds.length === 0) return

  const validGoals = await tx.goal.findMany({
    where: {
      id: { in: selectedGoalIds },
      userId,
    },
    select: { id: true },
  })
  if (validGoals.length === 0) return

  await tx.sessionGoal.createMany({
    data: validGoals.map((goal) => ({
      sessionId,
      goalId: goal.id,
    })),
    skipDuplicates: true,
  })
}
