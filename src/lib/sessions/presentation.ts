import type { TrainingSession } from "@/generated/prisma/client"

export type SessionType = TrainingSession["type"]

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  TRAINING: "Training",
  WETTKAMPF: "Wettkampf",
  TROCKENTRAINING: "Trockentraining",
  MENTAL: "Mentaltraining",
}

export const SESSION_TYPE_BADGE_CLASS: Record<SessionType, string> = {
  TRAINING: "border-blue-800   bg-blue-950   text-blue-300",
  WETTKAMPF: "border-amber-800  bg-amber-950  text-amber-300",
  TROCKENTRAINING: "border-emerald-800 bg-emerald-950 text-emerald-300",
  MENTAL: "border-purple-800  bg-purple-950  text-purple-300",
}

export const SESSION_TYPES_WITH_DISCIPLINE: SessionType[] = ["TRAINING", "WETTKAMPF"]

export const EXECUTION_QUALITY_LABELS: Record<number, string> = {
  1: "1 – Schlecht",
  2: "2 – Mässig",
  3: "3 – Mittel",
  4: "4 – Gut",
  5: "5 – Sehr gut",
}

export function needsDisciplineForSessionType(type: string): boolean {
  return SESSION_TYPES_WITH_DISCIPLINE.includes(type as SessionType)
}
