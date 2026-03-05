import { SESSION_TYPE_LABELS } from "@/lib/sessions/presentation"
import type { ExportTrainingSession } from "./data"

export function buildPdfMetaLines(session: ExportTrainingSession, displayName: string): string[] {
  return [
    `Name: ${displayName}`,
    `Typ: ${SESSION_TYPE_LABELS[session.type] ?? session.type}`,
    `Disziplin: ${session.discipline?.name ?? "-"}`,
    `Ort: ${session.location ?? "-"}`,
    `Trainingsziel: ${session.trainingGoal ?? "-"}`,
    `Saisonziele: ${
      session.goals.length > 0 ? session.goals.map((entry) => entry.goal.title).join(", ") : "-"
    }`,
  ]
}
