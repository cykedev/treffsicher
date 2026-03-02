/**
 * Berechnet den gleitenden Durchschnitt einer Wertereihe.
 * Verwendet ein rückblickendes Fenster (inkl. aktuellem Wert).
 * Beispiel bei windowSize=5: [i-4, i-3, i-2, i-1, i]
 *
 * Am Anfang der Reihe wird mit einem kleineren Fenster gearbeitet, damit
 * früh bereits Trendwerte sichtbar sind.
 * Innerhalb des Fensters werden null-Werte ignoriert; nur wenn kein gültiger
 * Wert vorhanden ist, wird null zurückgegeben.
 *
 * @param values - Eingabewerte (null-Werte werden im Fenster übersprungen)
 * @param windowSize - Fenstergrösse
 * @returns Array gleicher Länge mit gleitenden Durchschnittswerten
 */
export function calculateMovingAverage(
  values: (number | null)[],
  windowSize: number
): (number | null)[] {
  if (values.length === 0 || windowSize <= 0) return []

  return values.map((_, i) => {
    const start = Math.max(0, i - windowSize + 1)
    const end = i

    const windowValues = values.slice(start, end + 1).filter((v): v is number => v !== null)

    if (windowValues.length === 0) return null

    const sum = windowValues.reduce((acc, v) => acc + v, 0)
    return sum / windowValues.length
  })
}
