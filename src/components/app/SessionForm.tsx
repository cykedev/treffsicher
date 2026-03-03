"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { createSession, previewMeytonImport, updateSession } from "@/lib/sessions/actions"
import type { SessionDetail } from "@/lib/sessions/actions"
import { calculateSumFromShots } from "@/lib/sessions/calculateScore"
import { isValidShotValue, isValidSeriesTotal, formatSeriesMax } from "@/lib/sessions/validation"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { SelectableRow } from "@/components/ui/selectable-row"
import type {
  Discipline,
  HitLocationHorizontalDirection,
  HitLocationVerticalDirection,
} from "@/generated/prisma/client"
import type { GoalForSelection } from "@/lib/goals/actions"

interface Props {
  disciplines: Discipline[]
  goals: GoalForSelection[]
  // Wenn gesetzt: Bearbeiten-Modus — Formular wird mit bestehender Einheit vorbelegt
  initialData?: SessionDetail
  sessionId?: string
  defaultDisciplineId?: string
}

const sessionTypeLabels: Record<string, string> = {
  TRAINING: "Training",
  WETTKAMPF: "Wettkampf",
  TROCKENTRAINING: "Trockentraining",
  MENTAL: "Mentaltraining",
}

const executionQualityLabels: Record<number, string> = {
  1: "1 – Schlecht",
  2: "2 – Mässig",
  3: "3 – Mittel",
  4: "4 – Gut",
  5: "5 – Sehr gut",
}

// Einheitentypen die eine Disziplin erfordern
const typesWithDiscipline = ["TRAINING", "WETTKAMPF"]

type ImportSourceType = "URL" | "UPLOAD"

type SessionHitLocation = {
  horizontalMm: string
  horizontalDirection: HitLocationHorizontalDirection | ""
  verticalMm: string
  verticalDirection: HitLocationVerticalDirection | ""
}

function toDateTimeLocalValue(value: Date | string): string {
  const base = new Date(value)
  base.setMinutes(base.getMinutes() - base.getTimezoneOffset())
  return base.toISOString().slice(0, 16)
}

function formatMillimeters(value: number): string {
  return value.toFixed(2)
}

function isValidHitLocationMillimeter(value: string): boolean {
  const normalized = value.trim().replace(",", ".")
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return false

  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 9999.99
}

