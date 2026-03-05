import { useMemo } from "react"
import { needsDisciplineForSessionType } from "@/lib/sessions/presentation"
import type { Discipline } from "@/generated/prisma/client"
import type {
  MeytonImportPreviewHitLocation,
  MeytonImportPreviewSeries,
  SessionDetail,
} from "@/lib/sessions/actions"
import { useMeytonImportState } from "@/components/app/session-form/useMeytonImportState"
import { toDateTimeLocalValue } from "@/components/app/session-form/utils"

interface Params {
  sessionId?: string
  initialData?: SessionDetail
  type: string
  setType: (value: string) => void
  disciplineId: string
  defaultDisciplineId?: string
  disciplines: Discipline[]
  selectedDiscipline: Discipline | undefined
  totalSeries: number
  pending: boolean
  handleDisciplineChange: (id: string) => void
  clearForTypeWithoutDiscipline: () => void
  handleClearHitLocation: () => void
  applyImportedSeries: (importedSeries: MeytonImportPreviewSeries[]) => void
  applyImportedHitLocation: (hitLocation: MeytonImportPreviewHitLocation | null) => void
  setDateValue: (value: string) => void
}

export function useSessionFormImportController({
  sessionId,
  initialData,
  type,
  setType,
  disciplineId,
  defaultDisciplineId,
  disciplines,
  selectedDiscipline,
  totalSeries,
  pending,
  handleDisciplineChange,
  clearForTypeWithoutDiscipline,
  handleClearHitLocation,
  applyImportedSeries,
  applyImportedHitLocation,
  setDateValue,
}: Params): {
  isMeytonButtonVisible: boolean
  canRenderImportDialog: boolean
  isImportPending: boolean
  handleTypeChange: (value: string) => void
  openImportDialog: () => void
  dialogModel: ReturnType<typeof useMeytonImportState>["dialogModel"]
  dialogActions: ReturnType<typeof useMeytonImportState>["dialogActions"]
} {
  const needsDiscipline = needsDisciplineForSessionType(type)
  const isMeytonButtonVisible = needsDiscipline && Boolean(selectedDiscipline) && totalSeries > 0

  const canAutoSelectDropDefaults = !sessionId && type === ""
  const defaultDropDisciplineId = useMemo(() => {
    if (
      defaultDisciplineId &&
      disciplines.some((discipline) => discipline.id === defaultDisciplineId)
    ) {
      return defaultDisciplineId
    }
    return disciplines[0]?.id ?? null
  }, [defaultDisciplineId, disciplines])
  const hasDropDisciplineCandidate = disciplineId !== "" || defaultDropDisciplineId !== null
  const hasSelectedDiscipline = disciplineId !== ""
  const canAcceptDroppedMeytonPdf =
    (Boolean(selectedDiscipline) && (sessionId ? needsDiscipline : isMeytonButtonVisible)) ||
    (canAutoSelectDropDefaults && hasDropDisciplineCandidate)

  const { isImportPending, openImportDialog, dialogModel, dialogActions } = useMeytonImportState({
    disciplineId,
    pending,
    canAcceptDroppedMeytonPdf,
    canAutoSelectDropDefaults,
    defaultDropDisciplineId,
    hasSelectedDiscipline,
    onEnsureDropType: () => {
      // Drag&Drop ohne Typ startet bewusst im Training-Modus, damit der Importpfad sofort gültig ist.
      setType("TRAINING")
    },
    onPrepareDropDefaults: (disciplineIdForDrop) => {
      handleDisciplineChange(disciplineIdForDrop)
    },
    onImportApplied: (preview) => {
      applyImportedSeries(preview.series)
      applyImportedHitLocation(preview.hitLocation)
      if (preview.date) {
        setDateValue(toDateTimeLocalValue(preview.date))
      }
    },
  })

  function handleTypeChange(value: string): void {
    setType(value)

    if (!needsDisciplineForSessionType(value)) {
      // Beim Wegfall der Disziplinpflicht abhängige Felder aktiv leeren, sonst bleiben versteckte Altwerte erhalten.
      clearForTypeWithoutDiscipline()
      handleClearHitLocation()
      return
    }

    if (!initialData && !disciplineId && defaultDisciplineId) {
      handleDisciplineChange(defaultDisciplineId)
    }
  }

  return {
    isMeytonButtonVisible,
    canRenderImportDialog: Boolean(selectedDiscipline),
    isImportPending,
    handleTypeChange,
    openImportDialog,
    dialogModel,
    dialogActions,
  }
}
