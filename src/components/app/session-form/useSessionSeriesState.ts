import { useCallback, useMemo, useState } from "react"
import type { Discipline } from "@/generated/prisma/client"
import type {
  MeytonImportPreviewSeries,
  SessionDetail,
  SerializedSeries,
} from "@/lib/sessions/actions"
import { createSeriesDefaults } from "@/components/app/session-form/utils"
import {
  buildInitialSeriesSnapshot,
  type InitialSeriesSnapshot,
} from "@/components/app/session-form/sessionSeriesStateInitializers"
import {
  clampShotCount,
  createBlankShots,
  createImportedSeriesCollections,
  createPracticeSeriesCollections,
  createRegularSeriesCollections,
  createTotalsFromShots,
  removeSeriesCollections,
  resizeSeriesShots,
  togglePracticeCollections,
  updateSeriesTotal,
  updateShotValue,
} from "@/components/app/session-form/sessionSeriesStateTransforms"
import { useSessionSeriesValidation } from "@/components/app/session-form/useSessionSeriesValidation"

interface Params {
  initialData?: SessionDetail
  disciplines: Discipline[]
  initialDisciplineId: string
}

function applyCollectionsState(
  snapshot: {
    seriesIsPractice: boolean[]
    seriesKeys: string[]
    shotCounts: number[]
    seriesTotals: string[]
    shots: string[][]
  },
  showShots: boolean,
  setSeriesIsPractice: (value: boolean[]) => void,
  setSeriesKeys: (value: string[]) => void,
  setShotCounts: (value: number[]) => void,
  setSeriesTotals: (value: string[]) => void,
  setShots: (value: string[][]) => void
): void {
  setSeriesIsPractice(snapshot.seriesIsPractice)
  setSeriesKeys(snapshot.seriesKeys)
  setShotCounts(snapshot.shotCounts)
  setSeriesTotals(snapshot.seriesTotals)

  if (showShots) {
    setShots(snapshot.shots)
  }
}

