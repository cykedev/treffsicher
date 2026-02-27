/**
 * Berechnet den gleitenden Durchschnitt einer Wertereihe.
 * Verwendet ein symmetrisches Fenster um den aktuellen Wert.
 *
 * Gibt null zurück wenn zu wenig gültige Datenpunkte im Fenster vorhanden sind —
 * verhindert irreführende Durchschnitte an den Rändern der Reihe.
 *
 * @param values - Eingabewerte (null-Werte werden im Fenster übersprungen)
 * @param windowSize - Fenstergrösse (ungerade Zahlen ergeben symmetrische Fenster)
 * @returns Array gleicher Länge mit gleitenden Durchschnittswerten
 */
export function calculateMovingAverage(
  values: (number | null)[],
  windowSize: number
): (number | null)[] {
  if (values.length === 0 || windowSize <= 0) return []

  const half = Math.floor(windowSize / 2)
  // Mindestanzahl valider Werte im Fenster — verhindert Durchschnitte aus 1-2 Ausreissern
  const minRequired = Math.ceil(windowSize / 2)

  return values.map((_, i) => {
    const start = Math.max(0, i - half)
    const end = Math.min(values.length - 1, i + half)

    const windowValues = values.slice(start, end + 1).filter((v): v is number => v !== null)

    if (windowValues.length < minRequired) return null

    const sum = windowValues.reduce((acc, v) => acc + v, 0)
    // Auf eine Dezimalstelle runden — ausreichend für Ringwertungen
    return Math.round((sum / windowValues.length) * 10) / 10
  })
}
