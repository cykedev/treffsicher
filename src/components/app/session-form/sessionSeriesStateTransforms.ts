import { calculateSumFromShots } from "@/lib/sessions/calculateScore"
import type { MeytonImportPreviewSeries } from "@/lib/sessions/actions"

export interface SeriesCollections {
  seriesIsPractice: boolean[]
  seriesKeys: string[]
  shotCounts: number[]
  seriesTotals: string[]
  shots: string[][]
}

export function createBlankShots(shotCounts: number[]): string[][] {
  return shotCounts.map((count) => Array(count).fill(""))
}

export function createTotalsFromShots(shots: string[][]): string[] {
  return shots.map((seriesShots) => {
    const total = calculateSumFromShots(seriesShots)
    return total !== null ? String(total) : ""
  })
}

export function updateShotValue(
  shots: string[][],
  seriesIndex: number,
  shotIndex: number,
  value: string
): string[][] {
  const next = shots.map((seriesShots) => [...seriesShots])
  next[seriesIndex][shotIndex] = value
  return next
}

export function updateSeriesTotal(
  seriesTotals: string[],
  seriesIndex: number,
  value: string
): string[] {
  return seriesTotals.map((entry, index) => (index === seriesIndex ? value : entry))
}

export function togglePracticeCollections(
  collections: SeriesCollections,
  index: number
): SeriesCollections {
  const newIsPractice = collections.seriesIsPractice.map((value, seriesIndex) =>
    seriesIndex === index ? !value : value
  )

  const permutation = Array.from({ length: newIsPractice.length }, (_, i) => i)
  permutation.sort((a, b) => {
    if (newIsPractice[a] === newIsPractice[b]) return 0
    return newIsPractice[a] ? -1 : 1
  })

  // Eine gemeinsame Permutation für alle Arrays verhindert, dass Serien-Metadaten auseinanderlaufen.
  return {
    seriesIsPractice: permutation.map((seriesIndex) => newIsPractice[seriesIndex]),
    seriesKeys: permutation.map((seriesIndex) => collections.seriesKeys[seriesIndex]),
    shotCounts: permutation.map((seriesIndex) => collections.shotCounts[seriesIndex]),
    seriesTotals: permutation.map((seriesIndex) => collections.seriesTotals[seriesIndex] ?? ""),
    shots: permutation.map((seriesIndex) => collections.shots[seriesIndex] ?? []),
  }
}

export function createRegularSeriesCollections(
  collections: SeriesCollections,
  defaultCount: number,
  now: number
): SeriesCollections {
  return {
    seriesIsPractice: [...collections.seriesIsPractice, false],
    seriesKeys: [...collections.seriesKeys, `r-${now}`],
    shotCounts: [...collections.shotCounts, defaultCount],
    seriesTotals: [...collections.seriesTotals, ""],
    shots: [...collections.shots, Array(defaultCount).fill("")],
  }
}

export function createPracticeSeriesCollections(
  collections: SeriesCollections,
  defaultCount: number,
  now: number
): SeriesCollections {
  const firstRegular = collections.seriesIsPractice.findIndex((isPractice) => !isPractice)
  const insertIndex = firstRegular === -1 ? collections.seriesIsPractice.length : firstRegular

  return {
    seriesIsPractice: [
      ...collections.seriesIsPractice.slice(0, insertIndex),
      true,
      ...collections.seriesIsPractice.slice(insertIndex),
    ],
    seriesKeys: [
      ...collections.seriesKeys.slice(0, insertIndex),
      `p-${now}`,
      ...collections.seriesKeys.slice(insertIndex),
    ],
    shotCounts: [
      ...collections.shotCounts.slice(0, insertIndex),
      defaultCount,
      ...collections.shotCounts.slice(insertIndex),
    ],
    seriesTotals: [
      ...collections.seriesTotals.slice(0, insertIndex),
      "",
      ...collections.seriesTotals.slice(insertIndex),
    ],
    shots: [
      ...collections.shots.slice(0, insertIndex),
      Array(defaultCount).fill(""),
      ...collections.shots.slice(insertIndex),
    ],
  }
}

export function removeSeriesCollections(
  collections: SeriesCollections,
  index: number
): SeriesCollections {
  return {
    seriesIsPractice: collections.seriesIsPractice.filter(
      (_, seriesIndex) => seriesIndex !== index
    ),
    seriesKeys: collections.seriesKeys.filter((_, seriesIndex) => seriesIndex !== index),
    shotCounts: collections.shotCounts.filter((_, seriesIndex) => seriesIndex !== index),
    seriesTotals: collections.seriesTotals.filter((_, seriesIndex) => seriesIndex !== index),
    shots: collections.shots.filter((_, seriesIndex) => seriesIndex !== index),
  }
}

export function clampShotCount(value: number): number {
  return Math.max(1, Math.min(99, value))
}

export function resizeSeriesShots(
  shots: string[][],
  seriesIndex: number,
  targetCount: number
): string[][] {
  return shots.map((seriesShots, index) => {
    if (index !== seriesIndex) return seriesShots
    if (targetCount > seriesShots.length) {
      return [...seriesShots, ...Array(targetCount - seriesShots.length).fill("")]
    }
    return seriesShots.slice(0, targetCount)
  })
}

export function createImportedSeriesCollections(
  importedSeries: MeytonImportPreviewSeries[],
  now: number
): SeriesCollections {
  return {
    seriesIsPractice: Array(importedSeries.length).fill(false),
    seriesKeys: importedSeries.map((series, index) => `m-${now}-${index}-${series.nr}`),
    shotCounts: importedSeries.map((series) => Math.max(1, series.shots.length)),
    seriesTotals: importedSeries.map((series) => series.scoreTotal),
    shots: importedSeries.map((series) => [...series.shots]),
  }
}
