import { useMemo, useState } from "react"
import type { Discipline } from "@/generated/prisma/client"
import type { SessionDetail, SerializedSeries } from "@/lib/sessions/actions"
import {
  buildInitialSeriesSnapshot,
  type InitialSeriesSnapshot,
} from "@/components/app/session-form/sessionSeriesStateInitializers"
import { useSessionSeriesHandlers } from "@/components/app/session-form/useSessionSeriesHandlers"
import { useSessionSeriesValidation } from "@/components/app/session-form/useSessionSeriesValidation"

interface Params {
  initialData?: SessionDetail
  disciplines: Discipline[]
  initialDisciplineId: string
}

export function useSessionSeriesState({ initialData, disciplines, initialDisciplineId }: Params) {
  // Snapshot nur einmal erzeugen, damit initiale Serien bei Re-Renders nicht neu "einschnappen".
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

  // Mutationslogik in Handler-Hooks kapseln, damit diese State-Hook nur Datenfluss orchestriert.
  const {
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
  } = useSessionSeriesHandlers({
    disciplines,
    selectedDiscipline,
    totalSeries,
    showShots,
    shots,
    shotCounts,
    seriesTotals,
    seriesIsPractice,
    seriesKeys,
    setDisciplineId,
    setTotalSeries,
    setShowShots,
    setShots,
    setShotCounts,
    setSeriesTotals,
    setSeriesIsPractice,
    setSeriesKeys,
  })

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
