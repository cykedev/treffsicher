"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createSession, updateSession } from "@/lib/sessions/actions"
import type { SessionDetail } from "@/lib/sessions/actions"
import type { MeytonImportPrefill } from "@/lib/sessions/actions"
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
import type { Discipline } from "@/generated/prisma/client"

interface Props {
  disciplines: Discipline[]
  // Wenn gesetzt: Bearbeiten-Modus — Formular wird mit bestehender Einheit vorbelegt
  initialData?: SessionDetail
  sessionId?: string
  // Meyton-Import liefert eine Draft-Vorbelegung fuer "Neue Einheit"
  prefillData?: MeytonImportPrefill
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

interface FormSeriesSeed {
  id: string
  isPractice: boolean
  scoreTotal: number | null
  shots: string[]
  executionQuality: number | null
}

// Formular für neue oder bestehende Einheit.
// Im Bearbeiten-Modus (sessionId gesetzt) wird initialData zur Vorbelegen verwendet.
// Bei Auswahl von Typ und Disziplin werden die Serienfelder dynamisch generiert.
// Die Serienanzahl und Schussanzahl pro Serie kann vom Disziplin-Standard abweichen.
// Optional: Einzelschüsse erfassen (Toggle) und Ausführungsqualität pro Serie.
export function EinheitForm({ disciplines, initialData, sessionId, prefillData }: Props) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  // Lazy initializer: Werte aus initialData (Bearbeiten) oder Leerwerte (Neu)
  const [type, setType] = useState<string>(() => prefillData?.type ?? initialData?.type ?? "")
  const [disciplineId, setDisciplineId] = useState<string>(
    () => prefillData?.disciplineId ?? initialData?.disciplineId ?? ""
  )

  // Serien sortiert: Probeschüsse immer zuerst — wird einmalig beim Mount berechnet
  // und als Referenz für alle State-Initialisierungen verwendet
  const [sortedInitialSeries] = useState<FormSeriesSeed[]>(() => {
    const sourceSeries: FormSeriesSeed[] = initialData
      ? initialData.series.map((serie) => ({
          id: serie.id,
          isPractice: serie.isPractice,
          scoreTotal: serie.scoreTotal,
          shots: Array.isArray(serie.shots) ? (serie.shots as string[]) : [],
          executionQuality: serie.executionQuality,
        }))
      : prefillData
        ? prefillData.series.map((serie, index) => ({
            id: `meyton-${index}-${serie.nr}`,
            isPractice: false,
            scoreTotal: Number(serie.scoreTotal),
            shots: serie.shots,
            executionQuality: null,
          }))
        : []

    return [...sourceSeries].sort((a, b) => {
      if (a.isPractice === b.isPractice) return 0
      return a.isPractice ? -1 : 1
    })
  })

  // Einzelschuss-Modus: aktiv wenn mindestens eine Serie shots-Daten hat
  const [showShots, setShowShots] = useState<boolean>(() => {
    if (!initialData && !prefillData) return false
    return sortedInitialSeries.some((s) => Array.isArray(s.shots) && s.shots.length > 0)
  })

  // shots vorbelegen aus initialData (falls vorhanden)
  const [shots, setShots] = useState<string[][]>(() => {
    if (!sortedInitialSeries.some((s) => Array.isArray(s.shots) && s.shots.length > 0)) return []
    return sortedInitialSeries.map((s) => (Array.isArray(s.shots) ? s.shots : []))
  })

  // Serienanzahl aus initialData oder 0
  const [totalSeries, setTotalSeries] = useState<number>(() => sortedInitialSeries.length)

  // Schussanzahl pro Serie: aus shots-Array-Länge ableiten (falls shots vorhanden),
  // sonst Disziplin-Standard (aus disciplines-Array nachschlagen) oder 10
  const [shotCounts, setShotCounts] = useState<number[]>(() => {
    if (!initialData && !prefillData) return []
    const seedDisciplineId = prefillData?.disciplineId ?? initialData?.disciplineId
    const disc = disciplines.find((d) => d.id === seedDisciplineId)
    return sortedInitialSeries.map((s) => {
      if (Array.isArray(s.shots) && s.shots.length > 0) {
        return s.shots.length
      }
      return disc?.shotsPerSeries ?? 10
    })
  })

  // Seriensummen im Summen-Modus: kontrolliertes State-Array (parallel zu shotCounts etc.)
  // Ermöglicht Echtzeit-Validierung ohne nativen Browser-Validation-Dialog
  const [seriesTotals, setSeriesTotals] = useState<string[]>(() => {
    if (!initialData && !prefillData) return []
    return sortedInitialSeries.map((s) => (s.scoreTotal != null ? String(s.scoreTotal) : ""))
  })

  // isPractice-Flag pro Serie — ermöglicht manuelles Hinzufügen von Probeschuss-Serien,
  // unabhängig von der Anzahl in der Disziplin-Konfiguration
  const [seriesIsPractice, setSeriesIsPractice] = useState<boolean[]>(() =>
    sortedInitialSeries.map((s) => s.isPractice)
  )

