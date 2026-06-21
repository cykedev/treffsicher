"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { SessionDetail } from "@/lib/sessions/actions"
import type { Discipline } from "@/generated/prisma/client"
import type { GoalForSelection } from "@/lib/goals/actions"
import { SessionFormBody } from "@/components/app/session-form/SessionFormBody"
import { useSessionFormDirtyGuard } from "@/components/app/session-form/useSessionFormDirtyGuard"
import { useSessionFormImportController } from "@/components/app/session-form/useSessionFormImportController"
import { useSessionFormSubmit } from "@/components/app/session-form/useSessionFormSubmit"
import { useSessionGoalSelectionState } from "@/components/app/session-form/useSessionGoalSelectionState"
import { useSessionHitLocationState } from "@/components/app/session-form/useSessionHitLocationState"
import { useSessionSeriesState } from "@/components/app/session-form/useSessionSeriesState"
import { toDateTimeLocalValue } from "@/components/app/session-form/utils"

interface Props {
  disciplines: Discipline[]
  goals: GoalForSelection[]
  // Wenn gesetzt: Bearbeiten-Modus — Formular wird mit bestehender Einheit vorbelegt
  initialData?: SessionDetail
  sessionId?: string
  defaultDisciplineId?: string
}

// Formular für neue oder bestehende Einheit.
// Im Bearbeiten-Modus (sessionId gesetzt) wird initialData zur Vorbelegen verwendet.
// Bei Auswahl von Typ und Disziplin werden die Serienfelder dynamisch generiert.
// Die Serienanzahl und Schussanzahl pro Serie kann vom Disziplin-Standard abweichen.
// Optional: Einzelschüsse erfassen (Toggle) und Ausführungsqualität pro Serie.
export function SessionForm({
  disciplines,
  goals,
  initialData,
  sessionId,
  defaultDisciplineId,
}: Props) {
  const router = useRouter()
  const initialDisciplineId = initialData?.disciplineId ?? defaultDisciplineId ?? ""
  const [type, setType] = useState<string>(() => initialData?.type ?? "")
  const [dateValue, setDateValue] = useState<string>(() =>
    toDateTimeLocalValue(initialData?.date ?? new Date())
  )
  const { selectedGoalIds, toggleGoal } = useSessionGoalSelectionState({ initialData })
  const {
    disciplineId,
    selectedDiscipline,
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
  } = useSessionSeriesState({
    initialData,
    disciplines,
    initialDisciplineId,
  })
  const {
    hitLocation,
    isHitLocationComplete,
    hasHitLocationValidationError,
    handleEnableHitLocation,
    handleClearHitLocation,
    handleHitLocationChange,
    applyImportedHitLocation,
  } = useSessionHitLocationState({ initialData })

  const { pending, submitted, formError, showValidationHint, handleSubmit } = useSessionFormSubmit({
    sessionId,
    dateValue,
    showShots,
    shots,
    hasValidationErrors,
    hasHitLocationValidationError,
  })

  const { markDirty, nav } = useSessionFormDirtyGuard({ pending, submitted })
  const cancelHref = sessionId ? `/sessions/${sessionId}` : "/sessions"

  // Wickelt einen String-Handler so, dass jede Auswahl zusätzlich als ungespeichert gilt.
  // Nötig für Radix-Selects/Toggles, die kein natives change-Event auf das <form> feuern.
  function withDirty(fn: (value: string) => void): (value: string) => void {
    return (value) => {
      markDirty()
      fn(value)
    }
  }

  // Import-Controller kapselt den Querbezug zwischen Typ/Disziplin/Serien/Datum,
  // damit SessionForm ein reiner Kompositions-Container bleibt.
  const {
    isMeytonButtonVisible,
    canRenderImportDialog,
    isImportPending,
    handleTypeChange,
    openImportDialog,
    dialogModel,
    dialogActions,
  } = useSessionFormImportController({
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
  })

  const showSeries = Boolean(isMeytonButtonVisible && selectedDiscipline)

  return (
    <SessionFormBody
      form={{ onSubmit: handleSubmit, markDirty }}
      main={{
        model: {
          type,
          dateValue,
          disciplineId,
          disciplines,
          pending,
          hitLocation,
          hasHitLocationValidationError,
          initialLocation: initialData?.location ?? "",
          initialTrainingGoal: initialData?.trainingGoal ?? "",
        },
        actions: {
          typeChange: withDirty(handleTypeChange),
          dateChange: setDateValue,
          disciplineChange: withDirty(handleDisciplineChange),
          hitLocation: {
            enable: handleEnableHitLocation,
            clear: handleClearHitLocation,
            change: handleHitLocationChange,
          },
        },
      }}
      goals={{
        model: { goals, selectedGoalIds, pending },
        actions: { toggleGoal: withDirty(toggleGoal) },
      }}
      series={
        showSeries && selectedDiscipline
          ? {
              model: {
                selectedDiscipline,
                sortedInitialSeries,
                totalSeries,
                showShots,
                pending,
                isImportPending,
                hitLocation,
                isHitLocationComplete,
                seriesIsPractice,
                seriesKeys,
                shotCounts,
                shots,
                invalidShots,
                invalidTotals,
                seriesTotals,
              },
              actions: {
                openImportDialog,
                toggleShowShots: handleShotToggle,
                togglePractice: handleTogglePractice,
                removeSeries: handleRemoveSeries,
                shotCountChange: handleShotCountChange,
                shotChange: handleShotChange,
                totalChange: handleTotalChange,
                addSeries: handleAddSeries,
                addPracticeSeries: handleAddPracticeSeries,
              },
            }
          : null
      }
      importDialog={canRenderImportDialog ? { model: dialogModel, actions: dialogActions } : null}
      footer={{
        sessionId,
        pending,
        formError,
        showValidationHint,
        submitDisabled: pending || !type || showValidationHint || hasHitLocationValidationError,
        onCancel: () => nav.requestNavigation(() => router.push(cancelHref)),
      }}
      discard={{ open: nav.isConfirmOpen, onCancel: nav.cancel, onConfirm: nav.confirm }}
    />
  )
}
