export type ScoringType = "WHOLE" | "TENTH"

/**
 * Prüft ob ein Einzelschusswert für die gegebene Wertungsart gültig ist.
 *
 * Zehntelwertung (TENTH):
 *   - 0.0 ist gültig (Fehlschuss / Null-Ring)
 *   - 0.1–0.9 existieren NICHT — der 0-Ring hat keine Zehntelabstufung
 *   - 1.0–10.9 sind gültig (eine Dezimalstelle, Zehntel 0–9)
 *
 * Ganzringwertung (WHOLE):
 *   - 0–10 ganzzahlig, keine Dezimalstellen
 */
export function isValidShotValue(value: string, scoringType: ScoringType): boolean {
  if (value === "" || value === undefined) return true
  const num = parseFloat(value)
  if (isNaN(num) || num < 0) return false

  if (scoringType === "WHOLE") {
    return Number.isInteger(num) && num <= 10
  }

  // TENTH: 0.0 einziger gültiger Wert unter 1.0 (0.1–0.9 existieren nicht)
  if (num > 0 && num < 1.0) return false
  if (num > 10.9) return false
  // Maximal eine Dezimalstelle — Floating-Point-Toleranz berücksichtigen
  return Math.abs(Math.round(num * 10) - num * 10) < 0.001
}

/**
 * Berechnet den Maximalwert einer Serie.
 * TENTH: Schussanzahl × 10.9 | WHOLE: Schussanzahl × 10
 */
export function getSeriesMax(scoringType: ScoringType, shotsCount: number): number {
  return scoringType === "TENTH" ? shotsCount * 10.9 : shotsCount * 10
}

/**
 * Prüft ob eine Seriensumme im gültigen Bereich liegt (0 bis Maximum).
 */
export function isValidSeriesTotal(
  value: string,
  scoringType: ScoringType,
  shotsCount: number
): boolean {
  if (value === "" || value === undefined) return true
  const num = parseFloat(value)
  if (isNaN(num) || num < 0) return false
  // Kleine Floating-Point-Toleranz, z.B. 10.9 * 10 = 108.99999…
  return num <= getSeriesMax(scoringType, shotsCount) + 0.001
}

/**
 * Formatiert den Maximalwert einer Serie als String für die UI.
 */
export function formatSeriesMax(scoringType: ScoringType, shotsCount: number): string {
  const max = getSeriesMax(scoringType, shotsCount)
  return scoringType === "TENTH" ? max.toFixed(1) : String(max)
}
