import type { Dispatch, SetStateAction } from "react"

export interface SeriesCollectionsSnapshot {
  seriesIsPractice: boolean[]
  seriesKeys: string[]
  shotCounts: number[]
  seriesTotals: string[]
  shots: string[][]
}

export interface SeriesCollectionsSetters {
  setSeriesIsPractice: Dispatch<SetStateAction<boolean[]>>
  setSeriesKeys: Dispatch<SetStateAction<string[]>>
  setShotCounts: Dispatch<SetStateAction<number[]>>
  setSeriesTotals: Dispatch<SetStateAction<string[]>>
  setShots: Dispatch<SetStateAction<string[][]>>
}

export function applyCollectionsState(
  snapshot: SeriesCollectionsSnapshot,
  showShots: boolean,
  setters: SeriesCollectionsSetters
): void {
  setters.setSeriesIsPractice(snapshot.seriesIsPractice)
  setters.setSeriesKeys(snapshot.seriesKeys)
  setters.setShotCounts(snapshot.shotCounts)
  setters.setSeriesTotals(snapshot.seriesTotals)

  if (showShots) {
    setters.setShots(snapshot.shots)
  }
}
