// Liest Feldfehler defensiv aus einem ActionResult-artigen Wert.
// Toleriert beide Projektformen:
//   - { error?: string }                         (nur globaler Fehler)
//   - { error?: string | Record<string, string[] | undefined> }
//   - { success: true; data?: ... }              (kein Fehler)
// Gibt undefined zurück, wenn für das Feld kein Fehler vorliegt.

type FieldErrorSource =
  | { error?: string | Record<string, string[] | undefined> }
  | { success: true }
  | null
  | undefined

export function getFieldError(state: FieldErrorSource, field: string): string | undefined {
  if (!state || !("error" in state) || !state.error) return undefined
  if (typeof state.error === "string") return undefined
  return state.error[field]?.[0]
}

export function getGeneralError(state: FieldErrorSource): string | undefined {
  if (!state || !("error" in state) || !state.error) return undefined
  return typeof state.error === "string" ? state.error : undefined
}