  // Stabile Keys pro Serie: verhindert ungewollte Re-Renders (und Wertverlust in unkontrollierten
  // Inputs) wenn Serien eingefügt oder verschoben werden — neue Serien erhalten generierte IDs
  const [seriesKeys, setSeriesKeys] = useState<string[]>(() => sortedInitialSeries.map((s) => s.id))

  // Datum vorbelegen: aus initialData oder aktuelle Zeit
  const [defaultDate] = useState(() => {
    const seedDate = prefillData?.date ?? initialData?.date
    const base = seedDate ? new Date(seedDate) : new Date()
    base.setMinutes(base.getMinutes() - base.getTimezoneOffset())
    return base.toISOString().slice(0, 16)
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

  // ─── Handler ─────────────────────────────────────────────────────────────────

  // Disziplinwechsel: alle Serien-States auf Disziplin-Standardwerte zurücksetzen
  function handleDisciplineChange(id: string) {
    setDisciplineId(id)
    const disc = disciplines.find((d) => d.id === id)
    if (disc) {
      const newTotal = disc.practiceSeries + disc.seriesCount
      setTotalSeries(newTotal)
      setShotCounts(Array(newTotal).fill(disc.shotsPerSeries))
      setSeriesIsPractice([
        ...Array(disc.practiceSeries).fill(true),
        ...Array(disc.seriesCount).fill(false),
      ])
      setSeriesKeys([
        ...Array.from({ length: disc.practiceSeries }, (_, i) => `d-p-${i}-${Date.now()}`),
        ...Array.from({ length: disc.seriesCount }, (_, i) => `d-r-${i}-${Date.now()}`),
      ])
      setSeriesTotals(Array(newTotal).fill(""))
      setShowShots(false)
      setShots([])
    } else {
      setTotalSeries(0)
      setShotCounts([])
      setSeriesIsPractice([])
      setSeriesKeys([])
      setSeriesTotals([])
      setShowShots(false)
      setShots([])
    }
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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    // Validierung vor dem Absenden: ungültige Felder verhindern Speichern
    if (hasValidationErrors) return

    setPending(true)

    const formData = new FormData(e.currentTarget)

    // Shots als JSON-String in die FormData schreiben — FormData unterstützt keine verschachtelten
    // Arrays nativ, daher serialisieren wir die Werte explizit bevor sie zum Server geschickt werden
    if (showShots && shots.length > 0) {
      shots.forEach((seriesShots, i) => {
        formData.set(`series[${i}][shots]`, JSON.stringify(seriesShots))
      })
    }

    if (sessionId) {
      await updateSession(sessionId, formData)
    } else {
      await createSession(formData)
    }
    // Actions führen intern redirect() durch bei Erfolg
    setPending(false)
  }

  const needsDiscipline = typesWithDiscipline.includes(type)

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
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
                defaultValue={defaultDate}
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

          {/* Ort (optional) */}
          <div className="space-y-2">
            <Label htmlFor="location">Ort (optional)</Label>
            <Input
              id="location"
              name="location"
              placeholder="z.B. Schützenhaus Muster"
              defaultValue={prefillData?.location ?? initialData?.location ?? ""}
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
                defaultValue={prefillData?.trainingGoal ?? initialData?.trainingGoal ?? ""}
                disabled={pending}
                rows={2}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Serien — erscheinen erst wenn Disziplin gewählt */}
      {needsDiscipline && selectedDiscipline && totalSeries > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Serien</h2>
            {/* Einzelschuss-Toggle — erlaubt detailliertere Erfassung für Analyse */}
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showShots}
                onChange={(e) => handleShotToggle(e.target.checked)}
                disabled={pending}
                className="h-4 w-4"
              />
              Einzelschüsse erfassen
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: totalSeries }, (_, i) => {
              const isPractice = seriesIsPractice[i] ?? false
              const practicesBefore = seriesIsPractice.slice(0, i).filter(Boolean).length
              const regularsBefore = i - practicesBefore
              const seriesLabel = isPractice
                ? `Probeschuss-Serie ${practicesBefore + 1}`
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
                          <button
                            type="button"
                            onClick={() => handleTogglePractice(i)}
                            disabled={pending}
                            aria-label={
                              isPractice
                                ? "Als Wertungsserie markieren"
                                : "Als Probeschuss-Serie markieren"
                            }
                            className="rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground hover:border-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            {isPractice ? "→ Wertung" : "→ Probe"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveSeries(i)}
                            disabled={pending || totalSeries <= 1}
                            aria-label={`${seriesLabel} entfernen`}
                            className="h-5 w-5 rounded text-xs text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            ×
                          </button>
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
              + Probeschuss-Serie
            </Button>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending || !type || hasValidationErrors}>
          {pending ? "Speichern..." : sessionId ? "Änderungen speichern" : "Einheit speichern"}
        </Button>
        {hasValidationErrors && (
          <p className="self-center text-sm text-destructive">Bitte ungültige Werte korrigieren.</p>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => router.push(sessionId ? `/einheiten/${sessionId}` : "/einheiten")}
        >
          Abbrechen
        </Button>
      </div>
    </form>
  )
}
