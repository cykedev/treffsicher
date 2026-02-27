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
// Optional: Einzelschüsse erfassen (Toggle) und Ausführungsqualität pro Serie.
export function EinheitForm({ disciplines }: Props) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [type, setType] = useState<string>("")
  const [disciplineId, setDisciplineId] = useState<string>("")
  const [showShots, setShowShots] = useState(false)
  // Einzelschuss-Werte: shots[serienIndex][schussIndex] = string
  const [shots, setShots] = useState<string[][]>([])

  // Initialwert einmalig beim Mount berechnen — nicht bei jedem Re-Render.
  // useState-Initialisierungsfunktion wird nur einmal aufgerufen (kein impure-render-Problem)
  const [defaultDate] = useState(() => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  })

  // Gewählte Disziplin aus der Liste suchen
  const selectedDiscipline = disciplines.find((d) => d.id === disciplineId)

  // Anzahl Serien: Probeschuss-Serien + Wertungsserien
  const totalSeries = selectedDiscipline
    ? selectedDiscipline.practiceSeries + selectedDiscipline.seriesCount
    : 0

  // Shots-Array initialisieren wenn Toggle aktiviert wird
  function handleShotToggle(enabled: boolean) {
    setShowShots(enabled)
    if (enabled && selectedDiscipline) {
      // Leere Felder für alle Serien und Schüsse anlegen
      setShots(
        Array.from({ length: totalSeries }, () => Array(selectedDiscipline.shotsPerSeries).fill(""))
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
                onValueChange={(v) => {
                  setDisciplineId(v)
                  // Shots zurücksetzen wenn Disziplin wechselt
                  setShowShots(false)
                  setShots([])
                }}
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

              // Berechnete Seriensumme aus Einzelschüssen (nur im Shot-Modus)
              const shotsForSeries = shots[i] ?? []
              const computedTotal = showShots ? calculateSumFromShots(shotsForSeries) : null

              return (
                <Card key={i}>
                  <CardContent className="space-y-3 pt-4">
                    {/* Verstecktes Feld für isPractice */}
                    <input
                      type="hidden"
                      name={`series[${i}][isPractice]`}
                      value={isPractice ? "true" : "false"}
                    />

                    <div className="space-y-2">
                      <Label htmlFor={`series-${i}`}>
                        {seriesLabel}
                        {isPractice && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (Probeschuss — zählt nicht)
                          </span>
                        )}
                      </Label>

                      {showShots ? (
                        // Einzelschuss-Modus: N Eingabefelder + berechnete Summe
                        <div className="space-y-2">
                          <div className="grid grid-cols-5 gap-1">
                            {Array.from({ length: selectedDiscipline.shotsPerSeries }, (_, j) => (
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
                              / {selectedDiscipline.shotsPerSeries * 10}
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
                            max={
                              selectedDiscipline.scoringType === "WHOLE"
                                ? selectedDiscipline.shotsPerSeries * 10
                                : selectedDiscipline.shotsPerSeries * 10.9
                            }
                            step={selectedDiscipline.scoringType === "TENTH" ? "0.1" : "1"}
                            placeholder="Ringe"
                            className="w-28"
                            disabled={pending}
                          />
                          <span className="text-sm text-muted-foreground">
                            / {selectedDiscipline.shotsPerSeries * 10}{" "}
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
