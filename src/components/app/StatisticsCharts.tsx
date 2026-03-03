"use client"

import { useState, useMemo } from "react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  AreaChart,
  Area,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import type {
  StatsSession,
  DisciplineForStats,
  WellbeingCorrelationPoint,
  QualityVsScorePoint,
  ShotDistributionPoint,
  RadarComparisonSession,
} from "@/lib/stats/actions"

interface Props {
  sessions: StatsSession[]
  wellbeingData: WellbeingCorrelationPoint[]
  qualityData: QualityVsScorePoint[]
  shotDistributionData: ShotDistributionPoint[]
  radarData: RadarComparisonSession[]
}

type TypeFilter = "all" | "TRAINING" | "WETTKAMPF"
type DisplayMode = "per_shot" | "projected"
type RadarSeriesKey = "prognosis" | "feedback"
type RadarLegendItem = {
  key: RadarSeriesKey
  label: string
  color: string
}

const radarDimensions = [
  { label: "Kondition", prognosisKey: "fitnessPrognosis", feedbackKey: "fitnessFeedback" },
  { label: "Ernährung", prognosisKey: "nutritionPrognosis", feedbackKey: "nutritionFeedback" },
  { label: "Technik", prognosisKey: "techniquePrognosis", feedbackKey: "techniqueFeedback" },
  { label: "Taktik", prognosisKey: "tacticsPrognosis", feedbackKey: "tacticsFeedback" },
  {
    label: "Mentale Stärke",
    prognosisKey: "mentalStrengthPrognosis",
    feedbackKey: "mentalStrengthFeedback",
  },
  { label: "Umfeld", prognosisKey: "environmentPrognosis", feedbackKey: "environmentFeedback" },
  { label: "Material", prognosisKey: "equipmentPrognosis", feedbackKey: "equipmentFeedback" },
] as const

const radarSeriesConfig: Record<RadarSeriesKey, { label: string; color: string }> = {
  prognosis: { label: "Prognose", color: "var(--chart-1)" },
  feedback: { label: "Feedback", color: "var(--chart-2)" },
}

const shotDistributionColors: Record<string, string> = {
  r0: "#edf1f5",
  r1: "#dae1e8",
  r2: "#c8d1da",
  r3: "#b5bec8",
  r4: "#9ca3af",
  r5: "#8896a0",
  r6: "#6b7280",
  r7: "#52606d",
  r8: "#374151",
  r9: "#eab308",
  r10: "#ef4444",
}

function niceNumber(value: number, round: boolean): number {
  if (!Number.isFinite(value) || value <= 0) return 1

  const exponent = Math.floor(Math.log10(value))
  const fraction = value / 10 ** exponent

  let niceFraction: number
  if (round) {
    if (fraction < 1.5) niceFraction = 1
    else if (fraction < 3) niceFraction = 2
    else if (fraction < 7) niceFraction = 5
    else niceFraction = 10
  } else {
    if (fraction <= 1) niceFraction = 1
    else if (fraction <= 2) niceFraction = 2
    else if (fraction <= 5) niceFraction = 5
    else niceFraction = 10
  }

  return niceFraction * 10 ** exponent
}

function computeStableAxis(
  values: number[],
  targetTickCount = 5
): { domain: [number, number]; ticks: number[] } {
  if (values.length === 0) {
    return { domain: [0, 1], ticks: [0, 0.25, 0.5, 0.75, 1] }
  }

  let min = Math.min(...values)
  let max = Math.max(...values)

  if (min === max) {
    const padding = Math.max(Math.abs(min) * 0.02, 0.1)
    min -= padding
    max += padding
  } else {
    const range = max - min
    const padding = Math.max(range * 0.08, 0.1)
    min -= padding
    max += padding
  }

  const niceRange = niceNumber(max - min, false)
  const step = niceNumber(niceRange / Math.max(targetTickCount - 1, 1), true)
  const niceMin = Math.floor(min / step) * step
  const niceMax = Math.ceil(max / step) * step

  const ticks: number[] = []
  for (let tick = niceMin; tick <= niceMax + step * 0.5; tick += step) {
    ticks.push(Number(tick.toFixed(6)))
    if (ticks.length >= 12) break
  }

  return {
    domain: [ticks[0] ?? niceMin, ticks[ticks.length - 1] ?? niceMax],
    ticks,
  }
}

