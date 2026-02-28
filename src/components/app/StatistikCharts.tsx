"use client"

import { useState, useMemo } from "react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { calculateMovingAverage } from "@/lib/stats/calculateMovingAverage"
import { calculateSeriesStats } from "@/lib/stats/calculateSeriesStats"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  StatsSession,
  DisciplineForStats,
  WellbeingCorrelationPoint,
  QualityVsScorePoint,
  ShotDistributionPoint,
} from "@/lib/stats/actions"

interface Props {
  sessions: StatsSession[]
  wellbeingData: WellbeingCorrelationPoint[]
  qualityData: QualityVsScorePoint[]
  shotDistributionData: ShotDistributionPoint[]
}

type TypeFilter = "all" | "TRAINING" | "WETTKAMPF"
type DisplayMode = "per_shot" | "projected"

// Datumsstring für Presets berechnen
function daysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString().slice(0, 10)
}

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Anzeigewert je nach Modus berechnen.
 * per_shot: normalisierter Wert (Ringe/Schuss), 2 Stellen.
 * projected: Hochrechnung auf die Gesamtschusszahl der Disziplin.
 */
function computeDisplayValue(
  avgPerShot: number,
  mode: DisplayMode,
  discipline: DisciplineForStats | null
): number {
  if (mode === "projected" && discipline) {
    const total = avgPerShot * discipline.shotsPerSeries * discipline.seriesCount
    // Zehntelwertung: 1 Dezimalstelle; Ganzringe: auf ganze Ringe runden
    return discipline.scoringType === "TENTH"
      ? Math.round(total * 10) / 10
      : Math.round(total)
  }
  return avgPerShot
}

/**
 * Statistik-Charts-Komponente.
 * Empfängt alle Einheiten und filtert client-seitig — ausreichend für kleine Nutzerzahl.
 * Zeigt Ringe/Schuss statt absolute Summe — damit sind Einheiten mit unterschiedlicher
 * Schussanzahl direkt vergleichbar. Optional: Hochrechnung auf Disziplin-Gesamtschuss.
 */
