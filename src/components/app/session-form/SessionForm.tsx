"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createSession, updateSession } from "@/lib/sessions/actions"
import type { SessionDetail } from "@/lib/sessions/actions"
import { needsDisciplineForSessionType } from "@/lib/sessions/presentation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { Discipline } from "@/generated/prisma/client"
import type { GoalForSelection } from "@/lib/goals/actions"
import { MeytonImportDialog } from "@/components/app/session-form/MeytonImportDialog"
import { SessionGoalsSection } from "@/components/app/session-form/SessionGoalsSection"
import { SessionMainFields } from "@/components/app/session-form/SessionMainFields"
import { SessionSeriesSection } from "@/components/app/session-form/SessionSeriesSection"
import { useSessionGoalSelectionState } from "@/components/app/session-form/useSessionGoalSelectionState"
import { useMeytonImportState } from "@/components/app/session-form/useMeytonImportState"
import { useSessionHitLocationState } from "@/components/app/session-form/useSessionHitLocationState"
import { useSessionSeriesState } from "@/components/app/session-form/useSessionSeriesState"
import {
  toDateTimeLocalValue,
  toIsoFromDateTimeLocalValue,
} from "@/components/app/session-form/utils"

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
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

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

  const needsDiscipline = needsDisciplineForSessionType(type)
  const isMeytonButtonVisible = needsDiscipline && Boolean(selectedDiscipline) && totalSeries > 0
  const canAutoSelectDropDefaults = !sessionId && type === ""
  const defaultDropDisciplineId =
    (defaultDisciplineId && disciplines.some((discipline) => discipline.id === defaultDisciplineId)
      ? defaultDisciplineId
      : disciplines[0]?.id) ?? null
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

  function handleTypeChange(value: string) {
    setType(value)

    if (!needsDisciplineForSessionType(value)) {
      clearForTypeWithoutDiscipline()
      handleClearHitLocation()
      return
    }

    if (!initialData && !disciplineId && defaultDisciplineId) {
      handleDisciplineChange(defaultDisciplineId)
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setFormError(null)

    // Validierung vor dem Absenden: ungültige Felder verhindern Speichern
    if (hasValidationErrors) {
      setFormError("Bitte ungültige Werte korrigieren.")
      return
    }
    if (hasHitLocationValidationError) {
      setFormError("Bitte Trefferlage vollständig und korrekt erfassen oder löschen.")
      return
    }

    const normalizedDateIso = toIsoFromDateTimeLocalValue(dateValue)
    if (!normalizedDateIso) {
      setFormError("Datum/Uhrzeit ist ungültig.")
      return
    }

    setPending(true)

    const formData = new FormData(e.currentTarget)
    formData.set("date", normalizedDateIso)

    // Shots als JSON-String in die FormData schreiben — FormData unterstützt keine verschachtelten
    // Arrays nativ, daher serialisieren wir die Werte explizit bevor sie zum Server geschickt werden
    if (showShots && shots.length > 0) {
      shots.forEach((seriesShots, i) => {
        formData.set(`series[${i}][shots]`, JSON.stringify(seriesShots))
      })
    }

    const result = sessionId
      ? await updateSession(sessionId, formData)
      : await createSession(formData)

    if (result.error) {
      setFormError(result.error)
      setPending(false)
      return
    }

    // Falls keine Navigation erfolgt, Formular wieder freigeben.
    setPending(false)
  }

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

      {selectedDiscipline && <MeytonImportDialog model={dialogModel} actions={dialogActions} />}

      <div className="space-y-2">
        {formError && <p className="text-sm text-destructive">{formError}</p>}
      </div>

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={pending || !type || hasValidationErrors || hasHitLocationValidationError}
        >
          {pending ? "Speichern..." : sessionId ? "Änderungen speichern" : "Einheit speichern"}
        </Button>
        {!formError && hasValidationErrors && (
          <p className="self-center text-sm text-destructive">Bitte ungültige Werte korrigieren.</p>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => router.push(sessionId ? `/sessions/${sessionId}` : "/sessions")}
        >
          Abbrechen
        </Button>
      </div>
    </form>
  )
}
