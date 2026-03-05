import { useCallback, type Dispatch, type SetStateAction } from "react"
import type { Discipline } from "@/generated/prisma/client"
import {
  createPracticeSeriesCollections,
  createRegularSeriesCollections,
  removeSeriesCollections,
  togglePracticeCollections,
} from "@/components/app/session-form/sessionSeriesStateTransforms"
import {
  applyCollectionsState,
  type SeriesCollectionsSetters,
  type SeriesCollectionsSnapshot,
} from "@/components/app/session-form/sessionSeriesStateSetters"

interface Params {
  selectedDiscipline: Discipline | undefined
  totalSeries: number
  showShots: boolean
  collections: SeriesCollectionsSnapshot
  setters: SeriesCollectionsSetters
  setTotalSeries: Dispatch<SetStateAction<number>>
}

interface ReturnValue {
  handleTogglePractice: (index: number) => void
  handleAddSeries: () => void
  handleAddPracticeSeries: () => void
  handleRemoveSeries: (index: number) => void
}

export function useSessionSeriesStructureHandlers({
  selectedDiscipline,
  totalSeries,
  showShots,
  collections,
  setters,
  setTotalSeries,
}: Params): ReturnValue {
  const handleTogglePractice = useCallback(
    (index: number) => {
      // Probe-Serien stehen im UI immer vor Wertungsserien.
      // Der Transform sortiert deshalb nach jedem Toggle neu.
      const nextCollections = togglePracticeCollections(collections, index)
      applyCollectionsState(nextCollections, showShots, setters)
    },
    [collections, setters, showShots]
  )

  const handleAddSeries = useCallback(() => {
    const defaultCount = selectedDiscipline?.shotsPerSeries ?? 10
    const nextCollections = createRegularSeriesCollections(collections, defaultCount, Date.now())

    setTotalSeries((value) => value + 1)
    applyCollectionsState(nextCollections, showShots, setters)
  }, [collections, selectedDiscipline, setters, setTotalSeries, showShots])

  const handleAddPracticeSeries = useCallback(() => {
    const defaultCount = selectedDiscipline?.shotsPerSeries ?? 10
    // Neue Probe-Serie wird vor der ersten Wertungsserie eingefuegt,
    // damit die fachliche Reihenfolge (Probe -> Wertung) erhalten bleibt.
    const nextCollections = createPracticeSeriesCollections(collections, defaultCount, Date.now())

    setTotalSeries((value) => value + 1)
    applyCollectionsState(nextCollections, showShots, setters)
  }, [collections, selectedDiscipline, setters, setTotalSeries, showShots])

  const handleRemoveSeries = useCallback(
    (index: number) => {
      if (totalSeries <= 1) return

      const nextCollections = removeSeriesCollections(collections, index)
      setTotalSeries((value) => value - 1)
      applyCollectionsState(nextCollections, showShots, setters)
    },
    [collections, setters, setTotalSeries, showShots, totalSeries]
  )

  return {
    handleTogglePractice,
    handleAddSeries,
    handleAddPracticeSeries,
    handleRemoveSeries,
  }
}