export function useSessionSeriesState({ initialData, disciplines, initialDisciplineId }: Params) {
  const initialSnapshot: InitialSeriesSnapshot = buildInitialSeriesSnapshot({
    initialData,
    disciplines,
    initialDisciplineId,
  })

  const [disciplineId, setDisciplineId] = useState<string>(() => initialSnapshot.disciplineId)
  const [sortedInitialSeries] = useState<SerializedSeries[]>(
    () => initialSnapshot.sortedInitialSeries
  )
  const [showShots, setShowShots] = useState<boolean>(() => initialSnapshot.showShots)
  const [shots, setShots] = useState<string[][]>(() => initialSnapshot.shots)
  const [totalSeries, setTotalSeries] = useState<number>(() => initialSnapshot.totalSeries)
  const [shotCounts, setShotCounts] = useState<number[]>(() => initialSnapshot.shotCounts)
  const [seriesTotals, setSeriesTotals] = useState<string[]>(() => initialSnapshot.seriesTotals)
  const [seriesIsPractice, setSeriesIsPractice] = useState<boolean[]>(
    () => initialSnapshot.seriesIsPractice
  )
  const [seriesKeys, setSeriesKeys] = useState<string[]>(() => initialSnapshot.seriesKeys)

  const selectedDiscipline = useMemo(
    () => disciplines.find((discipline) => discipline.id === disciplineId),
    [disciplines, disciplineId]
  )

  const scoringType = selectedDiscipline?.scoringType

  const { invalidShots, invalidTotals, hasValidationErrors } = useSessionSeriesValidation({
    showShots,
    scoringType,
    shots,
    seriesTotals,
    shotCounts,
    defaultShotsPerSeries: selectedDiscipline?.shotsPerSeries ?? 10,
  })

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
    [disciplines]
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
  }, [])

  const handleShotToggle = useCallback(
    (enabled: boolean) => {
      setShowShots(enabled)

      if (enabled) {
        setShots(createBlankShots(shotCounts))
        return
      }

      setSeriesTotals(createTotalsFromShots(shots))
    },
    [shotCounts, shots]
  )

  const handleShotChange = useCallback((seriesIndex: number, shotIndex: number, value: string) => {
    setShots((prev) => updateShotValue(prev, seriesIndex, shotIndex, value))
  }, [])

  const handleTotalChange = useCallback((seriesIndex: number, value: string) => {
    setSeriesTotals((prev) => updateSeriesTotal(prev, seriesIndex, value))
  }, [])

  const handleTogglePractice = useCallback(
    (index: number) => {
      const nextCollections = togglePracticeCollections(
        {
          seriesIsPractice,
          seriesKeys,
          shotCounts,
          seriesTotals,
          shots,
        },
        index
      )

      applyCollectionsState(
        nextCollections,
        showShots,
        setSeriesIsPractice,
        setSeriesKeys,
        setShotCounts,
        setSeriesTotals,
        setShots
      )
    },
    [seriesIsPractice, seriesKeys, shotCounts, seriesTotals, shots, showShots]
  )

  const handleAddSeries = useCallback(() => {
    const defaultCount = selectedDiscipline?.shotsPerSeries ?? 10
    const nextCollections = createRegularSeriesCollections(
      {
        seriesIsPractice,
        seriesKeys,
        shotCounts,
        seriesTotals,
        shots,
      },
      defaultCount,
      Date.now()
    )

    setTotalSeries((value) => value + 1)
    applyCollectionsState(
      nextCollections,
      showShots,
      setSeriesIsPractice,
      setSeriesKeys,
      setShotCounts,
      setSeriesTotals,
      setShots
    )
  }, [selectedDiscipline, seriesIsPractice, seriesKeys, shotCounts, seriesTotals, shots, showShots])

  const handleAddPracticeSeries = useCallback(() => {
    const defaultCount = selectedDiscipline?.shotsPerSeries ?? 10
    const nextCollections = createPracticeSeriesCollections(
      {
        seriesIsPractice,
        seriesKeys,
        shotCounts,
        seriesTotals,
        shots,
      },
      defaultCount,
      Date.now()
    )

    setTotalSeries((value) => value + 1)
    applyCollectionsState(
      nextCollections,
      showShots,
      setSeriesIsPractice,
      setSeriesKeys,
      setShotCounts,
      setSeriesTotals,
      setShots
    )
  }, [selectedDiscipline, seriesIsPractice, seriesKeys, shotCounts, seriesTotals, shots, showShots])

  const handleRemoveSeries = useCallback(
    (index: number) => {
      if (totalSeries <= 1) return

      const nextCollections = removeSeriesCollections(
        {
          seriesIsPractice,
          seriesKeys,
          shotCounts,
          seriesTotals,
          shots,
        },
        index
      )

      setTotalSeries((value) => value - 1)
      applyCollectionsState(
        nextCollections,
        showShots,
        setSeriesIsPractice,
        setSeriesKeys,
        setShotCounts,
        setSeriesTotals,
        setShots
      )
    },
    [totalSeries, seriesIsPractice, seriesKeys, shotCounts, seriesTotals, shots, showShots]
  )

  const handleShotCountChange = useCallback(
    (seriesIndex: number, newCount: number) => {
      const count = clampShotCount(newCount)
      setShotCounts((prev) => prev.map((entry, index) => (index === seriesIndex ? count : entry)))

      if (showShots) {
        setShots((prev) => resizeSeriesShots(prev, seriesIndex, count))
      }
    },
    [showShots]
  )

  const applyImportedSeries = useCallback((importedSeries: MeytonImportPreviewSeries[]) => {
    const nextCollections = createImportedSeriesCollections(importedSeries, Date.now())

    setTotalSeries(importedSeries.length)
    setShowShots(true)
    setShots(nextCollections.shots)
    setShotCounts(nextCollections.shotCounts)
    setSeriesIsPractice(nextCollections.seriesIsPractice)
    setSeriesTotals(nextCollections.seriesTotals)
    setSeriesKeys(nextCollections.seriesKeys)
  }, [])

  return {
    disciplineId,
    selectedDiscipline,
    scoringType,
    sortedInitialSeries,
    showShots,
    shots,
    totalSeries,
    shotCounts,
    seriesTotals,
    seriesIsPractice,
    seriesKeys,
    invalidShots,
    invalidTotals,
    hasValidationErrors,
    handleDisciplineChange,
    clearForTypeWithoutDiscipline,
    handleShotToggle,
    handleShotChange,
    handleTotalChange,
    handleTogglePractice,
    handleAddSeries,
    handleAddPracticeSeries,
    handleRemoveSeries,
    handleShotCountChange,
    applyImportedSeries,
  }
}
