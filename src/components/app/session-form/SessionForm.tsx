"use client"

import { useState } from "react"
import type { SessionDetail } from "@/lib/sessions/actions"
import { Card, CardContent } from "@/components/ui/card"
import type { Discipline } from "@/generated/prisma/client"
import type { GoalForSelection } from "@/lib/goals/actions"
import { MeytonImportDialog } from "@/components/app/session-form/MeytonImportDialog"
import { SessionFormFooter } from "@/components/app/session-form/SessionFormFooter"
import { SessionGoalsSection } from "@/components/app/session-form/SessionGoalsSection"
import { SessionMainFields } from "@/components/app/session-form/SessionMainFields"
import { SessionSeriesSection } from "@/components/app/session-form/SessionSeriesSection"
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

  const { pending, formError, showValidationHint, handleSubmit } = useSessionFormSubmit({
    sessionId,
    dateValue,
    showShots,
    shots,
    hasValidationErrors,
    hasHitLocationValidationError,
  })

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

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <SessionMainFields
            model={{
              type,
              dateValue,
              disciplineId,
              disciplines,
              pending,
              hitLocation,
              hasHitLocationValidationError,
              initialLocation: initialData?.location ?? "",
              initialTrainingGoal: initialData?.trainingGoal ?? "",
            }}
            actions={{
              typeChange: handleTypeChange,
              dateChange: setDateValue,
              disciplineChange: handleDisciplineChange,
              hitLocation: {
                enable: handleEnableHitLocation,
                clear: handleClearHitLocation,
                change: handleHitLocationChange,
              },
            }}
          />

          <SessionGoalsSection
            model={{
              goals,
              selectedGoalIds,
              pending,
            }}
            actions={{
              toggleGoal,
            }}
          />
        </CardContent>
      </Card>

      {/* Serien — erscheinen erst wenn Disziplin gewählt */}
      {isMeytonButtonVisible && selectedDiscipline && (
        <SessionSeriesSection
          model={{
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
          }}
          actions={{
            openImportDialog,
            toggleShowShots: handleShotToggle,
            togglePractice: handleTogglePractice,
            removeSeries: handleRemoveSeries,
            shotCountChange: handleShotCountChange,
            shotChange: handleShotChange,
            totalChange: handleTotalChange,
            addSeries: handleAddSeries,
            addPracticeSeries: handleAddPracticeSeries,
          }}
        />
      )}

      {canRenderImportDialog && <MeytonImportDialog model={dialogModel} actions={dialogActions} />}

      <SessionFormFooter
        sessionId={sessionId}
        pending={pending}
        hasType={Boolean(type)}
        formError={formError}
        showValidationHint={showValidationHint}
        hasHitLocationValidationError={hasHitLocationValidationError}
      />
    </form>
  )
}
