import type { Dispatch, SetStateAction } from "react"
import type { Discipline } from "@/generated/prisma/client"
import type { MeytonImportPreviewSeries } from "@/lib/sessions/actions"
import { useSessionSeriesBasicHandlers } from "@/components/app/session-form/useSessionSeriesBasicHandlers"
import { useSessionSeriesStructureHandlers } from "@/components/app/session-form/useSessionSeriesStructureHandlers"
import type {
  SeriesCollectionsSetters,
  SeriesCollectionsSnapshot,
} from "@/components/app/session-form/sessionSeriesStateSetters"

interface Params {
  disciplines: Discipline[]
  selectedDiscipline: Discipline | undefined
  totalSeries: number
  showShots: boolean
  shots: string[][]
  shotCounts: number[]
  seriesTotals: string[]
  seriesIsPractice: boolean[]
  seriesKeys: string[]
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
  handleTogglePractice: (index: number) => void
  handleAddSeries: () => void
  handleAddPracticeSeries: () => void
  handleRemoveSeries: (index: number) => void
  handleShotCountChange: (seriesIndex: number, newCount: number) => void
  applyImportedSeries: (importedSeries: MeytonImportPreviewSeries[]) => void
}

export function useSessionSeriesHandlers({
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
}: Params): ReturnValue {
  // Snapshot + setter-Bundle stabilisieren die Schnittstelle zwischen
  // State-Hook und Handler-Hooks. So bleiben beide Seiten austauschbar.
  const collections: SeriesCollectionsSnapshot = {
    seriesIsPractice,
    seriesKeys,
    shotCounts,
    seriesTotals,
    shots,
  }

  const setters: SeriesCollectionsSetters = {
    setSeriesIsPractice,
    setSeriesKeys,
    setShotCounts,
    setSeriesTotals,
    setShots,
  }

  const basicHandlers = useSessionSeriesBasicHandlers({
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
  })

  const structureHandlers = useSessionSeriesStructureHandlers({
    selectedDiscipline,
    totalSeries,
    showShots,
    collections,
    setters,
    setTotalSeries,
  })

  return {
    ...basicHandlers,
    ...structureHandlers,
  }
}