// Datumsstring für Presets berechnen
function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function daysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return formatLocalDate(d)
}

function today(): string {
  return formatLocalDate(new Date())
}

function parseDateInput(value: string, endOfDay: boolean): Date | null {
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return null
  return endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0)
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
    return discipline.scoringType === "TENTH" ? Math.round(total * 10) / 10 : Math.round(total)
  }
  return avgPerShot
}

function RadarLegend({ items }: { items: RadarLegendItem[] }) {
  if (items.length === 0) return null

  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
      {items.map((item) => (
        <div key={item.key} className="inline-flex items-center gap-1.5">
          <span
            className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
            style={{ backgroundColor: item.color }}
          />
          <span className="text-sm font-medium">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

/**
 * Statistik-Charts-Komponente.
 * Empfängt alle Einheiten und filtert client-seitig — ausreichend für kleine Nutzerzahl.
 * Zeigt Ringe/Schuss statt absolute Summe — damit sind Einheiten mit unterschiedlicher
 * Schussanzahl direkt vergleichbar. Optional: Hochrechnung auf Disziplin-Gesamtschuss.
 */
export function StatisticsCharts({
  sessions,
  wellbeingData,
  qualityData,
  shotDistributionData,
  radarData,
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
      if (from) {
        const fromDate = parseDateInput(from, false)
        if (fromDate && new Date(s.date) < fromDate) return false
      }
      if (to) {
        const toDate = parseDateInput(to, true)
        if (toDate && new Date(s.date) > toDate) return false
      }
      return true
    })
  }, [sessions, typeFilter, disciplineFilter, from, to])

  // Alle weiteren Charts anhand derselben gefilterten Einheiten einschränken,
  // damit Typ-/Disziplin-/Zeitraum-Filter überall konsistent wirken.
  const filteredSessionIds = useMemo(() => {
    return new Set(filtered.map((s) => s.id))
  }, [filtered])

  // Wellbeing-Daten konsistent zu den aktiven Filtern einschränken
  const filteredWellbeing = useMemo(() => {
    return wellbeingData.filter((p) => filteredSessionIds.has(p.sessionId))
  }, [wellbeingData, filteredSessionIds])

  // Ausführungsqualität-Daten konsistent zu den aktiven Filtern einschränken
  const filteredQuality = useMemo(() => {
    return qualityData.filter((p) => filteredSessionIds.has(p.sessionId))
  }, [qualityData, filteredSessionIds])

  // Schussverteilungs-Daten konsistent zu den aktiven Filtern einschränken
  const filteredShotDistribution = useMemo(() => {
    return shotDistributionData.filter((p) => filteredSessionIds.has(p.sessionId))
  }, [shotDistributionData, filteredSessionIds])

  // Prognose/Feedback-Daten konsistent zu den aktiven Filtern einschränken
  const filteredRadarSessions = useMemo(() => {
    return radarData.filter((p) => filteredSessionIds.has(p.sessionId))
  }, [radarData, filteredSessionIds])

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

  const wellbeingYAxis = useMemo<{ domain: [number, number]; ticks: number[] }>(() => {
    const values = wellbeingDisplayData
      .map((p) => p.displayScore)
      .filter((v): v is number => Number.isFinite(v))
    return computeStableAxis(values)
  }, [wellbeingDisplayData])

  const qualityYAxis = useMemo<{ domain: [number, number]; ticks: number[] }>(() => {
    const values = qualityDisplayData
      .map((p) => p.displayScore)
      .filter((v): v is number => Number.isFinite(v))
    return computeStableAxis(values)
  }, [qualityDisplayData])

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
      return selectedDiscipline.scoringType === "TENTH" ? value.toFixed(1) : String(value)
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
  const seriesValues = useMemo(() => {
    return barData
      .flatMap((s) => [s.Min, s.Avg, s.Max])
      .filter((v): v is number => Number.isFinite(v))
  }, [barData])

  const seriesYAxis = useMemo<{ domain: [number, number]; ticks: number[] }>(() => {
    return computeStableAxis(seriesValues)
  }, [seriesValues])

  const seriesHasDecimals = useMemo(() => {
    return seriesValues.some((v) => Math.abs(v - Math.round(v)) > 1e-6)
  }, [seriesValues])

  const hasData = withScore.length > 0

  const radarChartData = useMemo(() => {
    if (filteredRadarSessions.length === 0) return []
    const count = filteredRadarSessions.length

    return radarDimensions.map((dimension) => {
      const prognosisSum = filteredRadarSessions.reduce(
        (sum, entry) => sum + entry[dimension.prognosisKey],
        0
      )
      const feedbackSum = filteredRadarSessions.reduce(
        (sum, entry) => sum + entry[dimension.feedbackKey],
        0
      )

      return {
        dimension: dimension.label,
        prognosis: Math.round((prognosisSum / count) * 10) / 10,
        feedback: Math.round((feedbackSum / count) * 10) / 10,
      }
    })
  }, [filteredRadarSessions])

  const radarDateLabel = useMemo(() => {
    if (filteredRadarSessions.length === 0) return null
    const first = filteredRadarSessions[0]
    const last = filteredRadarSessions[filteredRadarSessions.length - 1]
    const format = new Intl.DateTimeFormat("de-CH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
    return `${format.format(new Date(first.date))} bis ${format.format(new Date(last.date))}`
  }, [filteredRadarSessions])

  const radarLegendItems = useMemo<RadarLegendItem[]>(() => {
    return (
      Object.entries(radarSeriesConfig) as Array<
        [RadarSeriesKey, (typeof radarSeriesConfig)[RadarSeriesKey]]
      >
    ).map(([key, config]) => {
      return {
        key,
        label: config.label,
        color: config.color,
      }
    })
  }, [])

  const lineChartConfig = useMemo<ChartConfig>(
    () => ({
      wert: { label: metricLabel, color: "var(--chart-1)" },
      trend: { label: "Trend", color: "var(--muted-foreground)" },
    }),
    [metricLabel]
  )

  const seriesChartConfig = useMemo<ChartConfig>(
    () => ({
      Min: { label: "Min", color: "var(--chart-2)" },
      Avg: { label: "Ø", color: "var(--chart-1)" },
      Max: { label: "Max", color: "var(--chart-1)" },
    }),
    []
  )

  const radarChartConfig = useMemo<ChartConfig>(
    () => ({
      prognosis: {
        label: radarSeriesConfig.prognosis.label,
        color: radarSeriesConfig.prognosis.color,
      },
      feedback: {
        label: radarSeriesConfig.feedback.label,
        color: radarSeriesConfig.feedback.color,
      },
    }),
    []
  )

  const wellbeingChartConfig = useMemo<ChartConfig>(
    () => ({
      displayScore: { label: wellbeingScoreLabel, color: "var(--chart-1)" },
      sleep: { label: "Schlaf" },
      energy: { label: "Energie" },
      stress: { label: "Stress" },
      motivation: { label: "Motivation" },
    }),
    [wellbeingScoreLabel]
  )

  const qualityChartConfig = useMemo<ChartConfig>(
    () => ({
      displayScore: { label: qualityScoreLabel, color: "var(--chart-2)" },
      quality: { label: "Ausführung" },
    }),
    [qualityScoreLabel]
  )

  const shotDistributionChartConfig = useMemo<ChartConfig>(
    () => ({
      r0: { label: "0er", color: shotDistributionColors.r0 },
      r1: { label: "1er", color: shotDistributionColors.r1 },
      r2: { label: "2er", color: shotDistributionColors.r2 },
      r3: { label: "3er", color: shotDistributionColors.r3 },
      r4: { label: "4er", color: shotDistributionColors.r4 },
      r5: { label: "5er", color: shotDistributionColors.r5 },
      r6: { label: "6er", color: shotDistributionColors.r6 },
      r7: { label: "7er", color: shotDistributionColors.r7 },
      r8: { label: "8er", color: shotDistributionColors.r8 },
      r9: { label: "9er", color: shotDistributionColors.r9 },
      r10: { label: "10er", color: shotDistributionColors.r10 },
    }),
    []
  )

  return (
    <div className="space-y-6">
      {/* Filter */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          {/* Erste Filterzeile: Typ, Disziplin, Von, Bis */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 [&>*]:min-w-0">
            {/* Typ-Filter */}
            <div className="space-y-2">
              <Label>Einheitentyp</Label>
              <div className="flex gap-1">
                {(["all", "TRAINING", "WETTKAMPF"] as TypeFilter[]).map((t) => (
                  <Button
                    key={t}
                    variant={typeFilter === t ? "default" : "outline"}
                    onClick={() => setTypeFilter(t)}
                    // Höhe bewusst auf h-9 wie Select/Input gesetzt —
                    // so wirken Filter-Controls in einer Zeile einheitlich.
                    className="h-9 flex-1 text-sm"
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
                {/* Mobil bewusst volle Breite, damit der Filterblock ruhig und ausgerichtet wirkt. */}
                <SelectTrigger className="w-full">
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

          {/* Zweite Filterzeile: Zeitraum-Presets + Anzeigemodus — gleiche Grid-Struktur wie Zeile 1 */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Zeitraum</Label>
              <div className="flex flex-wrap gap-1">
                <Button
                  variant="outline"
                  className="h-9 text-sm"
                  onClick={() => {
                    setFrom(daysAgo(28))
                    setTo(today())
                  }}
                >
                  4 Wochen
                </Button>
                <Button
                  variant="outline"
                  className="h-9 text-sm"
                  onClick={() => {
                    setFrom(daysAgo(30))
                    setTo(today())
                  }}
                >
                  Monat
                </Button>
                <Button
                  variant="outline"
                  className="h-9 text-sm"
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
                <div className="flex flex-wrap gap-1">
                  <Button
                    variant={effectiveDisplayMode === "per_shot" ? "default" : "outline"}
                    onClick={() => setDisplayMode("per_shot")}
                    className="h-9 text-sm"
                  >
                    Ringe/Sch.
                  </Button>
                  <Button
                    variant={effectiveDisplayMode === "projected" ? "default" : "outline"}
                    onClick={() => setDisplayMode("projected")}
                    className="h-9 text-sm"
                  >
                    Hochrechnung ({totalDisciplineShots} Sch.)
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {filtered.length} Einheit{filtered.length !== 1 ? "en" : ""} gefunden
              {withScore.length !== filtered.length && ` · ${withScore.length} mit Ergebnis`}
              {selectedDiscipline && ` · ${selectedDiscipline.name}`}
            </p>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="verlauf">
        {/* overflow-x-auto: Tabs scrollen auf kleinen Screens statt zu brechen */}
        <div className="no-scrollbar overflow-x-auto pb-px">
          <TabsList className="mb-2 w-max min-w-full">
            <TabsTrigger value="verlauf" className="shrink-0 flex-none">
              Verlauf
            </TabsTrigger>
            <TabsTrigger value="selbstbild" className="shrink-0 flex-none">
              Selbsteinschätzung
            </TabsTrigger>
            <TabsTrigger value="befinden" className="shrink-0 flex-none">
              Befinden
            </TabsTrigger>
            <TabsTrigger value="qualitaet" className="shrink-0 flex-none">
              Qualität &amp; Schüsse
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab 1: Verlauf — Ergebnisverlauf + Serienwertungen */}
        <TabsContent value="verlauf" className="space-y-4">
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
                  <ChartContainer config={lineChartConfig} className="h-[280px] w-full">
                    <LineChart data={lineData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
                      {/* dataKey="i" statt "datum" — verhindert Kollision wenn zwei Einheiten
                      am selben Tag existieren (gleicher Datumsstring → gleicher x-Slot) */}
                      <XAxis
                        dataKey="i"
                        tickFormatter={(i: number) => lineData[i]?.datum ?? ""}
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={["auto", "auto"]}
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                      />
                      <ChartTooltip
                        content={
                          <ChartTooltipContent
                            indicator="line"
                            labelFormatter={(_label, payload) => {
                              const index = Number(payload?.[0]?.payload?.i)
                              return lineData[index]?.datum ?? ""
                            }}
                            formatter={(value, name) => (
                              <div className="flex w-full items-center justify-between gap-6">
                                <span className="text-muted-foreground">
                                  {name === "wert" ? metricLabel : "Trend"}
                                </span>
                                <span className="text-foreground font-mono font-medium tabular-nums">
                                  {typeof value === "number"
                                    ? formatDisplayValue(value)
                                    : String(value ?? "")}
                                </span>
                              </div>
                            )}
                          />
                        }
                      />
                      <ChartLegend content={<ChartLegendContent />} />
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
                  </ChartContainer>
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
                    <ChartContainer config={seriesChartConfig} className="h-[240px] w-full">
                      <BarChart data={barData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid
                          stroke="var(--border)"
                          strokeOpacity={0.4}
                          vertical={false}
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          domain={seriesYAxis.domain}
                          ticks={seriesYAxis.ticks}
                          tickFormatter={(v: number) =>
                            seriesHasDecimals
                              ? v.toFixed(1).replace(/\.0$/, "")
                              : String(Math.round(v))
                          }
                          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                          axisLine={false}
                          tickLine={false}
                          width={36}
                        />
                        <ChartTooltip
                          // cursor-Rect beim Hover — dunkles Highlight statt hellem Standard
                          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                          content={<ChartTooltipContent indicator="line" />}
                        />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Bar dataKey="Min" fill="var(--chart-2)" opacity={0.5} />
                        <Bar dataKey="Avg" fill="var(--chart-1)" />
                        <Bar dataKey="Max" fill="var(--chart-1)" opacity={0.4} />
                      </BarChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Tab 2: Prognose vs. Feedback in den 7 Dimensionen */}
        <TabsContent value="selbstbild">
          {radarChartData.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-baseline gap-2">
                  Prognose vs. Feedback (7 Dimensionen)
                  <span className="text-base font-normal text-muted-foreground">
                    {filteredRadarSessions.length} Einheit
                    {filteredRadarSessions.length !== 1 ? "en" : ""}
                    {radarDateLabel ? ` · ${radarDateLabel}` : ""}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={radarChartConfig} className="h-[340px] w-full">
                  <RadarChart data={radarChartData} outerRadius="72%">
                    <PolarGrid stroke="var(--border)" strokeOpacity={0.65} />
                    <PolarAngleAxis
                      dataKey="dimension"
                      tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                    />
                    <PolarRadiusAxis
                      domain={[0, 100]}
                      tick={false}
                      axisLine={false}
                      tickLine={false}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value, name) => (
                            <div className="flex w-full items-center justify-between gap-6">
                              <span className="text-muted-foreground">
                                {name === "prognosis"
                                  ? radarSeriesConfig.prognosis.label
                                  : radarSeriesConfig.feedback.label}
                              </span>
                              <span className="text-foreground font-mono font-medium tabular-nums">
                                {typeof value === "number" ? value.toFixed(1) : String(value ?? "")}
                              </span>
                            </div>
                          )}
                        />
                      }
                    />
                    <Radar
                      name="prognosis"
                      dataKey="prognosis"
                      stroke={radarSeriesConfig.prognosis.color}
                      fill={radarSeriesConfig.prognosis.color}
                      strokeWidth={2}
                      fillOpacity={0.2}
                    />
                    <Radar
                      name="feedback"
                      dataKey="feedback"
                      stroke={radarSeriesConfig.feedback.color}
                      fill={radarSeriesConfig.feedback.color}
                      strokeWidth={2}
                      fillOpacity={0.18}
                    />
                  </RadarChart>
                </ChartContainer>
                <RadarLegend items={radarLegendItems} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Keine Prognose-/Feedback-Daten für den gewählten Filter.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 3: Befinden-Korrelation — je Dimension eine eigene Card (2 Spalten auf Desktop) */}
        <TabsContent value="befinden" className="overflow-x-hidden">
          {filteredWellbeing.length > 0 ? (
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              {(
                [
                  { key: "sleep" as const, label: "Schlaf" },
                  { key: "energy" as const, label: "Energie" },
                  { key: "stress" as const, label: "Stress" },
                  { key: "motivation" as const, label: "Motivation" },
                ] as const
              ).map(({ key, label }) => (
                <Card key={key} className="min-w-0 overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-baseline gap-2 text-base">
                      {label}
                      {effectiveDisplayMode === "projected" && selectedDiscipline && (
                        <span className="text-sm font-normal text-muted-foreground">
                          Hochrechnung
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="min-w-0 overflow-x-hidden">
                    <ChartContainer
                      config={wellbeingChartConfig}
                      className="h-[180px] w-full max-w-full overflow-hidden"
                    >
                      <ScatterChart margin={{ top: 5, right: 8, bottom: 16, left: 0 }}>
                        <CartesianGrid
                          stroke="var(--border)"
                          strokeOpacity={0.4}
                          vertical={false}
                        />
                        <XAxis
                          dataKey={key}
                          type="number"
                          domain={[0, 100]}
                          allowDecimals={true}
                          label={{
                            value: label,
                            position: "insideBottom",
                            offset: -8,
                            fontSize: 11,
                            fill: "var(--muted-foreground)",
                          }}
                          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          dataKey="displayScore"
                          type="number"
                          domain={wellbeingYAxis.domain}
                          ticks={wellbeingYAxis.ticks}
                          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                          axisLine={false}
                          tickLine={false}
                          width={34}
                          tickFormatter={(v: number) =>
                            effectiveDisplayMode === "projected" && selectedDiscipline
                              ? formatDisplayValue(v)
                              : v.toFixed(2)
                          }
                        />
                        <ChartTooltip
                          cursor={{ fill: "var(--muted)", opacity: 0.3 }}
                          content={
                            <ChartTooltipContent
                              hideLabel
                              formatter={(value, name) => (
                                <div className="flex w-full items-center justify-between gap-6">
                                  <span className="text-muted-foreground">
                                    {name === "displayScore" ? wellbeingScoreLabel : label}
                                  </span>
                                  <span className="text-foreground font-mono font-medium tabular-nums">
                                    {typeof value === "number" && name === "displayScore"
                                      ? formatDisplayValue(value)
                                      : String(value ?? "")}
                                  </span>
                                </div>
                              )}
                            />
                          }
                        />
                        {/* Punktewolke für kontinuierliche 0–100-Skala */}
                        <Scatter
                          data={wellbeingDisplayData}
                          fill="var(--chart-1)"
                          shape={(props: { cx?: number; cy?: number }) => (
                            <circle
                              cx={props.cx}
                              cy={props.cy}
                              r={5}
                              fill="var(--chart-1)"
                              opacity={0.7}
                            />
                          )}
                        />
                      </ScatterChart>
                    </ChartContainer>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Keine Befinden-Daten für den gewählten Filter.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab 4: Ausführungsqualität + Schussverteilung */}
        <TabsContent value="qualitaet" className="space-y-4">
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
                <ChartContainer config={qualityChartConfig} className="h-[240px] w-full">
                  <ScatterChart margin={{ top: 5, right: 20, bottom: 15, left: 0 }}>
                    <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
                    <XAxis
                      dataKey="quality"
                      type="number"
                      domain={[0.5, 5.5]}
                      ticks={[1, 2, 3, 4, 5]}
                      tickFormatter={(v) =>
                        ["", "Schlecht", "Mässig", "Mittel", "Gut", "Sehr gut"][v] ?? v
                      }
                      tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      label={{
                        value: "Ausführung",
                        position: "insideBottom",
                        offset: -8,
                        fontSize: 11,
                        fill: "var(--muted-foreground)",
                      }}
                    />
                    <YAxis
                      dataKey="displayScore"
                      type="number"
                      domain={qualityYAxis.domain}
                      ticks={qualityYAxis.ticks}
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                      tickFormatter={(v: number) =>
                        effectiveDisplayMode === "projected" && selectedDiscipline
                          ? formatDisplayValue(v)
                          : v.toFixed(2)
                      }
                    />
                    <ChartTooltip
                      cursor={{ fill: "var(--muted)", opacity: 0.3 }}
                      content={
                        <ChartTooltipContent
                          hideLabel
                          formatter={(value, name) => (
                            <div className="flex w-full items-center justify-between gap-6">
                              <span className="text-muted-foreground">
                                {name === "displayScore" ? qualityScoreLabel : "Ausführung"}
                              </span>
                              <span className="text-foreground font-mono font-medium tabular-nums">
                                {typeof value === "number" && name === "displayScore"
                                  ? formatDisplayValue(value)
                                  : String(value ?? "")}
                              </span>
                            </div>
                          )}
                        />
                      }
                    />
                    {/* Größere Punkte: X-Achse hat nur 5 diskrete Werte (Ausführung 1–5) */}
                    <Scatter
                      data={qualityDisplayData}
                      fill="var(--chart-2)"
                      shape={(props: { cx?: number; cy?: number }) => (
                        <circle
                          cx={props.cx}
                          cy={props.cy}
                          r={7}
                          fill="var(--chart-2)"
                          opacity={0.7}
                        />
                      )}
                    />
                  </ScatterChart>
                </ChartContainer>
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
                <ChartContainer config={shotDistributionChartConfig} className="h-[300px] w-full">
                  <AreaChart
                    data={filteredShotDistribution}
                    margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                  >
                    <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(d: Date) =>
                        new Intl.DateTimeFormat("de-CH", {
                          day: "2-digit",
                          month: "2-digit",
                        }).format(new Date(d))
                      }
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickFormatter={(v: number) => `${v}%`}
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      width={38}
                    />
                    {/* Tooltip: r10 zuerst; Buckets mit 0 % ausblenden */}
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          indicator="line"
                          labelFormatter={(_label, payload) => {
                            const dateValue = payload?.[0]?.payload?.date
                            if (!dateValue) return ""
                            return new Intl.DateTimeFormat("de-CH", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            }).format(new Date(dateValue as Date))
                          }}
                          payloadFilter={(item) =>
                            typeof item.value === "number" &&
                            Number.isFinite(item.value) &&
                            item.value > 0
                          }
                          payloadSorter={(a, b) => {
                            const aRing = parseInt(String(a.name).replace("r", ""), 10)
                            const bRing = parseInt(String(b.name).replace("r", ""), 10)
                            return bRing - aRing
                          }}
                          formatter={(value, name) => (
                            <div className="flex w-full items-center justify-between gap-6">
                              <span className="text-muted-foreground">
                                {String(name).replace("r", "")}er
                              </span>
                              <span className="text-foreground font-mono font-medium tabular-nums">
                                {typeof value === "number"
                                  ? `${value.toFixed(1)} %`
                                  : String(value ?? "")}
                              </span>
                            </div>
                          )}
                        />
                      }
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
                              color: "var(--muted-foreground)",
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
                    <Area
                      type="monotone"
                      dataKey="r0"
                      stackId="rings"
                      stroke={shotDistributionColors.r0}
                      fill={shotDistributionColors.r0}
                    />
                    <Area
                      type="monotone"
                      dataKey="r1"
                      stackId="rings"
                      stroke={shotDistributionColors.r1}
                      fill={shotDistributionColors.r1}
                    />
                    <Area
                      type="monotone"
                      dataKey="r2"
                      stackId="rings"
                      stroke={shotDistributionColors.r2}
                      fill={shotDistributionColors.r2}
                    />
                    <Area
                      type="monotone"
                      dataKey="r3"
                      stackId="rings"
                      stroke={shotDistributionColors.r3}
                      fill={shotDistributionColors.r3}
                    />
                    <Area
                      type="monotone"
                      dataKey="r4"
                      stackId="rings"
                      stroke={shotDistributionColors.r4}
                      fill={shotDistributionColors.r4}
                    />
                    <Area
                      type="monotone"
                      dataKey="r5"
                      stackId="rings"
                      stroke={shotDistributionColors.r5}
                      fill={shotDistributionColors.r5}
                    />
                    <Area
                      type="monotone"
                      dataKey="r6"
                      stackId="rings"
                      stroke={shotDistributionColors.r6}
                      fill={shotDistributionColors.r6}
                    />
                    <Area
                      type="monotone"
                      dataKey="r7"
                      stackId="rings"
                      stroke={shotDistributionColors.r7}
                      fill={shotDistributionColors.r7}
                    />
                    <Area
                      type="monotone"
                      dataKey="r8"
                      stackId="rings"
                      stroke={shotDistributionColors.r8}
                      fill={shotDistributionColors.r8}
                    />
                    <Area
                      type="monotone"
                      dataKey="r9"
                      stackId="rings"
                      stroke={shotDistributionColors.r9}
                      fill={shotDistributionColors.r9}
                    />
                    <Area
                      type="monotone"
                      dataKey="r10"
                      stackId="rings"
                      stroke={shotDistributionColors.r10}
                      fill={shotDistributionColors.r10}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
