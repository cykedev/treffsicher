"use client"

import { useState, useMemo } from "react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
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
import type { StatsSession } from "@/lib/stats/actions"

interface Props {
  sessions: StatsSession[]
}

type TypeFilter = "all" | "TRAINING" | "WETTKAMPF"

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
 * Statistik-Charts-Komponente.
 * Empfängt alle Einheiten und filtert client-seitig — ausreichend für kleine Nutzerzahl.
 */
export function StatistikCharts({ sessions }: Props) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")

  // Gefilterte Sessions
  const filtered = useMemo(() => {
    return sessions.filter((s) => {
      if (typeFilter !== "all" && s.type !== typeFilter) return false
      if (from && new Date(s.date) < new Date(from)) return false
      if (to) {
        const toDate = new Date(to)
        toDate.setHours(23, 59, 59)
        if (new Date(s.date) > toDate) return false
      }
      return true
    })
  }, [sessions, typeFilter, from, to])

  // Sessions mit Ergebnis (für Verlaufschart)
  const withScore = filtered.filter((s) => s.totalScore !== null)

  // Gleitender Durchschnitt über 5 Einheiten
  const scores = withScore.map((s) => s.totalScore as number)
  const movingAvg = calculateMovingAverage(scores, 5)

  // Daten für LineChart
  // i als x-Achsen-Key damit gleiche Daten am selben Tag separate Punkte bleiben.
  // datum nur für Tooltip/Tick-Formatierung.
  const lineData = withScore.map((s, i) => ({
    i,
    datum: new Intl.DateTimeFormat("de-CH", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(s.date)),
    Ergebnis: s.totalScore,
    Trend: movingAvg[i],
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
        <CardContent className="pt-6">
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

            {/* Schnellauswahl */}
            <div className="space-y-2">
              <Label>Zeitraum</Label>
              <div className="flex flex-col gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  onClick={() => {
                    setFrom(daysAgo(28))
                    setTo(today())
                  }}
                >
                  Letzte 4 Wochen
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
                  Letzter Monat
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
                  Alle Einheiten
                </Button>
              </div>
            </div>
          </div>

          <p className="mt-3 text-sm text-muted-foreground">
            {filtered.length} Einheit{filtered.length !== 1 ? "en" : ""} gefunden
            {withScore.length !== filtered.length && ` · ${withScore.length} mit Ergebnis`}
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
              <CardTitle>Ergebnisverlauf</CardTitle>
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
                  {/* domain auto → Y-Achse beginnt nahe am Datumini­mum statt bei 0 */}
                  <YAxis domain={["auto", "auto"]} tick={{ fontSize: 12 }} />
                  <Tooltip labelFormatter={(i) => lineData[i as number]?.datum ?? ""} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="Ergebnis"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="Trend"
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

          {/* Serienstatistik */}
          {barData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Serienwertungen</CardTitle>
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
    </div>
  )
}
