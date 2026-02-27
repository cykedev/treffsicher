"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createSession } from "@/lib/sessions/actions"
import { calculateSumFromShots } from "@/lib/sessions/calculateScore"
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
import type { Discipline } from "@/generated/prisma/client"

interface Props {
  disciplines: Discipline[]
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

// Formular für neue Einheit.
// Bei Auswahl von Typ und Disziplin werden die Serienfelder dynamisch generiert.
// Die Serienanzahl und Schussanzahl pro Serie kann vom Disziplin-Standard abweichen.
// Optional: Einzelschüsse erfassen (Toggle) und Ausführungsqualität pro Serie.
export function EinheitForm({ disciplines }: Props) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [type, setType] = useState<string>("")
  const [disciplineId, setDisciplineId] = useState<string>("")
  const [showShots, setShowShots] = useState(false)
  // Einzelschuss-Werte: shots[serienIndex][schussIndex] = string
  const [shots, setShots] = useState<string[][]>([])
  // Serienanzahl als State — Nutzer kann vom Disziplin-Standard abweichen
  const [totalSeries, setTotalSeries] = useState<number>(0)
  // Schussanzahl pro Serie — nur relevant wenn showShots = true
  const [shotCounts, setShotCounts] = useState<number[]>([])

  // Initialwert einmalig beim Mount berechnen — nicht bei jedem Re-Render.
  // useState-Initialisierungsfunktion wird nur einmal aufgerufen (kein impure-render-Problem)
  const [defaultDate] = useState(() => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  })

  // Gewählte Disziplin aus der Liste suchen
  const selectedDiscipline = disciplines.find((d) => d.id === disciplineId)

  // Disziplinwechsel: Serien-State auf Disziplin-Standardwerte zurücksetzen
  function handleDisciplineChange(id: string) {
    setDisciplineId(id)
    const disc = disciplines.find((d) => d.id === id)
    if (disc) {
      const newTotal = disc.practiceSeries + disc.seriesCount
      setTotalSeries(newTotal)
      setShotCounts(Array(newTotal).fill(disc.shotsPerSeries))
      setShowShots(false)
      setShots([])
    } else {
      setTotalSeries(0)
      setShotCounts([])
      setShowShots(false)
      setShots([])
    }
  }

  // Shots-Array initialisieren wenn Toggle aktiviert wird.
  // Nutzt shotCounts statt festem shotsPerSeries — berücksichtigt individuelle Anpassungen.
  function handleShotToggle(enabled: boolean) {
    setShowShots(enabled)
    if (enabled) {
      setShots(shotCounts.map((count) => Array(count).fill("")))
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

  // Serie hinzufügen — immer am Ende, immer als Wertungsserie
  function handleAddSeries() {
    const defaultCount = selectedDiscipline?.shotsPerSeries ?? 10
    setTotalSeries((n) => n + 1)
    setShotCounts((prev) => [...prev, defaultCount])
    if (showShots) {
      setShots((prev) => [...prev, Array(defaultCount).fill("")])
    }
  }

  // Serie entfernen — mindestens 1 Serie bleibt erhalten
  function handleRemoveSeries(index: number) {
    if (totalSeries <= 1) return
    setTotalSeries((n) => n - 1)
    setShotCounts((prev) => prev.filter((_, i) => i !== index))
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
            // Neue Felder anhängen
            return [...serieShots, ...Array(count - serieShots.length).fill("")]
          }
          // Überzählige Felder abschneiden
          return serieShots.slice(0, count)
        })
      )
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setPending(true)

    const formData = new FormData(e.currentTarget)

    // Shots als JSON-String in die FormData schreiben — FormData unterstützt keine verschachtelten
    // Arrays nativ, daher serialisieren wir die Werte explizit bevor sie zum Server geschickt werden
    if (showShots && shots.length > 0) {
      shots.forEach((seriesShots, i) => {
        formData.set(`series[${i}][shots]`, JSON.stringify(seriesShots))
      })
    }

    await createSession(formData)
    // createSession führt intern redirect() durch bei Erfolg
    setPending(false)
  }

  const needsDiscipline = typesWithDiscipline.includes(type)

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Einheitentyp */}
            <div className="space-y-2">
              <Label htmlFor="type">Art der Einheit</Label>
              <Select
                name="type"
                required
                onValueChange={(v) => {
                  setType(v)
                  // Disziplin zurücksetzen wenn kein Schiessen
                  if (!typesWithDiscipline.includes(v)) {
                    setDisciplineId("")
                    setTotalSeries(0)
                    setShotCounts([])
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
              disabled={pending}
            />
          </div>
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
              // Probeschüsse kommen zuerst (wenn practiceSeries > 0)
              const isPractice = i < selectedDiscipline.practiceSeries
              const seriesLabel = isPractice
                ? `Probeschuss-Serie ${i + 1}`
                : `Serie ${i - selectedDiscipline.practiceSeries + 1}`

              // Schussanzahl dieser Serie (ggf. vom Nutzer angepasst)
              const currentShotCount = shotCounts[i] ?? selectedDiscipline.shotsPerSeries
              // Berechnete Seriensumme aus Einzelschüssen (nur im Shot-Modus)
              const shotsForSeries = shots[i] ?? []
              const computedTotal = showShots ? calculateSumFromShots(shotsForSeries) : null
              // Maximale Ringe basierend auf aktueller Schussanzahl
              const maxScore =
                selectedDiscipline.scoringType === "TENTH"
                  ? currentShotCount * 10.9
                  : currentShotCount * 10

              return (
                <Card key={i}>
                  <CardContent className="space-y-3 pt-4">
                    {/* Verstecktes Feld für isPractice */}
                    <input
                      type="hidden"
                      name={`series[${i}][isPractice]`}
                      value={isPractice ? "true" : "false"}
                    />

                    {/* Serien-Header mit Label und Entfernen-Button */}
                    <div className="flex items-center justify-between">
                      <Label htmlFor={`series-${i}`} className="leading-none">
                        {seriesLabel}
                        {isPractice && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            (zählt nicht)
                          </span>
                        )}
                      </Label>
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

                    <div className="space-y-2">
                      {showShots ? (
                        // Einzelschuss-Modus: Schussanzahl-Selector + N Eingabefelder + Summe
                        <div className="space-y-2">
                          {/* Schussanzahl anpassbar — Disziplin-Wert ist nur Standardwert */}
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
                            {Array.from({ length: currentShotCount }, (_, j) => (
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
                                className="px-1 text-center text-sm"
                                aria-label={`Serie ${i + 1} Schuss ${j + 1}`}
                              />
                            ))}
                          </div>
                          {/* Seriensumme live berechnet und read-only angezeigt */}
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">Summe:</span>
                            <span className="font-medium">
                              {computedTotal !== null ? computedTotal : "–"}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              /{" "}
                              {selectedDiscipline.scoringType === "TENTH"
                                ? maxScore.toFixed(1)
                                : maxScore}
                            </span>
                            {/* Berechnete Summe als Hidden-Field für den Server */}
                            <input
                              type="hidden"
                              name={`series[${i}][scoreTotal]`}
                              value={computedTotal !== null ? String(computedTotal) : ""}
                            />
                          </div>
                        </div>
                      ) : (
                        // Standard-Modus: Seriensumme direkt eingeben
                        <div className="flex items-center gap-2">
                          <Input
                            id={`series-${i}`}
                            name={`series[${i}][scoreTotal]`}
                            type="number"
                            min="0"
                            step={selectedDiscipline.scoringType === "TENTH" ? "0.1" : "1"}
                            placeholder="Ringe"
                            className="w-28"
                            disabled={pending}
                          />
                          <span className="text-sm text-muted-foreground">
                            {selectedDiscipline.scoringType === "TENTH" ? "Zehntel" : "Ringe"}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Ausführungsqualität — optional, hilft zu erkennen ob schlechte Ergebnisse
                        aus Technikfehlern oder schlechter Tagesform entstanden sind */}
                    <div className="space-y-1">
                      <Label htmlFor={`quality-${i}`} className="text-xs text-muted-foreground">
                        Ausführung (optional)
                      </Label>
                      <Select name={`series[${i}][executionQuality]`}>
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
              )
            })}
          </div>

          {/* Serie hinzufügen — immer als Wertungsserie am Ende */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddSeries}
            disabled={pending}
          >
            + Serie hinzufügen
          </Button>
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={pending || !type}>
          {pending ? "Speichern..." : "Einheit speichern"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => router.push("/einheiten")}
        >
          Abbrechen
        </Button>
      </div>
    </form>
  )
}
