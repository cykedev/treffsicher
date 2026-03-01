import { getAuthSession } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus } from "lucide-react"
import { getSessions } from "@/lib/sessions/actions"
import { calculateTotalScore } from "@/lib/sessions/calculateScore"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

// Farbige Badges je Einheitentyp (dark-mode-optimiert)
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

// Formatiert ein Datum als lokale deutsche Datumsdarstellung
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

export default async function EinheitenPage() {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  const sessions = await getSessions()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tagebuch</h1>
          <p className="text-muted-foreground">
            {sessions.length === 0
              ? "Noch keine Einheiten erfasst."
              : `${sessions.length} Einheit${sessions.length !== 1 ? "en" : ""}`}
          </p>
        </div>
        <Button asChild>
          <Link href="/einheiten/neu">
            <Plus className="mr-1.5 h-4 w-4" />
            Neue Einheit
          </Link>
        </Button>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Noch keine Einheiten vorhanden. Starte mit der ersten Einheit.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sessions.map((s) => {
            const totalScore = calculateTotalScore(
              s.series.map((series: { scoreTotal: unknown; isPractice: boolean }) => ({
                scoreTotal: series.scoreTotal !== null ? Number(series.scoreTotal) : null,
                isPractice: series.isPractice,
              }))
            )
            const hasSeries = s.series.length > 0
            const scoringType = s.discipline?.scoringType
            const shotsPerSeries = s.discipline?.shotsPerSeries ?? 0

            // Wertungsserien × Schuss/Serie (Näherung, ohne Probeschüsse)
            const scoringSeriesCount = s.series.filter(
              (serie) => !serie.isPractice && serie.scoreTotal !== null
            ).length
            const approxShots = scoringSeriesCount > 0 && shotsPerSeries
              ? scoringSeriesCount * shotsPerSeries
              : 0

            // Probeschuss-Serien × Schuss/Serie
            const practiceSeriesCount = s.series.filter(
              (serie) => serie.isPractice && serie.scoreTotal !== null
            ).length
            const approxPracticeShots = practiceSeriesCount > 0 && shotsPerSeries
              ? practiceSeriesCount * shotsPerSeries
              : 0

            // Einzelschüsse erfasst wenn mindestens eine Serie ein nicht-leeres shots-Array hat
            const hasIndividualShots = s.series.some(
              (serie) => Array.isArray(serie.shots) && (serie.shots as unknown[]).length > 0
            )

            // Mentale Felder die gepflegt wurden
            const filledMental = [
              s.wellbeing && "Befinden",
              s.prognosis && "Prognose",
              s.feedback && "Feedback",
              s.reflection && "Reflexion",
              hasIndividualShots && "Einzelschüsse",
            ].filter((x): x is string => Boolean(x))

            return (
              // Ganzer Card ist klickbar — führt zur Detailansicht
              <Link key={s.id} href={`/einheiten/${s.id}`} className="block">
                <Card className="transition-colors hover:bg-muted/30">
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant="outline"
                          className={typeBadgeClass[s.type] ?? ""}
                        >
                          {sessionTypeLabels[s.type] ?? s.type}
                        </Badge>
                        {s.discipline && (
                          <span className="text-sm text-muted-foreground">
                            {s.discipline.name}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(s.date)}
                        {s.location && (
                          <span className="text-muted-foreground/60"> · {s.location}</span>
                        )}
                      </p>
                      {/* Mentale Indikatoren als kleine Badges */}
                      {filledMental.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {filledMental.map((label) => (
                            <Badge
                              key={label}
                              variant="outline"
                              className="h-4 px-1 py-0 text-[9px] leading-none text-muted-foreground/60 border-muted-foreground/20"
                            >
                              {label}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Gesamtergebnis rechts */}
                    {hasSeries && totalScore > 0 && (
                      <div className="ml-4 shrink-0 text-right">
                        <span className="text-xl font-bold tabular-nums">
                          {scoringType === "TENTH" ? totalScore.toFixed(1) : totalScore}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {approxShots > 0
                            ? `Ringe · ${approxShots} Sch.${approxPracticeShots > 0 ? ` + ${approxPracticeShots} Probe` : ""}`
                            : "Ringe"}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
