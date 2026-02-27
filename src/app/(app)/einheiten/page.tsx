import { getAuthSession } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getSessions } from "@/lib/sessions/actions"
import { calculateTotalScore } from "@/lib/sessions/calculateScore"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

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
          <Link href="/einheiten/neu">Neue Einheit</Link>
        </Button>
      </div>

      {sessions.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
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

            return (
              // Ganzer Card ist klickbar — führt zur Detailansicht
              <Link key={s.id} href={`/einheiten/${s.id}`} className="block">
                <Card className="transition-colors hover:bg-muted/50">
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{sessionTypeLabels[s.type] ?? s.type}</span>
                        {s.discipline && (
                          <span className="text-sm text-muted-foreground">
                            — {s.discipline.name}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(s.date)}
                        {s.location && ` · ${s.location}`}
                      </p>
                    </div>

                    {/* Gesamtergebnis rechts */}
                    {hasSeries && totalScore > 0 && (
                      <div className="text-right">
                        <span className="text-lg font-bold">
                          {scoringType === "TENTH" ? totalScore.toFixed(1) : totalScore}
                        </span>
                        <p className="text-xs text-muted-foreground">Ringe gesamt</p>
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
