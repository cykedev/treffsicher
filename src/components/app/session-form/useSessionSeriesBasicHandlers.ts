import { useCallback, type Dispatch, type SetStateAction } from "react"
import type { Discipline } from "@/generated/prisma/client"
import type { MeytonImportPreviewSeries } from "@/lib/sessions/actions"
import { createSeriesDefaults } from "@/components/app/session-form/utils"
import {
  clampShotCount,
  createBlankShots,
  createImportedSeriesCollections,
  createTotalsFromShots,
  resizeSeriesShots,
  updateSeriesTotal,
  updateShotValue,
} from "@/components/app/session-form/sessionSeriesStateTransforms"

interface Params {
  disciplines: Discipline[]
  showShots: boolean
  shots: string[][]
  shotCounts: number[]
  setDisciplineId: Dispatch<SetStateAction<string>>
  setTotalSeries: Dispatch<SetStateAction<number>>
  setShowShots: Dispatch<SetStateAction<boolean>>
  setShots: Dispatch<SetStateAction<string[][]>>
  setShotCounts: Dispatch<SetStateAction<number[]>>
  setSeriesTotals: Dispatch<SetStateAction<string[]>>
  setSeriesIsPractice: Dispatch<SetStateAction<boolean[]>>
  setSeriesKeys: Dispatch<SetStateAction<string[]>>
}

interface ReturnValue {
  handleDisciplineChange: (id: string) => void
  clearForTypeWithoutDiscipline: () => void
  handleShotToggle: (enabled: boolean) => void
  handleShotChange: (seriesIndex: number, shotIndex: number, value: string) => void
  handleTotalChange: (seriesIndex: number, value: string) => void
  handleShotCountChange: (seriesIndex: number, newCount: number) => void
  applyImportedSeries: (importedSeries: MeytonImportPreviewSeries[]) => void
}

export function useSessionSeriesBasicHandlers({
  disciplines,
  showShots,
  shots,
  shotCounts,
  setDisciplineId,
  setTotalSeries,
  setShowShots,
  setShots,
  setShotCounts,
  setSeriesTotals,
  setSeriesIsPractice,
  setSeriesKeys,
}: Params): ReturnValue {
  const handleDisciplineChange = useCallback(
    (id: string) => {
      setDisciplineId(id)
      const discipline = disciplines.find((entry) => entry.id === id)
      const defaults = createSeriesDefaults(discipline)

      setTotalSeries(defaults.totalSeries)
      setShotCounts(defaults.shotCounts)
      setSeriesIsPractice(defaults.seriesIsPractice)
      setSeriesKeys(defaults.seriesKeys)
      setSeriesTotals(defaults.seriesTotals)
      setShowShots(false)
      setShots([])
    },
    [
      disciplines,
      setDisciplineId,
      setSeriesIsPractice,
      setSeriesKeys,
      setSeriesTotals,
      setShotCounts,
      setShots,
      setShowShots,
      setTotalSeries,
    ]
  )

  const clearForTypeWithoutDiscipline = useCallback(() => {
    setDisciplineId("")
    setTotalSeries(0)
    setShotCounts([])
    setSeriesIsPractice([])
    setSeriesKeys([])
    setSeriesTotals([])
    setShowShots(false)
    setShots([])
  }, [
    setDisciplineId,
    setSeriesIsPractice,
    setSeriesKeys,
    setSeriesTotals,
    setShotCounts,
    setShots,
    setShowShots,
    setTotalSeries,
  ])

  const handleShotToggle = useCallback(
    (enabled: boolean) => {
      setShowShots(enabled)
      if (enabled) {
        setShots(createBlankShots(shotCounts))
        return
      }
      setSeriesTotals(createTotalsFromShots(shots))
    },
    [setShots, setShowShots, setSeriesTotals, shotCounts, shots]
  )

  const handleShotChange = useCallback(
    (seriesIndex: number, shotIndex: number, value: string) => {
      setShots((prev) => updateShotValue(prev, seriesIndex, shotIndex, value))
    },
    [setShots]
  )

  const handleTotalChange = useCallback(
    (seriesIndex: number, value: string) => {
      setSeriesTotals((prev) => updateSeriesTotal(prev, seriesIndex, value))
    },
    [setSeriesTotals]
  )

  const handleShotCountChange = useCallback(
    (seriesIndex: number, newCount: number) => {
      const count = clampShotCount(newCount)
      setShotCounts((prev) => prev.map((entry, index) => (index === seriesIndex ? count : entry)))
      if (showShots) {
        setShots((prev) => resizeSeriesShots(prev, seriesIndex, count))
      }
    },
    [setShotCounts, setShots, showShots]
  )

  const applyImportedSeries = useCallback(
    (importedSeries: MeytonImportPreviewSeries[]) => {
      const nextCollections = createImportedSeriesCollections(importedSeries, Date.now())
      setTotalSeries(importedSeries.length)
      setShowShots(true)
      setShots(nextCollections.shots)
      setShotCounts(nextCollections.shotCounts)
      setSeriesIsPractice(nextCollections.seriesIsPractice)
      setSeriesTotals(nextCollections.seriesTotals)
      setSeriesKeys(nextCollections.seriesKeys)
    },
    [
      setSeriesIsPractice,
      setSeriesKeys,
      setSeriesTotals,
      setShotCounts,
      setShots,
      setShowShots,
      setTotalSeries,
    ]
  )

  return {
    handleDisciplineChange,
    clearForTypeWithoutDiscipline,
    handleShotToggle,
    handleShotChange,
    handleTotalChange,
    handleShotCountChange,
    applyImportedSeries,
  }
}
