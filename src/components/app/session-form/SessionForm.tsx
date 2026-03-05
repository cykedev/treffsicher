"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createSession, updateSession } from "@/lib/sessions/actions"
import type { SessionDetail } from "@/lib/sessions/actions"
import { needsDisciplineForSessionType, SESSION_TYPE_LABELS } from "@/lib/sessions/presentation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { SelectableRow } from "@/components/ui/selectable-row"
import type { Discipline } from "@/generated/prisma/client"
import type { GoalForSelection } from "@/lib/goals/actions"
import { HitLocationSection } from "@/components/app/session-form/HitLocationSection"
import { MeytonImportDialog } from "@/components/app/session-form/MeytonImportDialog"
import { SessionSeriesSection } from "@/components/app/session-form/SessionSeriesSection"
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
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>(() =>
    initialData ? initialData.goals.map((entry) => entry.goalId) : []
  )
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

  function toggleGoal(goalId: string) {
    setSelectedGoalIds((prev) => {
      if (prev.includes(goalId)) {
        return prev.filter((id) => id !== goalId)
      }
      return [...prev, goalId]
    })
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
          <div className="grid gap-4 sm:grid-cols-2 [&>*]:min-w-0">
            {/* Einheitentyp */}
            <div className="space-y-2">
              <Label htmlFor="type">Art der Einheit</Label>
              <Select
                name="type"
                required
                value={type}
                onValueChange={(v) => {
                  setType(v)
                  // Disziplin zurücksetzen wenn kein Schiessen
                  if (!needsDisciplineForSessionType(v)) {
                    clearForTypeWithoutDiscipline()
                    handleClearHitLocation()
                    return
                  }

                  // Bei neuer Einheit automatisch Favorit setzen, falls noch keine Disziplin gewählt ist.
                  if (!initialData && !disciplineId && defaultDisciplineId) {
                    handleDisciplineChange(defaultDisciplineId)
                  }
                }}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Typ wählen" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SESSION_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Datum */}
            <div className="space-y-2">
              <Label htmlFor="date">Datum & Uhrzeit</Label>
              <Input
                id="date"
                name="date"
                type="datetime-local"
                required
                value={dateValue}
                onChange={(event) => setDateValue(event.target.value)}
                disabled={pending}
              />
            </div>
          </div>

          {/* Disziplin — nur bei TRAINING und WETTKAMPF */}
          {needsDiscipline && (
            <div className="space-y-2">
              <Label htmlFor="disciplineId">Disziplin</Label>
              <Select
                name="disciplineId"
                required={needsDiscipline}
                value={disciplineId}
                onValueChange={handleDisciplineChange}
              >
                <SelectTrigger id="disciplineId">
                  <SelectValue placeholder="Disziplin wählen" />
                </SelectTrigger>
                <SelectContent>
                  {disciplines.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                      {d.isSystem && " (Standard)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {needsDiscipline && (
            <HitLocationSection
              model={{
                pending,
                hitLocation,
                hasValidationError: hasHitLocationValidationError,
              }}
              actions={{
                enable: handleEnableHitLocation,
                clear: handleClearHitLocation,
                change: handleHitLocationChange,
              }}
            />
          )}

          <input
            type="hidden"
            name="hitLocationHorizontalMm"
            value={hitLocation?.horizontalMm ?? ""}
          />
          <input
            type="hidden"
            name="hitLocationHorizontalDirection"
            value={hitLocation?.horizontalDirection ?? ""}
          />
          <input type="hidden" name="hitLocationVerticalMm" value={hitLocation?.verticalMm ?? ""} />
          <input
            type="hidden"
            name="hitLocationVerticalDirection"
            value={hitLocation?.verticalDirection ?? ""}
          />

          {/* Ort (optional) */}
          <div className="space-y-2">
            <Label htmlFor="location">Ort (optional)</Label>
            <Input
              id="location"
              name="location"
              placeholder="z.B. Schützenhaus Muster"
              defaultValue={initialData?.location ?? ""}
              disabled={pending}
            />
          </div>

          {/* Trainingsziel — bei WETTKAMPF wird stattdessen das Leistungsziel in der Prognose erfasst */}
          {type && type !== "WETTKAMPF" && (
            <div className="space-y-2">
              <Label htmlFor="trainingGoal">Trainingsziel (optional)</Label>
              <Textarea
                id="trainingGoal"
                name="trainingGoal"
                placeholder="Was soll heute gelingen?"
                defaultValue={initialData?.trainingGoal ?? ""}
                disabled={pending}
                rows={2}
              />
            </div>
          )}

          {/* Saisonziele (optional): Markierung, auf welche Ziele die Einheit einzahlt */}
          {goals.length > 0 && (
            <div className="space-y-3">
              <Label>Saisonziele (optional)</Label>
              <p className="text-xs text-muted-foreground">
                Markiere, auf welche Saisonziele diese Einheit einzahlt.
              </p>
              <div className="overflow-hidden rounded-lg border border-border/60 bg-muted/10">
                {goals.map((goal, index) => {
                  const selected = selectedGoalIds.includes(goal.id)
                  return (
                    <SelectableRow
                      key={goal.id}
                      selected={selected}
                      onToggle={() => toggleGoal(goal.id)}
                      disabled={pending}
                      className={
                        index > 0
                          ? "w-full rounded-none border-t border-border/40"
                          : "w-full rounded-none"
                      }
                    >
                      <span className="font-medium">{goal.title}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        · {goal.type === "RESULT" ? "Ergebnisziel" : "Prozessziel"}
                      </span>
                    </SelectableRow>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedGoalIds.length === 0
                  ? "Kein Ziel ausgewählt"
                  : `${selectedGoalIds.length} Ziel${
                      selectedGoalIds.length === 1 ? "" : "e"
                    } ausgewählt`}
              </p>
              {selectedGoalIds.map((goalId) => (
                <input key={goalId} type="hidden" name="goalIds" value={goalId} />
              ))}
            </div>
          )}
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
