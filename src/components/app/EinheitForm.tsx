"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createSession, updateSession } from "@/lib/sessions/actions"
import type { SessionDetail } from "@/lib/sessions/actions"
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
  // Wenn gesetzt: Bearbeiten-Modus — Formular wird mit bestehender Einheit vorbelegt
  initialData?: SessionDetail
  sessionId?: string
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

// Formular für neue oder bestehende Einheit.
// Im Bearbeiten-Modus (sessionId gesetzt) wird initialData zur Vorbelegen verwendet.
// Bei Auswahl von Typ und Disziplin werden die Serienfelder dynamisch generiert.
// Die Serienanzahl und Schussanzahl pro Serie kann vom Disziplin-Standard abweichen.
// Optional: Einzelschüsse erfassen (Toggle) und Ausführungsqualität pro Serie.
export function EinheitForm({ disciplines, initialData, sessionId }: Props) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  // Lazy initializer: Werte aus initialData (Bearbeiten) oder Leerwerte (Neu)
  const [type, setType] = useState<string>(() => initialData?.type ?? "")
  const [disciplineId, setDisciplineId] = useState<string>(() => initialData?.disciplineId ?? "")

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
    return sortedInitialSeries.some((s) => Array.isArray(s.shots) && (s.shots as string[]).length > 0)
  })

  // shots vorbelegen aus initialData (falls vorhanden)
  const [shots, setShots] = useState<string[][]>(() => {
    if (!initialData || !sortedInitialSeries.some((s) => Array.isArray(s.shots) && (s.shots as string[]).length > 0)) return []
    return sortedInitialSeries.map((s) =>
      Array.isArray(s.shots) ? (s.shots as string[]) : []
    )
  })

  // Serienanzahl aus initialData oder 0
  const [totalSeries, setTotalSeries] = useState<number>(() => sortedInitialSeries.length)

  // Schussanzahl pro Serie: aus shots-Array-Länge ableiten (falls shots vorhanden),
  // sonst Disziplin-Standard (aus disciplines-Array nachschlagen) oder 10
  const [shotCounts, setShotCounts] = useState<number[]>(() => {
    if (!initialData) return []
    const disc = disciplines.find((d) => d.id === initialData.disciplineId)
    return sortedInitialSeries.map((s) => {
      if (Array.isArray(s.shots) && (s.shots as string[]).length > 0) {
        return (s.shots as string[]).length
      }
      return disc?.shotsPerSeries ?? 10
    })
  })

  // isPractice-Flag pro Serie — ermöglicht manuelles Hinzufügen von Probeschuss-Serien,
  // unabhängig von der Anzahl in der Disziplin-Konfiguration
  const [seriesIsPractice, setSeriesIsPractice] = useState<boolean[]>(() =>
    sortedInitialSeries.map((s) => s.isPractice)
  )

  // Stabile Keys pro Serie: verhindert ungewollte Re-Renders (und Wertverlust in unkontrollierten
  // Inputs) wenn Serien eingefügt oder verschoben werden — neue Serien erhalten generierte IDs
  const [seriesKeys, setSeriesKeys] = useState<string[]>(() =>
    sortedInitialSeries.map((s) => s.id)
  )

  // Datum vorbelegen: aus initialData oder aktuelle Zeit
  const [defaultDate] = useState(() => {
    const base = initialData?.date ? new Date(initialData.date) : new Date()
    base.setMinutes(base.getMinutes() - base.getTimezoneOffset())
    return base.toISOString().slice(0, 16)
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
      // Probeschuss-Flags: erste practiceSeries Serien sind Probeschüsse
      setSeriesIsPractice([
        ...Array(disc.practiceSeries).fill(true),
        ...Array(disc.seriesCount).fill(false),
      ])
      setSeriesKeys([
        ...Array.from({ length: disc.practiceSeries }, (_, i) => `d-p-${i}-${Date.now()}`),
        ...Array.from({ length: disc.seriesCount }, (_, i) => `d-r-${i}-${Date.now()}`),
      ])
      setShowShots(false)
      setShots([])
    } else {
      setTotalSeries(0)
      setShotCounts([])
      setSeriesIsPractice([])
      setSeriesKeys([])
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

  // Serientyp umschalten: Probe ↔ Wertung
  // Nach dem Umschalten werden alle parallelen Arrays stabil neu sortiert:
  // Probeschuss-Serien stehen immer vor Wertungsserien (relative Reihenfolge bleibt erhalten)
  function handleTogglePractice(index: number) {
    // 1. Flag an der gewünschten Position invertieren
    const newIsPractice = seriesIsPractice.map((v, i) => (i === index ? !v : v))

    // 2. Stabile Permutation berechnen: practice = true zuerst, Reihenfolge innerhalb jeder Gruppe bleibt
    const perm = Array.from({ length: newIsPractice.length }, (_, i) => i)
    perm.sort((a, b) => {
      if (newIsPractice[a] === newIsPractice[b]) return 0
      return newIsPractice[a] ? -1 : 1
    })

    // 3. Permutation auf alle parallelen Arrays anwenden (React batcht die Updates)
    setSeriesIsPractice(perm.map((i) => newIsPractice[i]))
    setSeriesKeys(perm.map((i) => seriesKeys[i]))
    setShotCounts(perm.map((i) => shotCounts[i]))
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
    if (showShots) {
      setShots((prev) => [...prev, Array(defaultCount).fill("")])
    }
  }

  // Probeschuss-Serie hinzufügen — vor der ersten Wertungsserie einfügen
  function handleAddPracticeSeries() {
    const defaultCount = selectedDiscipline?.shotsPerSeries ?? 10
    // Erste Wertungsserie finden — dort einfügen (Probeschüsse stehen immer zuerst)
    const firstRegular = seriesIsPractice.findIndex((p) => !p)
    const idx = firstRegular === -1 ? seriesIsPractice.length : firstRegular
    const newKey = `p-${Date.now()}`
    setTotalSeries((n) => n + 1)
    setShotCounts((prev) => [...prev.slice(0, idx), defaultCount, ...prev.slice(idx)])
    setSeriesIsPractice((prev) => [...prev.slice(0, idx), true, ...prev.slice(idx)])
    setSeriesKeys((prev) => [...prev.slice(0, idx), newKey, ...prev.slice(idx)])
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

    if (sessionId) {
      // Bearbeiten-Modus: bestehende Einheit aktualisieren
      await updateSession(sessionId, formData)
    } else {
      // Neu-Modus: neue Einheit anlegen
      await createSession(formData)
    }
    // Actions führen intern redirect() durch bei Erfolg
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
              defaultValue={initialData?.location ?? ""}
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
              // isPractice aus State — unabhängig von Position und Disziplin-Konfiguration
              const isPractice = seriesIsPractice[i] ?? false
              // Laufende Nummerierung je Serientyp
              const practicesBefore = seriesIsPractice.slice(0, i).filter(Boolean).length
              const regularsBefore = i - practicesBefore
              const seriesLabel = isPractice
                ? `Probeschuss-Serie ${practicesBefore + 1}`
                : `Serie ${regularsBefore + 1}`

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
                // Wrapper hat stabilen key und trägt das dunkle Dreieck als CSS-Gradient —
                // es scheint durch die abgeschnittene Ecke der Card hindurch
                <div
                  key={seriesKeys[i] ?? i}
                  className="relative"
                  style={
                    isPractice
                      ? {
                          // Gradient 28×28px oben-rechts: dunkle Hälfte = Dreieck oben-rechts
                          backgroundImage: "linear-gradient(225deg, #374151 50%, transparent 50%)",
                          backgroundSize: "28px 28px",
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
                        ? // Abgeschnittene obere rechte Ecke — gibt Dreieck des Wrappers frei
                          { clipPath: "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)" }
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
                        {/* Typ umschalten: Probe ↔ Wertung */}
                        <button
                          type="button"
                          onClick={() => handleTogglePractice(i)}
                          disabled={pending}
                          aria-label={isPractice ? "Als Wertungsserie markieren" : "Als Probeschuss-Serie markieren"}
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
                            defaultValue={
                              sortedInitialSeries[i]?.scoreTotal != null
                                ? String(sortedInitialSeries[i].scoreTotal)
                                : ""
                            }
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
            {/* Wertungsserie hinzufügen */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddSeries}
              disabled={pending}
            >
              + Wertungsserie
            </Button>
            {/* Probeschuss-Serie hinzufügen — zählt nicht in die Gesamtwertung */}
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
        <Button type="submit" disabled={pending || !type}>
          {pending ? "Speichern..." : sessionId ? "Änderungen speichern" : "Einheit speichern"}
        </Button>
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
