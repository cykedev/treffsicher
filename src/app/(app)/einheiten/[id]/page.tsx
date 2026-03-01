import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { Pencil, ArrowLeft, Heart, Gauge, CheckCircle2, MessageSquare, Paperclip } from "lucide-react"
import { getAuthSession } from "@/lib/auth-helpers"
import { getSessionById } from "@/lib/sessions/actions"
import { calculateTotalScore } from "@/lib/sessions/calculateScore"
import { AttachmentSection } from "@/components/app/AttachmentSection"
import { DeleteSessionButton } from "@/components/app/DeleteSessionButton"
import { WellbeingSection } from "@/components/app/WellbeingSection"
import { ReflectionSection } from "@/components/app/ReflectionSection"
import { PrognosisSection } from "@/components/app/PrognosisSection"
import { FeedbackSection } from "@/components/app/FeedbackSection"
import { ShotHistogram } from "@/components/app/ShotHistogram"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Farbige Badges je Einheitentyp — gleiche Konstante wie im Tagebuch
const typeBadgeClass: Record<string, string> = {
  TRAINING:        "border-blue-800   bg-blue-950   text-blue-300",
  WETTKAMPF:       "border-amber-800  bg-amber-950  text-amber-300",
  TROCKENTRAINING: "border-emerald-800 bg-emerald-950 text-emerald-300",
  MENTAL:          "border-purple-800  bg-purple-950  text-purple-300",
}

const sessionTypeLabels: Record<string, string> = {
  TRAINING: "Training",
  WETTKAMPF: "Wettkampf",
  TROCKENTRAINING: "Trockentraining",
  MENTAL: "Mentaltraining",
}

