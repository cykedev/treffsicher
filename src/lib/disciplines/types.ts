export type ActionResult = {
  error?: string | Record<string, string[]>
  success?: boolean
}

export type DisciplineUsage = {
  sessionCount: number
  shotRoutineCount: number
  canDelete: boolean
}