export function StatistikCharts({
  sessions,
  wellbeingData,
  qualityData,
  shotDistributionData,
}: Props) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [disciplineFilter, setDisciplineFilter] = useState<string>("all")
  const [displayMode, setDisplayMode] = useState<DisplayMode>("per_shot")

  // Verfügbare Disziplinen aus den Einheitendaten ableiten — keine separate Abfrage nötig
  const availableDisciplines = useMemo<DisciplineForStats[]>(() => {
    const seen = new Set<string>()
    const result: DisciplineForStats[] = []
    for (const s of sessions) {
      if (s.discipline && !seen.has(s.discipline.id)) {
        seen.add(s.discipline.id)
        result.push(s.discipline)
      }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name, "de"))
  }, [sessions])

  // Aktuell gewählte Disziplin (für Hochrechnung und Metadaten)
  const selectedDiscipline = useMemo(
    () => availableDisciplines.find((d) => d.id === disciplineFilter) ?? null,
    [availableDisciplines, disciplineFilter]
  )

  // Wenn keine Disziplin gewählt, ist Hochrechnung nicht möglich — per_shot als Fallback.
  // Abgeleitet statt useEffect — verhindert Kaskadenrender.
  const effectiveDisplayMode: DisplayMode =
    disciplineFilter === "all" || !selectedDiscipline ? "per_shot" : displayMode

  // Gefilterte Einheiten (Typ + Disziplin + Zeitraum)
  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (typeFilter !== "all" && s.type !== typeFilter) return false
      if (disciplineFilter !== "all" && s.disciplineId !== disciplineFilter) return false
      if (from && new Date(s.date) < new Date(from)) return false
      if (to) {
        const toDate = new Date(to)
        toDate.setHours(23, 59, 59)
        if (new Date(s.date) > toDate) return false
      }
      return true
    })
  }, [sessions, typeFilter, disciplineFilter, from, to])

  // Wellbeing-Daten nach Disziplin filtern — keine Disziplin-Vermischung
  const filteredWellbeing = useMemo(() => {
    if (disciplineFilter === "all") return wellbeingData
    return wellbeingData.filter((p) => p.disciplineId === disciplineFilter)
  }, [wellbeingData, disciplineFilter])

  // Ausführungsqualität-Daten nach Disziplin filtern
  const filteredQuality = useMemo(() => {
    if (disciplineFilter === "all") return qualityData
    return qualityData.filter((p) => p.disciplineId === disciplineFilter)
  }, [qualityData, disciplineFilter])

  // Schussverteilungs-Daten nach Disziplin filtern
  const filteredShotDistribution = useMemo(() => {
    if (disciplineFilter === "all") return shotDistributionData
    return shotDistributionData.filter((p) => p.disciplineId === disciplineFilter)
  }, [shotDistributionData, disciplineFilter])

  // Befinden-Anzeigedaten: bei Hochrechnung auf Gesamtschusszahl der Disziplin projizieren
  const wellbeingDisplayData = useMemo(() => {
    return filteredWellbeing.map((p) => ({
      ...p,
      displayScore:
        effectiveDisplayMode === "projected" && selectedDiscipline
          ? computeDisplayValue(p.avgPerShot, "projected", selectedDiscipline)
          : p.avgPerShot,
    }))
  }, [filteredWellbeing, effectiveDisplayMode, selectedDiscipline])

  // Ausführungsqualität-Anzeigedaten: bei Hochrechnung auf Ringe/Serie (shotsPerSeries) projizieren,
  // nicht auf den Gesamtschuss — Serienergebnis ist der sinnvolle Vergleichswert hier
  const qualityDisplayData = useMemo(() => {
    return filteredQuality.map((p) => ({
      ...p,
      displayScore:
        effectiveDisplayMode === "projected" && selectedDiscipline
          ? selectedDiscipline.scoringType === "TENTH"
            ? Math.round(p.scorePerShot * selectedDiscipline.shotsPerSeries * 10) / 10
            : Math.round(p.scorePerShot * selectedDiscipline.shotsPerSeries)
          : p.scorePerShot,
    }))
  }, [filteredQuality, effectiveDisplayMode, selectedDiscipline])

  // Nur Einheiten mit normalisiertem Ergebnis (avgPerShot) für den Verlaufschart
  const withScore = filtered.filter((s) => s.avgPerShot !== null)

  // Anzeigewerte je nach effektivem Modus berechnen
  const displayValues = withScore.map((s) =>
    computeDisplayValue(s.avgPerShot as number, effectiveDisplayMode, selectedDiscipline)
  )

  // Gleitender Durchschnitt über die Anzeigewerte
  const movingAvg = calculateMovingAverage(displayValues, 5)

  // Gesamtschusszahl der gewählten Disziplin (für Hochrechnung-Label)
  const totalDisciplineShots = selectedDiscipline
    ? selectedDiscipline.shotsPerSeries * selectedDiscipline.seriesCount
    : null

  // Label für Legende und Y-Achsen-Beschriftung (Ergebnisverlauf)
  const metricLabel =
    effectiveDisplayMode === "projected" && selectedDiscipline
      ? `Hochrechnung (${totalDisciplineShots} Sch.)`
      : "Ringe/Sch."

  // Y-Achsen-Labels für Befinden- und Qualitätscharts
  const wellbeingScoreLabel =
    effectiveDisplayMode === "projected" && selectedDiscipline
      ? `Ringe (${totalDisciplineShots} Sch.)`
      : "Ringe/Sch."
  const qualityScoreLabel =
    effectiveDisplayMode === "projected" && selectedDiscipline
      ? `Ringe/Serie (${selectedDiscipline.shotsPerSeries} Sch.)`
      : "Ringe/Sch."

  // Tooltip-Formatierung: 2 Stellen für Ringe/Schuss, disziplinabhängig für Hochrechnung
  function formatDisplayValue(value: number): string {
    if (effectiveDisplayMode === "projected" && selectedDiscipline) {
      return selectedDiscipline.scoringType === "TENTH"
        ? value.toFixed(1)
        : String(value)
    }
    return value.toFixed(2)
  }

  // Daten für den Verlaufschart
  const lineData = withScore.map((s, i) => ({
    i,
    datum: new Intl.DateTimeFormat("de-CH", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(s.date)),
    // Feste Keys statt dynamischer — Recharts braucht stabile dataKey-Referenzen
    wert: displayValues[i],
    trend: movingAvg[i],
  }))

  // Serien-Statistiken für BarChart
  const seriesStats = useMemo(() => calculateSeriesStats(filtered), [filtered])
  const barData = seriesStats.map((s) => ({
    name: `S${s.position}`,
    Min: s.min,
    Max: s.max,
    Avg: s.avg,
  }))

  const hasData = withScore.length > 0

  return (
    <div className="space-y-6">
      {/* Filter */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          {/* Erste Filterzeile: Typ, Disziplin, Von, Bis */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Typ-Filter */}
            <div className="space-y-2">
              <Label>Einheitentyp</Label>
              <div className="flex gap-1">
                {(["all", "TRAINING", "WETTKAMPF"] as TypeFilter[]).map((t) => (
                  <Button
                    key={t}
                    size="sm"
                    variant={typeFilter === t ? "default" : "outline"}
                    onClick={() => setTypeFilter(t)}
                    className="flex-1 text-xs"
                  >
                    {t === "all" ? "Alle" : t === "TRAINING" ? "Training" : "Wettkampf"}
                  </Button>
                ))}
              </div>
            </div>

            {/* Disziplin-Filter — verhindert Vermischung unterschiedlicher Disziplinen */}
            <div className="space-y-2">
              <Label>Disziplin</Label>
              <Select value={disciplineFilter} onValueChange={setDisciplineFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Disziplinen</SelectItem>
                  {availableDisciplines.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Von */}
            <div className="space-y-2">
              <Label htmlFor="from">Von</Label>
              <Input id="from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>

            {/* Bis */}
            <div className="space-y-2">
              <Label htmlFor="to">Bis</Label>
              <Input id="to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
          </div>

          {/* Zweite Filterzeile: Zeitraum-Presets + Anzeigemodus */}
          <div className="flex flex-wrap items-end gap-6">
            <div className="space-y-2">
              <Label>Zeitraum</Label>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => {
                    setFrom(daysAgo(28))
                    setTo(today())
                  }}
                >
                  4 Wochen
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => {
                    setFrom(daysAgo(30))
                    setTo(today())
                  }}
                >
                  Monat
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => {
                    setFrom("")
                    setTo("")
                  }}
                >
                  Alle
                </Button>
              </div>
            </div>

            {/* Anzeigemodus — nur wenn eine Disziplin gewählt (Hochrechnung braucht feste Schusszahl) */}
            {selectedDiscipline && (
              <div className="space-y-2">
                <Label>Anzeige</Label>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant={effectiveDisplayMode === "per_shot" ? "default" : "outline"}
                    onClick={() => setDisplayMode("per_shot")}
                    className="text-xs"
                  >
                    Ringe/Sch.
                  </Button>
                  <Button
                    size="sm"
                    variant={effectiveDisplayMode === "projected" ? "default" : "outline"}
                    onClick={() => setDisplayMode("projected")}
                    className="text-xs"
                  >
                    Hochrechnung ({totalDisciplineShots} Sch.)
                  </Button>
                </div>
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            {filtered.length} Einheit{filtered.length !== 1 ? "en" : ""} gefunden
            {withScore.length !== filtered.length && ` · ${withScore.length} mit Ergebnis`}
            {selectedDiscipline && ` · ${selectedDiscipline.name}`}
          </p>
        </CardContent>
      </Card>

      {!hasData ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Keine Daten für den gewählten Filter.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Ergebnisverlauf */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-baseline gap-2">
                Ergebnisverlauf
                <span className="text-base font-normal text-muted-foreground">
                  {effectiveDisplayMode === "projected" && selectedDiscipline
                    ? `Hochrechnung auf ${totalDisciplineShots} Schuss`
                    : "Ringe pro Schuss"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={lineData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  {/* dataKey="i" statt "datum" — verhindert Kollision wenn zwei Einheiten
                      am selben Tag existieren (gleicher Datumsstring → gleicher x-Slot) */}
                  <XAxis
                    dataKey="i"
                    tickFormatter={(i: number) => lineData[i]?.datum ?? ""}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis domain={["auto", "auto"]} tick={{ fontSize: 12 }} />
                  <Tooltip
                    labelFormatter={(i) => lineData[i as number]?.datum ?? ""}
                    formatter={(value, name) => [
                      typeof value === "number" ? formatDisplayValue(value) : String(value ?? ""),
                      name === "wert" ? metricLabel : "Trend",
                    ]}
                  />
                  <Legend formatter={(value) => (value === "wert" ? metricLabel : "Trend")} />
                  <Line
                    type="monotone"
                    dataKey="wert"
                    name="wert"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="trend"
                    name="trend"
                    stroke="var(--muted-foreground)"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    dot={false}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Serienwertungen — nur wenn Serien vorhanden */}
          {barData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-baseline gap-2">
                  Serienwertungen
                  {/* Hinweis wenn Disziplinen vermischt werden könnten */}
                  {disciplineFilter === "all" && (
                    <span className="text-sm font-normal text-muted-foreground">
                      (Disziplin wählen für vergleichbare Werte)
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={barData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Min" fill="var(--chart-2)" opacity={0.5} />
                    <Bar dataKey="Avg" fill="var(--chart-1)" />
                    <Bar dataKey="Max" fill="var(--chart-1)" opacity={0.4} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Befinden-Korrelation — nach Disziplin gefiltert */}
      {filteredWellbeing.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-baseline gap-2">
            Befinden vs. Ergebnis
            {effectiveDisplayMode === "projected" && selectedDiscipline && (
              <span className="text-base font-normal text-muted-foreground">
                Hochrechnung auf {totalDisciplineShots} Schuss
              </span>
            )}
          </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {(
              [
                { key: "sleep" as const, label: "Schlaf" },
                { key: "energy" as const, label: "Energie" },
                { key: "stress" as const, label: "Stress" },
                { key: "motivation" as const, label: "Motivation" },
              ] as const
            ).map(({ key, label }) => (
              <div key={key}>
                <p className="mb-2 text-sm font-medium text-muted-foreground">{label}</p>
                <ResponsiveContainer width="100%" height={180}>
                  <ScatterChart margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis
                      dataKey={key}
                      type="number"
                      domain={[0, 10]}
                      label={{ value: label, position: "insideBottom", offset: -2, fontSize: 11 }}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis
                      dataKey="displayScore"
                      type="number"
                      domain={["auto", "auto"]}
                      tick={{ fontSize: 11 }}
                      tickFormatter={(v: number) =>
                        effectiveDisplayMode === "projected" && selectedDiscipline
                          ? formatDisplayValue(v)
                          : v.toFixed(2)
                      }
                    />
                    <Tooltip
                      cursor={{ strokeDasharray: "3 3" }}
                      formatter={(value, name) => [
                        typeof value === "number" && name === "displayScore"
                          ? formatDisplayValue(value)
                          : String(value ?? ""),
                        name === "displayScore" ? wellbeingScoreLabel : label,
                      ]}
                    />
                    <Scatter data={wellbeingDisplayData} fill="var(--chart-1)" opacity={0.7} />
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Schussqualität vs. Serienergebnis — nach Disziplin gefiltert, normalisiert auf Ringe/Sch. */}
      {filteredQuality.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-baseline gap-2">
            Ausführungsqualität vs. Serienergebnis
            {effectiveDisplayMode === "projected" && selectedDiscipline && (
              <span className="text-base font-normal text-muted-foreground">
                Hochrechnung auf {selectedDiscipline.shotsPerSeries} Sch./Serie
              </span>
            )}
          </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <ScatterChart margin={{ top: 5, right: 20, bottom: 15, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="quality"
                  type="number"
                  domain={[0.5, 5.5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tickFormatter={(v) =>
                    ["", "Schlecht", "Mässig", "Mittel", "Gut", "Sehr gut"][v] ?? v
                  }
                  tick={{ fontSize: 10 }}
                  label={{
                    value: "Ausführung",
                    position: "insideBottom",
                    offset: -8,
                    fontSize: 11,
                  }}
                />
                <YAxis
                  dataKey="displayScore"
                  type="number"
                  domain={["auto", "auto"]}
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: number) =>
                    effectiveDisplayMode === "projected" && selectedDiscipline
                      ? formatDisplayValue(v)
                      : v.toFixed(2)
                  }
                />
                <Tooltip
                  formatter={(value, name) => [
                    typeof value === "number" && name === "displayScore"
                      ? formatDisplayValue(value)
                      : String(value ?? ""),
                    name === "displayScore" ? qualityScoreLabel : "Ausführung",
                  ]}
                />
                <Scatter data={qualityDisplayData} fill="var(--chart-2)" opacity={0.7} />
              </ScatterChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Schussverteilung im Zeitverlauf — normalisiert auf Prozent (Einheiten mit Einzelschüssen) */}
      {filteredShotDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-baseline gap-2">
              Schussverteilung im Zeitverlauf
              <span className="text-base font-normal text-muted-foreground">
                Anteil je Ringwert in %
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={filteredShotDistribution}
                margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d: Date) =>
                    new Intl.DateTimeFormat("de-CH", {
                      day: "2-digit",
                      month: "2-digit",
                    }).format(new Date(d))
                  }
                  tick={{ fontSize: 11 }}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                  tick={{ fontSize: 11 }}
                  width={38}
                />
                {/* Custom Tooltip: Payload ist r0→r10 (Stack-Reihenfolge) —
                    umkehren damit r10 oben steht; Buckets mit 0 % ausblenden */}
                <Tooltip
                  content={(props) => {
                    const { active, payload, label } = props as {
                      active?: boolean
                      payload?: Array<{ name: string; value: number; color: string }>
                      label?: unknown
                    }
                    if (!active || !payload || payload.length === 0) return null
                    const date = new Intl.DateTimeFormat("de-CH", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    }).format(new Date(label as Date))
                    // Recharts sortiert Payload alphabetisch (r0, r1, r10, r2 ...) —
                    // numerisch absteigend sortieren damit r10 zuerst steht
                    const items = [...payload]
                      .sort((a, b) => {
                        const nA = parseInt(a.name.replace("r", ""), 10)
                        const nB = parseInt(b.name.replace("r", ""), 10)
                        return nB - nA
                      })
                      .filter((p) => p.value > 0)
                    return (
                      <div
                        style={{
                          background: "white",
                          border: "1px solid #e5e7eb",
                          padding: "8px 12px",
                          borderRadius: 6,
                          fontSize: 12,
                          minWidth: 120,
                        }}
                      >
                        <p style={{ fontWeight: 600, marginBottom: 6 }}>{date}</p>
                        {items.map((p) => (
                          <div
                            key={p.name}
                            style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}
                          >
                            <div
                              style={{
                                width: 8,
                                height: 8,
                                background: p.color,
                                borderRadius: 2,
                                flexShrink: 0,
                              }}
                            />
                            <span style={{ color: "#6b7280" }}>{p.name.replace("r", "")}er</span>
                            <span style={{ marginLeft: "auto", paddingLeft: 16, fontWeight: 500 }}>
                              {p.value.toFixed(1)} %
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  }}
                />
                {/* Custom Legend: Payload umkehren → r10 links, r0 rechts */}
                <Legend
                  content={(props) => {
                    const { payload } = props as {
                      payload?: Array<{ value: string; color: string }>
                    }
                    // Numerisch absteigend sortieren (Recharts liefert alphabetische Reihenfolge)
                    const items = [...(payload ?? [])].sort((a, b) => {
                      const nA = parseInt(a.value.replace("r", ""), 10)
                      const nB = parseInt(b.value.replace("r", ""), 10)
                      return nB - nA
                    })
                    return (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          justifyContent: "center",
                          gap: "4px 12px",
                          paddingTop: 8,
                          fontSize: 11,
                        }}
                      >
                        {items.map((entry) => (
                          <div
                            key={entry.value}
                            style={{ display: "flex", alignItems: "center", gap: 4 }}
                          >
                            <div
                              style={{
                                width: 10,
                                height: 10,
                                background: entry.color,
                                borderRadius: 2,
                                flexShrink: 0,
                              }}
                            />
                            <span>{entry.value.replace("r", "")}er</span>
                          </div>
                        ))}
                      </div>
                    )
                  }}
                />
                {/* Stapelreihenfolge: r0 zuerst (unten) → r10 zuletzt (oben im Stack).
                    Farbschema analog Meyton: 10 rot, 9 gelb, 8–0 Grautöne (8 dunkelst, 0 hellst). */}
                <Area type="monotone" dataKey="r0" stackId="rings" stroke="#edf1f5" fill="#edf1f5" />
                <Area type="monotone" dataKey="r1" stackId="rings" stroke="#dae1e8" fill="#dae1e8" />
                <Area type="monotone" dataKey="r2" stackId="rings" stroke="#c8d1da" fill="#c8d1da" />
                <Area type="monotone" dataKey="r3" stackId="rings" stroke="#b5bec8" fill="#b5bec8" />
                <Area type="monotone" dataKey="r4" stackId="rings" stroke="#9ca3af" fill="#9ca3af" />
                <Area type="monotone" dataKey="r5" stackId="rings" stroke="#8896a0" fill="#8896a0" />
                <Area type="monotone" dataKey="r6" stackId="rings" stroke="#6b7280" fill="#6b7280" />
                <Area type="monotone" dataKey="r7" stackId="rings" stroke="#52606d" fill="#52606d" />
                <Area type="monotone" dataKey="r8" stackId="rings" stroke="#374151" fill="#374151" />
                <Area type="monotone" dataKey="r9" stackId="rings" stroke="#eab308" fill="#eab308" />
                <Area type="monotone" dataKey="r10" stackId="rings" stroke="#ef4444" fill="#ef4444" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