// Ausführungsqualität als 5 Kreise — immer gerendert für konstante Spaltenbreite.
// Gefüllte Kreise: bg-primary (hell im Dark Mode).
// Leere Slots: subtil (bg-muted/40) damit Abstufung sichtbar bleibt.
// quality=null → alle 5 Kreise leer (konsistente Breite, kein Sprung im Layout).
function QualityDots({ quality }: { quality: number | null }) {
  const q = quality ?? 0
  const labels = ["", "Schlecht", "Mässig", "Mittel", "Gut", "Sehr gut"]
  return (
    <span
      className="flex items-center gap-1"
      title={quality ? (labels[quality] ?? String(quality)) : undefined}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={`inline-block h-2 w-2 rounded-full transition-colors ${
            i < q ? "bg-primary" : "bg-muted/40"
          }`}
        />
      ))}
    </span>
  )
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("de-CH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

// Prisma gibt shots als JsonValue zurück — wir casten es zu string[]
function parseShotsJson(shots: unknown): string[] | null {
  if (!Array.isArray(shots)) return null
  return shots.filter((s): s is string => typeof s === "string")
}

// Dimensionen für den Prognose-/Feedback-Vergleich
const comparisonDimensions = [
  { key: "fitness", label: "Kondition" },
  { key: "nutrition", label: "Ernährung" },
  { key: "technique", label: "Technik" },
  { key: "tactics", label: "Taktik" },
  { key: "mentalStrength", label: "Mentale Stärke" },
  { key: "environment", label: "Umfeld" },
  { key: "equipment", label: "Material" },
] as const

export default async function EinheitDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  const { id } = await params
  const einheit = await getSessionById(id)
  if (!einheit) notFound()

  const totalScore = calculateTotalScore(
    einheit.series.map((s) => ({
      scoreTotal:
        typeof s.scoreTotal === "object" && s.scoreTotal !== null
          ? parseFloat(String(s.scoreTotal))
          : typeof s.scoreTotal === "number"
            ? s.scoreTotal
            : null,
      isPractice: s.isPractice,
    }))
  )

  const hasScoring = einheit.type === "TRAINING" || einheit.type === "WETTKAMPF"
  const isDecimal = einheit.discipline?.scoringType === "TENTH"
  // Prognose und Feedback nur bei TRAINING und WETTKAMPF anzeigen
  const hasPrognosisFeedback = hasScoring

  // Serien für die Anzeige sortiert: Probeschüsse zuerst, dann Wertungsserien.
  // Relative Reihenfolge innerhalb jeder Gruppe bleibt erhalten.
  const sortedSeries = [...einheit.series].sort((a, b) => {
    if (a.isPractice === b.isPractice) return 0
    return a.isPractice ? -1 : 1
  })

  // Nur Wertungsschüsse für das Histogramm — Probeschüsse sind nicht Teil der Auswertung
  const allShots = einheit.series
    .filter((serie) => !serie.isPractice)
    .flatMap((serie) => parseShotsJson(serie.shots) ?? [])
  const hasShots = allShots.length > 0

  // Schüsse-Spalte nur anzeigen wenn mindestens eine Serie Einzelschüsse enthält —
  // verhindert Layout-Unterschiede zwischen Einheiten mit und ohne Einzelschuss-Erfassung
  const hasAnyShots = einheit.series.some((serie) => {
    const shots = parseShotsJson(serie.shots)
    return shots !== null && shots.length > 0
  })

  // Anhänge nur bei TRAINING und WETTKAMPF sinnvoll
  const hasAttachmentSection = einheit.type === "TRAINING" || einheit.type === "WETTKAMPF"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <Badge
            variant="outline"
            className={typeBadgeClass[einheit.type] ?? ""}
          >
            {sessionTypeLabels[einheit.type] ?? einheit.type}
          </Badge>
          <h1 className="text-2xl font-bold">{formatDate(einheit.date)}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {einheit.discipline && <span>{einheit.discipline.name}</span>}
            {einheit.discipline && einheit.location && <span>·</span>}
            {einheit.location && <span>{einheit.location}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/einheiten/${einheit.id}/bearbeiten`} aria-label="Bearbeiten">
              <Pencil className="h-4 w-4" />
            </Link>
          </Button>
          <DeleteSessionButton sessionId={einheit.id} />
          <Button variant="ghost" size="sm" asChild>
            <Link href="/einheiten">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Zurück
            </Link>
          </Button>
        </div>
      </div>

      <Separator />

      {/* Ergebnis + Serien */}
      {hasScoring && einheit.series.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-baseline justify-between">
              <span>Ergebnis</span>
              <span className="text-3xl font-bold tabular-nums">
                {isDecimal ? totalScore.toFixed(1) : totalScore}
                <span className="ml-1 text-base font-normal text-muted-foreground">Ringe</span>
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Serie</th>
                    <th className="pb-2 pr-4 font-medium">Ringe</th>
                    <th className="pb-2 pr-4 font-medium">Ausführung</th>
                    {hasAnyShots && <th className="pb-2 font-medium">Schüsse</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {sortedSeries.map((serie, idx) => {
                    const shotsArray = parseShotsJson(serie.shots)
                    const scoreValue =
                      serie.scoreTotal !== null && serie.scoreTotal !== undefined
                        ? parseFloat(String(serie.scoreTotal))
                        : null

                    // Laufende Nummerierung je Serientyp — unabhängig von der Position
                    const practicesBefore = sortedSeries.slice(0, idx).filter((s) => s.isPractice).length
                    const regularsBefore = idx - practicesBefore
                    const seriesLabel = serie.isPractice
                      ? `Probe ${practicesBefore + 1}`
                      : `Serie ${regularsBefore + 1}`

                    return (
                      <tr
                        key={serie.id}
                        className={serie.isPractice ? "text-muted-foreground/40" : ""}
                      >
                        <td className="py-2 pr-4">
                          {seriesLabel}
                          {serie.isPractice && (
                            <span className="ml-1 text-xs">(P)</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 font-medium tabular-nums">
                          {scoreValue !== null
                            ? isDecimal
                              ? scoreValue.toFixed(1)
                              : scoreValue
                            : "–"}
                        </td>
                        <td className="py-2 pr-4">
                          {/* Immer 5 Kreise — gleiche Breite in jeder Zeile */}
                          <QualityDots quality={serie.executionQuality ?? null} />
                        </td>
                        {hasAnyShots && (
                          <td className="py-2">
                            {shotsArray && shotsArray.length > 0 ? (
                              // whitespace-nowrap: Schüsse bleiben in einer Zeile;
                              // die Tabelle hat overflow-x-auto — kein Umbruch nötig
                              <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                                {shotsArray.join(" · ")}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">–</span>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Schussverteilung — nur wenn Einzelschüsse erfasst wurden */}
      {hasScoring && hasShots && (
        <Card>
          <CardHeader>
            <CardTitle>Schussverteilung</CardTitle>
          </CardHeader>
          <CardContent>
            <ShotHistogram shots={allShots} isDecimal={isDecimal} />
          </CardContent>
        </Card>
      )}

      {/* Anhänge — nur bei TRAINING und WETTKAMPF sinnvoll */}
      {hasAttachmentSection && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              Anhänge
              {einheit.attachments.length > 0 && (
                <span className="text-base font-normal text-muted-foreground">
                  ({einheit.attachments.length})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AttachmentSection
              sessionId={einheit.id}
              attachments={einheit.attachments.map((a) => ({
                id: a.id,
                filePath: a.filePath,
                fileType: a.fileType,
                originalName: a.originalName,
                label: a.label,
              }))}
            />
          </CardContent>
        </Card>
      )}

      {/* Befinden — immer anzeigen (bei allen Einheitentypen sinnvoll) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-muted-foreground" />
            Befinden
          </CardTitle>
        </CardHeader>
        <CardContent>
          <WellbeingSection sessionId={einheit.id} initialData={einheit.wellbeing} />
        </CardContent>
      </Card>

      {/* Prognose — nur bei Training und Wettkampf */}
      {hasPrognosisFeedback && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              Prognose
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PrognosisSection sessionId={einheit.id} initialData={einheit.prognosis} />
          </CardContent>
        </Card>
      )}

      {/* Feedback — nur bei Training und Wettkampf */}
      {hasPrognosisFeedback && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              Feedback
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FeedbackSection sessionId={einheit.id} initialData={einheit.feedback} />
          </CardContent>
        </Card>
      )}

      {/* Vergleich Prognose vs. Feedback — eigene Card, nur wenn beide erfasst */}
      {hasPrognosisFeedback && einheit.prognosis && einheit.feedback && (
        <Card>
          <CardHeader>
            <CardTitle>Vergleich Prognose vs. Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Dimension</th>
                    <th className="pb-2 pr-4 font-medium">Prognose</th>
                    <th className="pb-2 pr-4 font-medium">Tatsächlich</th>
                    <th className="pb-2 font-medium">Differenz</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {comparisonDimensions.map(({ key, label }) => {
                    const prog = einheit.prognosis![key]
                    const feed = einheit.feedback![key]
                    const diff = feed - prog
                    return (
                      <tr key={key}>
                        <td className="py-1.5 pr-4">{label}</td>
                        <td className="py-1.5 pr-4 tabular-nums">{prog}</td>
                        <td className="py-1.5 pr-4 tabular-nums">{feed}</td>
                        <td
                          className={`py-1.5 font-medium tabular-nums ${
                            diff > 0
                              ? "text-emerald-400"
                              : diff < 0
                                ? "text-destructive"
                                : "text-muted-foreground"
                          }`}
                        >
                          {diff > 0 ? `+${diff}` : diff}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reflexion — immer anzeigen */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            Reflexion
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReflectionSection sessionId={einheit.id} initialData={einheit.reflection} />
        </CardContent>
      </Card>
    </div>
  )
}