function createSeriesDefaults(discipline: Discipline | undefined) {
  if (!discipline) {
    return {
      totalSeries: 0,
      shotCounts: [] as number[],
      seriesIsPractice: [] as boolean[],
      seriesKeys: [] as string[],
      seriesTotals: [] as string[],
    }
  }

  const newTotal = discipline.practiceSeries + discipline.seriesCount
  const seed = Date.now()

  return {
    totalSeries: newTotal,
    shotCounts: Array(newTotal).fill(discipline.shotsPerSeries),
    seriesIsPractice: [
      ...Array(discipline.practiceSeries).fill(true),
      ...Array(discipline.seriesCount).fill(false),
    ] as boolean[],
    seriesKeys: [
      ...Array.from({ length: discipline.practiceSeries }, (_, i) => `d-p-${i}-${seed}`),
      ...Array.from({ length: discipline.seriesCount }, (_, i) => `d-r-${i}-${seed}`),
    ],
    seriesTotals: Array(newTotal).fill(""),
  }
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
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [isImportPending, setIsImportPending] = useState(false)
  const [importSource, setImportSource] = useState<ImportSourceType>("URL")
  const [importError, setImportError] = useState<string | null>(null)
  const [importUrl, setImportUrl] = useState("")
  const [importFile, setImportFile] = useState<File | null>(null)

  const initialDisciplineId = initialData?.disciplineId ?? defaultDisciplineId ?? ""
  const initialDiscipline = disciplines.find((d) => d.id === initialDisciplineId)
  const initialSeriesDefaults = createSeriesDefaults(initialDiscipline)

  // Lazy initializer: Werte aus initialData (Bearbeiten) oder Favorit/Leerwerte (Neu)
  const [type, setType] = useState<string>(() => initialData?.type ?? "")
  const [disciplineId, setDisciplineId] = useState<string>(() => initialDisciplineId)

  // Serien sortiert: Probeschüsse immer zuerst — wird einmalig beim Mount berechnet
  // und als Referenz für alle State-Initialisierungen verwendet
  const [sortedInitialSeries] = useState(() => {
    if (!initialData) return []
    return [...initialData.series].sort((a, b) => {
      if (a.isPractice === b.isPractice) return 0
      return a.isPractice ? -1 : 1
    })
  })

  // Einzelschuss-Modus: aktiv wenn mindestens eine Serie shots-Daten hat
  const [showShots, setShowShots] = useState<boolean>(() => {
    if (!initialData) return false
    return sortedInitialSeries.some(
      (s) => Array.isArray(s.shots) && (s.shots as string[]).length > 0
    )
  })

  // shots vorbelegen aus initialData (falls vorhanden)
  const [shots, setShots] = useState<string[][]>(() => {
    if (
      !initialData ||
      !sortedInitialSeries.some((s) => Array.isArray(s.shots) && (s.shots as string[]).length > 0)
    )
      return []
    return sortedInitialSeries.map((s) => (Array.isArray(s.shots) ? (s.shots as string[]) : []))
  })

  // Serienanzahl aus initialData oder Disziplin-Standard
  const [totalSeries, setTotalSeries] = useState<number>(() =>
    initialData ? sortedInitialSeries.length : initialSeriesDefaults.totalSeries
  )

  // Schussanzahl pro Serie: aus shots-Array-Länge ableiten (falls shots vorhanden),
  // sonst Disziplin-Standard (aus disciplines-Array nachschlagen) oder 10
  const [shotCounts, setShotCounts] = useState<number[]>(() => {
    if (!initialData) return initialSeriesDefaults.shotCounts
    const disc = disciplines.find((d) => d.id === initialData.disciplineId)
    return sortedInitialSeries.map((s) => {
      if (Array.isArray(s.shots) && (s.shots as string[]).length > 0) {
        return (s.shots as string[]).length
      }
      return disc?.shotsPerSeries ?? 10
    })
  })

  // Seriensummen im Summen-Modus: kontrolliertes State-Array (parallel zu shotCounts etc.)
  // Ermöglicht Echtzeit-Validierung ohne nativen Browser-Validation-Dialog
  const [seriesTotals, setSeriesTotals] = useState<string[]>(() => {
    if (!initialData) return initialSeriesDefaults.seriesTotals
    return sortedInitialSeries.map((s) => (s.scoreTotal != null ? String(s.scoreTotal) : ""))
  })

  // isPractice-Flag pro Serie — ermöglicht manuelles Hinzufügen von Probeschuss-Serien,
  // unabhängig von der Anzahl in der Disziplin-Konfiguration
  const [seriesIsPractice, setSeriesIsPractice] = useState<boolean[]>(() =>
    initialData
      ? sortedInitialSeries.map((s) => s.isPractice)
      : initialSeriesDefaults.seriesIsPractice
  )

  // Stabile Keys pro Serie: verhindert ungewollte Re-Renders (und Wertverlust in unkontrollierten
  // Inputs) wenn Serien eingefügt oder verschoben werden — neue Serien erhalten generierte IDs
  const [seriesKeys, setSeriesKeys] = useState<string[]>(() =>
    initialData ? sortedInitialSeries.map((s) => s.id) : initialSeriesDefaults.seriesKeys
  )

  // Datum vorbelegen: aus initialData oder aktuelle Zeit
  const [dateValue, setDateValue] = useState<string>(() =>
    toDateTimeLocalValue(initialData?.date ?? new Date())
  )
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>(() =>
    initialData ? initialData.goals.map((entry) => entry.goalId) : []
  )
  const [hitLocation, setHitLocation] = useState<SessionHitLocation | null>(() => {
    if (
      !initialData ||
      initialData.hitLocationHorizontalMm === null ||
      initialData.hitLocationHorizontalDirection === null ||
      initialData.hitLocationVerticalMm === null ||
      initialData.hitLocationVerticalDirection === null
    ) {
      return null
    }

    return {
      horizontalMm: formatMillimeters(initialData.hitLocationHorizontalMm),
      horizontalDirection: initialData.hitLocationHorizontalDirection,
      verticalMm: formatMillimeters(initialData.hitLocationVerticalMm),
      verticalDirection: initialData.hitLocationVerticalDirection,
    }
  })

  // Gewählte Disziplin aus der Liste suchen
  const selectedDiscipline = disciplines.find((d) => d.id === disciplineId)
  const scoringType = selectedDiscipline?.scoringType

  // ─── Validierung ─────────────────────────────────────────────────────────────
  // Wird inline ohne separaten Error-State berechnet — so immer synchron mit dem
  // aktuellen Eingabe-State. Leere Felder gelten nicht als Fehler.

  // Shot-Modus: Für jeden Schuss prüfen ob der Wert für die Wertungsart gültig ist
  const invalidShots: boolean[][] =
    showShots && scoringType
      ? shots.map((serieShots) =>
          serieShots.map((v) => v !== "" && !isValidShotValue(v, scoringType))
        )
      : shots.map((serieShots) => serieShots.map(() => false))

  // Summen-Modus: Seriensumme darf den Maximalwert nicht überschreiten
  const invalidTotals: boolean[] =
    !showShots && scoringType
      ? seriesTotals.map(
          (v, i) =>
            v !== "" &&
            !isValidSeriesTotal(
              v,
              scoringType,
              shotCounts[i] ?? selectedDiscipline?.shotsPerSeries ?? 10
            )
        )
      : seriesTotals.map(() => false)

  const hasValidationErrors =
    invalidShots.some((serie) => serie.some(Boolean)) || invalidTotals.some(Boolean)

  const isHitLocationComplete =
    hitLocation !== null &&
    isValidHitLocationMillimeter(hitLocation.horizontalMm) &&
    hitLocation.horizontalDirection !== "" &&
    isValidHitLocationMillimeter(hitLocation.verticalMm) &&
    hitLocation.verticalDirection !== ""

  const hasAnyHitLocationInput =
    hitLocation !== null &&
    (hitLocation.horizontalMm.trim() !== "" ||
      hitLocation.horizontalDirection !== "" ||
      hitLocation.verticalMm.trim() !== "" ||
      hitLocation.verticalDirection !== "")

  const hasHitLocationValidationError = hasAnyHitLocationInput && !isHitLocationComplete

  function toggleGoal(goalId: string) {
    setSelectedGoalIds((prev) => {
      if (prev.includes(goalId)) {
        return prev.filter((id) => id !== goalId)
      }
      return [...prev, goalId]
    })
  }

  // ─── Handler ─────────────────────────────────────────────────────────────────

  // Disziplinwechsel: alle Serien-States auf Disziplin-Standardwerte zurücksetzen
  function handleDisciplineChange(id: string) {
    setDisciplineId(id)
    const disc = disciplines.find((d) => d.id === id)
    const defaults = createSeriesDefaults(disc)
    setTotalSeries(defaults.totalSeries)
    setShotCounts(defaults.shotCounts)
    setSeriesIsPractice(defaults.seriesIsPractice)
    setSeriesKeys(defaults.seriesKeys)
    setSeriesTotals(defaults.seriesTotals)
    setShowShots(false)
    setShots([])
  }

  // Shots-Array initialisieren wenn Toggle aktiviert wird.
  // Beim Deaktivieren: berechnete Summen in seriesTotals übernehmen.
  function handleShotToggle(enabled: boolean) {
    setShowShots(enabled)
    if (enabled) {
      setShots(shotCounts.map((count) => Array(count).fill("")))
    } else {
      // Berechnete Summen in den Summen-Modus übernehmen (statt Felder leer zu lassen)
      setSeriesTotals(
        shots.map((serieShots) => {
          const total = calculateSumFromShots(serieShots)
          return total !== null ? String(total) : ""
        })
      )
    }
  }

  // Einzelnen Schuss-Wert aktualisieren
  function handleShotChange(seriesIndex: number, shotIndex: number, value: string) {
    setShots((prev) => {
      const next = prev.map((s) => [...s])
      next[seriesIndex][shotIndex] = value
      return next
    })
  }

  // Seriensumme im Summen-Modus aktualisieren
  function handleTotalChange(seriesIndex: number, value: string) {
    setSeriesTotals((prev) => prev.map((v, i) => (i === seriesIndex ? value : v)))
  }

  // Serientyp umschalten: Probe ↔ Wertung
  // Nach dem Umschalten werden alle parallelen Arrays stabil neu sortiert:
  // Probeschuss-Serien stehen immer vor Wertungsserien (relative Reihenfolge bleibt erhalten)
  function handleTogglePractice(index: number) {
    const newIsPractice = seriesIsPractice.map((v, i) => (i === index ? !v : v))
    const perm = Array.from({ length: newIsPractice.length }, (_, i) => i)
    perm.sort((a, b) => {
      if (newIsPractice[a] === newIsPractice[b]) return 0
      return newIsPractice[a] ? -1 : 1
    })
    setSeriesIsPractice(perm.map((i) => newIsPractice[i]))
    setSeriesKeys(perm.map((i) => seriesKeys[i]))
    setShotCounts(perm.map((i) => shotCounts[i]))
    setSeriesTotals(perm.map((i) => seriesTotals[i] ?? ""))
    if (showShots) {
      setShots(perm.map((i) => shots[i] ?? []))
    }
  }

  // Wertungsserie hinzufügen — immer am Ende
  function handleAddSeries() {
    const defaultCount = selectedDiscipline?.shotsPerSeries ?? 10
    setTotalSeries((n) => n + 1)
    setShotCounts((prev) => [...prev, defaultCount])
    setSeriesIsPractice((prev) => [...prev, false])
    setSeriesKeys((prev) => [...prev, `r-${Date.now()}`])
    setSeriesTotals((prev) => [...prev, ""])
    if (showShots) {
      setShots((prev) => [...prev, Array(defaultCount).fill("")])
    }
  }

  // Probeschuss-Serie hinzufügen — vor der ersten Wertungsserie einfügen
  function handleAddPracticeSeries() {
    const defaultCount = selectedDiscipline?.shotsPerSeries ?? 10
    const firstRegular = seriesIsPractice.findIndex((p) => !p)
    const idx = firstRegular === -1 ? seriesIsPractice.length : firstRegular
    setTotalSeries((n) => n + 1)
    setShotCounts((prev) => [...prev.slice(0, idx), defaultCount, ...prev.slice(idx)])
    setSeriesIsPractice((prev) => [...prev.slice(0, idx), true, ...prev.slice(idx)])
    setSeriesKeys((prev) => [...prev.slice(0, idx), `p-${Date.now()}`, ...prev.slice(idx)])
    setSeriesTotals((prev) => [...prev.slice(0, idx), "", ...prev.slice(idx)])
    if (showShots) {
      setShots((prev) => [...prev.slice(0, idx), Array(defaultCount).fill(""), ...prev.slice(idx)])
    }
  }

  // Serie entfernen — mindestens 1 Serie bleibt erhalten
  function handleRemoveSeries(index: number) {
    if (totalSeries <= 1) return
    setTotalSeries((n) => n - 1)
    setShotCounts((prev) => prev.filter((_, i) => i !== index))
    setSeriesIsPractice((prev) => prev.filter((_, i) => i !== index))
    setSeriesKeys((prev) => prev.filter((_, i) => i !== index))
    setSeriesTotals((prev) => prev.filter((_, i) => i !== index))
    if (showShots) {
      setShots((prev) => prev.filter((_, i) => i !== index))
    }
  }

  // Schussanzahl für eine Serie ändern und shots-Array entsprechend anpassen
  function handleShotCountChange(seriesIndex: number, newCount: number) {
    const count = Math.max(1, Math.min(99, newCount))
    setShotCounts((prev) => prev.map((c, i) => (i === seriesIndex ? count : c)))
    if (showShots) {
      setShots((prev) =>
        prev.map((serieShots, i) => {
          if (i !== seriesIndex) return serieShots
          if (count > serieShots.length) {
            return [...serieShots, ...Array(count - serieShots.length).fill("")]
          }
          return serieShots.slice(0, count)
        })
      )
    }
  }

  function handleEnableHitLocation() {
    setHitLocation({
      horizontalMm: "",
      horizontalDirection: "",
      verticalMm: "",
      verticalDirection: "",
    })
  }

  function handleClearHitLocation() {
    setHitLocation(null)
  }

  function handleHitLocationChange<K extends keyof SessionHitLocation>(
    key: K,
    value: SessionHitLocation[K]
  ) {
    setHitLocation((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        [key]: value,
      }
    })
  }

  async function handleMeytonImport() {
    if (!disciplineId) {
      setImportError("Bitte zuerst eine Disziplin wählen.")
      return
    }

    setImportError(null)
    setIsImportPending(true)

    const formData = new FormData()
    formData.set("disciplineId", disciplineId)
    formData.set("source", importSource)

    if (importSource === "URL") {
      const trimmedUrl = importUrl.trim()
      if (!trimmedUrl) {
        setImportError("Bitte eine PDF-URL angeben.")
        setIsImportPending(false)
        return
      }
      formData.set("pdfUrl", trimmedUrl)
    } else {
      if (!importFile) {
        setImportError("Bitte eine PDF-Datei hochladen.")
        setIsImportPending(false)
        return
      }
      formData.set("file", importFile)
    }

    const result = await previewMeytonImport(formData)
    if (result.error || !result.data) {
      setImportError(result.error ?? "Import fehlgeschlagen.")
      setIsImportPending(false)
      return
    }

    const imported = result.data.series
    const newTotal = imported.length

    setTotalSeries(newTotal)
    setShowShots(true)
    setShots(imported.map((serie) => [...serie.shots]))
    setShotCounts(imported.map((serie) => Math.max(1, serie.shots.length)))
    setSeriesIsPractice(Array(newTotal).fill(false))
    setSeriesTotals(imported.map((serie) => serie.scoreTotal))
    setSeriesKeys(imported.map((serie, index) => `m-${Date.now()}-${index}-${serie.nr}`))
    setHitLocation(
      result.data.hitLocation
        ? {
            horizontalMm: formatMillimeters(result.data.hitLocation.horizontalMm),
            horizontalDirection: result.data.hitLocation.horizontalDirection,
            verticalMm: formatMillimeters(result.data.hitLocation.verticalMm),
            verticalDirection: result.data.hitLocation.verticalDirection,
          }
        : null
    )

    // Nur bei neuen, noch nicht gespeicherten Einheiten wird Datum/Uhrzeit aus dem PDF übernommen.
    if (!sessionId && result.data.date) {
      setDateValue(toDateTimeLocalValue(result.data.date))
    }

    setImportUrl("")
    setImportFile(null)
    setIsImportPending(false)
    setIsImportDialogOpen(false)
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

    setPending(true)

    const formData = new FormData(e.currentTarget)

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

  const needsDiscipline = typesWithDiscipline.includes(type)

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
                  if (!typesWithDiscipline.includes(v)) {
                    setDisciplineId("")
                    setTotalSeries(0)
                    setShotCounts([])
                    setSeriesIsPractice([])
                    setSeriesKeys([])
                    setSeriesTotals([])
                    setShowShots(false)
                    setShots([])
                    setHitLocation(null)
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
                  {Object.entries(sessionTypeLabels).map(([value, label]) => (
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
            <div className="space-y-3 rounded-lg border border-border/60 bg-muted/10 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="text-sm">Trefferlage (optional)</Label>
                {hitLocation ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleClearHitLocation}
                    disabled={pending}
                  >
                    Trefferlage löschen
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleEnableHitLocation}
                    disabled={pending}
                  >
                    Trefferlage erfassen
                  </Button>
                )}
              </div>

              {hitLocation && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Horizontal</Label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="mm"
                        value={hitLocation.horizontalMm}
                        onChange={(event) =>
                          handleHitLocationChange("horizontalMm", event.target.value)
                        }
                        disabled={pending}
                        className={
                          hasHitLocationValidationError && !isValidHitLocationMillimeter(hitLocation.horizontalMm)
                            ? "border-destructive focus-visible:ring-destructive"
                            : ""
                        }
                        aria-label="Trefferlage horizontal in mm"
                      />
                      <Select
                        value={hitLocation.horizontalDirection || undefined}
                        disabled={pending}
                        onValueChange={(value) =>
                          handleHitLocationChange(
                            "horizontalDirection",
                            value as HitLocationHorizontalDirection
                          )
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Richtung" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="LEFT">links</SelectItem>
                          <SelectItem value="RIGHT">rechts</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Vertikal</Label>
                    <div className="flex gap-2">
                      <Input
                        type="text"
                        inputMode="decimal"
                        placeholder="mm"
                        value={hitLocation.verticalMm}
                        onChange={(event) =>
                          handleHitLocationChange("verticalMm", event.target.value)
                        }
                        disabled={pending}
                        className={
                          hasHitLocationValidationError && !isValidHitLocationMillimeter(hitLocation.verticalMm)
                            ? "border-destructive focus-visible:ring-destructive"
                            : ""
                        }
                        aria-label="Trefferlage vertikal in mm"
                      />
                      <Select
                        value={hitLocation.verticalDirection || undefined}
                        disabled={pending}
                        onValueChange={(value) =>
                          handleHitLocationChange(
                            "verticalDirection",
                            value as HitLocationVerticalDirection
                          )
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue placeholder="Richtung" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HIGH">hoch</SelectItem>
                          <SelectItem value="LOW">tief</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {hasHitLocationValidationError && (
                <p className="text-xs text-destructive">
                  Trefferlage unvollständig oder ungültig. Bitte beide mm-Werte und Richtungen
                  angeben oder die Trefferlage löschen.
                </p>
              )}
            </div>
          )}

          <input type="hidden" name="hitLocationHorizontalMm" value={hitLocation?.horizontalMm ?? ""} />
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
      {needsDiscipline && selectedDiscipline && totalSeries > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Serien</h2>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setImportError(null)
                  setImportUrl("")
                  setImportFile(null)
                  setIsImportDialogOpen(true)
                }}
                disabled={pending || isImportPending}
              >
                Meyton importieren
              </Button>
              {/* Einzelschuss-Toggle — erlaubt detailliertere Erfassung für Analyse */}
              <SelectableRow
                selected={showShots}
                onToggle={() => handleShotToggle(!showShots)}
                disabled={pending}
                className="w-auto rounded-md px-2 py-1.5 text-xs"
                indicatorClassName="h-4 w-4"
              >
                Einzelschüsse erfassen
              </SelectableRow>
            </div>
          </div>
          {hitLocation && isHitLocationComplete && (
            <p className="text-xs text-muted-foreground">
              Trefferlage: {hitLocation.horizontalMm} mm{" "}
              {hitLocation.horizontalDirection === "RIGHT" ? "rechts" : "links"},{" "}
              {hitLocation.verticalMm} mm{" "}
              {hitLocation.verticalDirection === "HIGH" ? "hoch" : "tief"}
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: totalSeries }, (_, i) => {
              const isPractice = seriesIsPractice[i] ?? false
              const practicesBefore = seriesIsPractice.slice(0, i).filter(Boolean).length
              const regularsBefore = i - practicesBefore
              const seriesLabel = isPractice
                ? `Probe-Serie ${practicesBefore + 1}`
                : `Serie ${regularsBefore + 1}`

              const currentShotCount = shotCounts[i] ?? selectedDiscipline.shotsPerSeries
              const shotsForSeries = shots[i] ?? []
              const computedTotal = showShots ? calculateSumFromShots(shotsForSeries) : null
              const maxLabel = formatSeriesMax(selectedDiscipline.scoringType, currentShotCount)

              // Anzahl ungültiger Schüsse dieser Serie für die Fehleranzeige
              const invalidShotCount = (invalidShots[i] ?? []).filter(Boolean).length
              // Seriensumme ungültig?
              const totalIsInvalid = invalidTotals[i] ?? false

              return (
                // Wrapper hat stabilen key und trägt das dunkle Dreieck als CSS-Gradient —
                // es scheint durch die abgeschnittene Ecke der Card hindurch
                <div
                  key={seriesKeys[i] ?? i}
                  className="relative"
                  style={
                    isPractice
                      ? {
                          backgroundImage: "linear-gradient(225deg, #374151 50%, transparent 50%)",
                          backgroundSize: "50px 50px",
                          backgroundPosition: "top right",
                          backgroundRepeat: "no-repeat",
                        }
                      : undefined
                  }
                >
                  <Card
                    className={isPractice ? "bg-muted/30" : ""}
                    style={
                      isPractice
                        ? {
                            clipPath:
                              "polygon(0 0, calc(100% - 50px) 0, 100% 50px, 100% 100%, 0 100%)",
                          }
                        : undefined
                    }
                  >
                    <CardContent className="space-y-3 pt-4">
                      {/* Verstecktes Feld für isPractice */}
                      <input
                        type="hidden"
                        name={`series[${i}][isPractice]`}
                        value={isPractice ? "true" : "false"}
                      />

                      {/* Serien-Header mit Label, Typ-Toggle und Entfernen-Button */}
                      <div className="flex items-center justify-between gap-2">
                        <Label htmlFor={`series-${i}`} className="leading-none">
                          {seriesLabel}
                          {isPractice && (
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              (zählt nicht)
                            </span>
                          )}
                        </Label>
                        <div className="flex items-center gap-1">
                          {/* Gleicher Auswahlstil wie bei Ziel-Markierungen:
                              reduziert visuelle Sonderfälle und ist auf Mobil klarer erkennbar. */}
                          <SelectableRow
                            selected={isPractice}
                            onToggle={() => handleTogglePractice(i)}
                            disabled={pending}
                            className="w-auto rounded-md px-2 py-1 text-xs"
                            indicatorClassName="h-4 w-4"
                          >
                            Probe
                          </SelectableRow>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleRemoveSeries(i)}
                            disabled={pending || totalSeries <= 1}
                            aria-label={`${seriesLabel} entfernen`}
                            // Kleine, aber klar als destruktiv erkennbare Aktion:
                            // so bleibt der Header kompakt und der Zweck trotzdem eindeutig.
                            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {showShots ? (
                          // Einzelschuss-Modus: Schussanzahl-Selector + N Eingabefelder + Summe
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Schüsse:</span>
                              <Input
                                type="number"
                                min="1"
                                max="99"
                                value={currentShotCount}
                                onChange={(e) =>
                                  handleShotCountChange(i, parseInt(e.target.value, 10) || 1)
                                }
                                disabled={pending}
                                className="h-7 w-16 px-2 text-center text-xs"
                                aria-label={`Schussanzahl Serie ${i + 1}`}
                              />
                            </div>
                            <div className="grid grid-cols-5 gap-1">
                              {Array.from({ length: currentShotCount }, (_, j) => {
                                const isInvalid = invalidShots[i]?.[j] ?? false
                                return (
                                  <Input
                                    key={j}
                                    type="number"
                                    min="0"
                                    max={selectedDiscipline.scoringType === "WHOLE" ? "10" : "10.9"}
                                    step={selectedDiscipline.scoringType === "TENTH" ? "0.1" : "1"}
                                    placeholder="-"
                                    value={shotsForSeries[j] ?? ""}
                                    onChange={(e) => handleShotChange(i, j, e.target.value)}
                                    disabled={pending}
                                    className={`px-1 text-center text-sm ${
                                      isInvalid
                                        ? "border-destructive focus-visible:ring-destructive"
                                        : ""
                                    }`}
                                    aria-label={`Serie ${i + 1} Schuss ${j + 1}`}
                                    aria-invalid={isInvalid}
                                  />
                                )
                              })}
                            </div>

                            {/* Fehlermeldung bei ungültigen Schüssen */}
                            {invalidShotCount > 0 && (
                              <p className="text-xs text-destructive">
                                {selectedDiscipline.scoringType === "TENTH"
                                  ? `${invalidShotCount} ungültige${invalidShotCount === 1 ? "r" : ""} Wert — erlaubt: 0.0 oder 1.0–10.9`
                                  : `${invalidShotCount} ungültige${invalidShotCount === 1 ? "r" : ""} Wert — erlaubt: 0–10 (ganzzahlig)`}
                              </p>
                            )}

                            {/* Seriensumme live berechnet und read-only angezeigt */}
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-muted-foreground">Summe:</span>
                              <span className="font-medium">
                                {computedTotal !== null ? computedTotal : "–"}
                              </span>
                              <span className="text-sm text-muted-foreground">/ {maxLabel}</span>
                              {/* Berechnete Summe als Hidden-Field für den Server */}
                              <input
                                type="hidden"
                                name={`series[${i}][scoreTotal]`}
                                value={computedTotal !== null ? String(computedTotal) : ""}
                              />
                            </div>
                          </div>
                        ) : (
                          // Summen-Modus: Seriensumme direkt eingeben (kontrolliertes Input)
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Input
                                id={`series-${i}`}
                                name={`series[${i}][scoreTotal]`}
                                type="number"
                                min="0"
                                max={maxLabel}
                                step={selectedDiscipline.scoringType === "TENTH" ? "0.1" : "1"}
                                placeholder="Ringe"
                                className={`w-28 ${
                                  totalIsInvalid
                                    ? "border-destructive focus-visible:ring-destructive"
                                    : ""
                                }`}
                                value={seriesTotals[i] ?? ""}
                                onChange={(e) => handleTotalChange(i, e.target.value)}
                                disabled={pending}
                                aria-invalid={totalIsInvalid}
                              />
                              <span className="text-sm text-muted-foreground">/ {maxLabel}</span>
                            </div>
                            {/* Fehlermeldung bei überschrittenem Maximum */}
                            {totalIsInvalid && (
                              <p className="text-xs text-destructive">
                                Maximum: {maxLabel}{" "}
                                {selectedDiscipline.scoringType === "TENTH" ? "Zehntel" : "Ringe"}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Ausführungsqualität — optional */}
                      <div className="space-y-1">
                        <Label htmlFor={`quality-${i}`} className="text-xs text-muted-foreground">
                          Ausführung (optional)
                        </Label>
                        <Select
                          name={`series[${i}][executionQuality]`}
                          defaultValue={
                            sortedInitialSeries[i]?.executionQuality != null
                              ? String(sortedInitialSeries[i].executionQuality)
                              : undefined
                          }
                        >
                          <SelectTrigger id={`quality-${i}`} className="h-8 text-xs">
                            <SelectValue placeholder="Bewertung wählen" />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(executionQualityLabels).map(([value, label]) => (
                              <SelectItem key={value} value={value} className="text-xs">
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )
            })}
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddSeries}
              disabled={pending}
            >
              + Wertungsserie
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddPracticeSeries}
              disabled={pending}
            >
              + Probe-Serie
            </Button>
          </div>
        </div>
      )}

      {selectedDiscipline && (
        <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Meyton-Import</DialogTitle>
              <DialogDescription>
                Die importierten Daten ersetzen alle aktuellen Serien in dieser Einheit.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="meyton-source">Quelle</Label>
                <Select
                  value={importSource}
                  onValueChange={(value) => {
                    setImportSource(value as ImportSourceType)
                    setImportError(null)
                    setImportUrl("")
                    setImportFile(null)
                  }}
                >
                  <SelectTrigger id="meyton-source" className="w-full">
                    <SelectValue placeholder="Quelle wählen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="URL">PDF-URL</SelectItem>
                    <SelectItem value="UPLOAD">PDF-Upload</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {importSource === "URL" ? (
                <div className="space-y-2">
                  <Label htmlFor="pdfUrl">PDF-URL</Label>
                  <Input
                    key="meyton-url-input"
                    id="pdfUrl"
                    type="url"
                    placeholder="example.com/meyton.pdf"
                    value={importUrl}
                    onChange={(event) => setImportUrl(event.target.value)}
                    disabled={isImportPending}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="file">PDF-Datei</Label>
                  <Input
                    key="meyton-file-input"
                    id="file"
                    type="file"
                    accept="application/pdf,.pdf"
                    onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
                    disabled={isImportPending}
                  />
                </div>
              )}

              {importError && <p className="text-sm text-destructive">{importError}</p>}
            </div>

            <DialogFooter>
              <Button type="button" disabled={isImportPending} onClick={handleMeytonImport}>
                {isImportPending ? "Importiere..." : "Importieren"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isImportPending}
                onClick={() => setIsImportDialogOpen(false)}
              >
                Abbrechen
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

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
