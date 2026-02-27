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
 * Berechnet die Seriensumme aus Einzelschuss-Werten.
 * Wird im Client zur Live-Berechnung der Seriensumme verwendet wenn
 * der Einzelschuss-Modus aktiv ist.
 *
 * @param shots - Array von Einzelschuss-Werten als Strings (z.B. ["9.5", "10.1"])
 * @returns Seriensumme, gerundet auf eine Dezimalstelle
 */
export function calculateSumFromShots(shots: string[]): number {
  const sum = shots.reduce((acc, shot) => {
    const value = parseFloat(shot)
    // Ungültige Werte (leer, NaN) als 0 behandeln
    return acc + (isNaN(value) ? 0 : value)
  }, 0)
  // Auf eine Dezimalstelle runden — verhindert Floating-Point-Artefakte (z.B. 9.5 + 0.4 = 9.899...)
  return Math.round(sum * 10) / 10
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
