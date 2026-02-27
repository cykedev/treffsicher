/**
 * Berechnet die Gesamtpunktzahl einer Einheit aus den Serienwertungen.
 * Probeschuss-Serien (isPractice) fliessen nicht ins Ergebnis ein —
 * sie dienen der Einstimmung und werden nur zur Nachvollziehbarkeit gespeichert.
 *
 * @param series - Array von Serien mit scoreTotal und isPractice-Flag
 * @returns Gesamtpunktzahl als number (0 wenn keine Wertungsserien vorhanden)
 */
export function calculateTotalScore(
  series: Array<{ scoreTotal: number | null; isPractice: boolean }>
): number {
  return series
    .filter((s) => !s.isPractice) // Probeschüsse ausschliessen
    .reduce((sum, s) => sum + (s.scoreTotal ?? 0), 0)
}

/**
 * Berechnet den Durchschnittswert einer Serie über mehrere Einheiten.
 * Nützlich für Trend-Anzeigen.
 *
 * @param values - Array von Werten (null-Werte werden ignoriert)
 * @returns Durchschnitt oder null wenn keine Werte vorhanden
 */
export function calculateAverage(values: (number | null)[]): number | null {
  const valid = values.filter((v): v is number => v !== null)
  if (valid.length === 0) return null
  return valid.reduce((sum, v) => sum + v, 0) / valid.length
}
