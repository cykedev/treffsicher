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

/**
 * Berechnet den gewichteten gleitenden Durchschnitt (WMA) einer Wertereihe.
 * Neuere Werte erhalten höheres Gewicht: linear ansteigend von 1 (ältester)
 * bis n (aktuellster Wert im Fenster).
 * Beispiel bei windowSize=3: Gewichte [1, 2, 3], Summe 6.
 *
 * Am Anfang der Reihe wird mit einem kleineren Fenster gearbeitet.
 * Null-Werte werden übersprungen; ihre Gewichte entfallen.
 *
 * @param values - Eingabewerte (null-Werte werden im Fenster übersprungen)
 * @param windowSize - Fenstergrösse
 * @returns Array gleicher Länge mit gewichteten Durchschnittswerten
 */
export function calculateWeightedMovingAverage(
  values: (number | null)[],
  windowSize: number
): (number | null)[] {
  if (values.length === 0 || windowSize <= 0) return []

  return values.map((_, i) => {
    const start = Math.max(0, i - windowSize + 1)
    const end = i
    const window = values.slice(start, end + 1)

    // Gewichte [1, 2, ..., n] — Index im Fenster bestimmt das Gewicht.
    // null-Werte entfallen mitsamt ihrem Gewicht.
    let weightedSum = 0
    let weightSum = 0
    window.forEach((v, j) => {
      if (v === null) return
      const weight = j + 1
      weightedSum += v * weight
      weightSum += weight
    })

    if (weightSum === 0) return null
    return weightedSum / weightSum
  })
}
