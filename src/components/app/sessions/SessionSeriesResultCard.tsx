import type { SessionDetail } from "@/lib/sessions/actions"
import { parseShotsJson } from "@/lib/sessions/shots"
import { HitLocationVisualization } from "@/components/app/sessions/HitLocationVisualization"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Props {
  session: SessionDetail
  totalScore: number
  isDecimal: boolean
}

interface SeriesRow {
  id: string
  isPractice: boolean
  seriesLabel: string
  scoreValue: number | null
  executionQuality: number | null
  shotsArray: string[]
}

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

function toSeriesScoreValue(scoreTotal: unknown): number | null {
  if (scoreTotal === null || scoreTotal === undefined) return null
  const value = parseFloat(String(scoreTotal))
  return Number.isFinite(value) ? value : null
}

function buildSeriesRows(session: SessionDetail): { rows: SeriesRow[]; hasAnyShots: boolean } {
  const sortedSeries = [...session.series].sort((a, b) => {
    if (a.isPractice === b.isPractice) return 0
    return a.isPractice ? -1 : 1
  })

  const rows = sortedSeries.map((serie, idx) => {
    const shotsArray = parseShotsJson(serie.shots)
    const practicesBefore = sortedSeries.slice(0, idx).filter((entry) => entry.isPractice).length
    const regularsBefore = idx - practicesBefore
    // Labels folgen der UI-Logik aus dem Editor, damit "Probe 1" und "Serie 1" überall gleich bedeuten.
    const seriesLabel = serie.isPractice
      ? `Probe ${practicesBefore + 1}`
      : `Serie ${regularsBefore + 1}`

    return {
      id: serie.id,
      isPractice: serie.isPractice,
      seriesLabel,
      scoreValue: toSeriesScoreValue(serie.scoreTotal),
      executionQuality: serie.executionQuality ?? null,
      shotsArray,
    }
  })

  return {
    rows,
    hasAnyShots: rows.some((row) => row.shotsArray.length > 0),
  }
}

export function SessionSeriesResultCard({ session, totalScore, isDecimal }: Props) {
  const { rows, hasAnyShots } = buildSeriesRows(session)

  const hasHitLocation =
    session.hitLocationHorizontalMm !== null &&
    session.hitLocationHorizontalDirection !== null &&
    session.hitLocationVerticalMm !== null &&
    session.hitLocationVerticalDirection !== null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <span>Ergebnis</span>
          <span className="text-3xl font-bold tabular-nums">
            {isDecimal ? totalScore.toFixed(1) : totalScore}
            <span className="ml-1 text-base font-normal text-muted-foreground">Ringe</span>
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 md:hidden">
          {rows.map((row) => (
            <div
              key={row.id}
              className={`space-y-2 rounded-lg border border-border/50 p-3 ${
                row.isPractice ? "text-muted-foreground/80" : ""
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium">
                  {row.seriesLabel}
                  {row.isPractice && <span className="ml-1 text-xs">(P)</span>}
                </p>
                <p className="text-sm font-semibold tabular-nums">
                  {row.scoreValue !== null
                    ? isDecimal
                      ? row.scoreValue.toFixed(1)
                      : row.scoreValue
                    : "–"}
                </p>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground">Ausführung</span>
                <QualityDots quality={row.executionQuality} />
              </div>
              {hasAnyShots && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Schüsse</p>
                  {row.shotsArray.length > 0 ? (
                    <p className="break-words font-mono text-xs text-muted-foreground">
                      {row.shotsArray.join(" · ")}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">–</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-[740px] w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Serie</th>
                <th className="pb-2 pr-4 font-medium">Ringe</th>
                <th className="pb-2 pr-4 font-medium">Ausführung</th>
                {hasAnyShots && <th className="pb-2 font-medium">Schüsse</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {rows.map((row) => (
                <tr key={row.id} className={row.isPractice ? "text-muted-foreground/40" : ""}>
                  <td className="py-2 pr-4">
                    {row.seriesLabel}
                    {row.isPractice && <span className="ml-1 text-xs">(P)</span>}
                  </td>
                  <td className="py-2 pr-4 font-medium tabular-nums">
                    {row.scoreValue !== null
                      ? isDecimal
                        ? row.scoreValue.toFixed(1)
                        : row.scoreValue
                      : "–"}
                  </td>
                  <td className="py-2 pr-4">
                    <QualityDots quality={row.executionQuality} />
                  </td>
                  {hasAnyShots && (
                    <td className="py-2">
                      {row.shotsArray.length > 0 ? (
                        <span className="whitespace-nowrap font-mono text-xs text-muted-foreground">
                          {row.shotsArray.join(" · ")}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">–</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {hasHitLocation && (
          <div className="mt-5 border-t border-border/40 pt-4">
            <HitLocationVisualization
              horizontalMm={session.hitLocationHorizontalMm}
              horizontalDirection={session.hitLocationHorizontalDirection}
              verticalMm={session.hitLocationVerticalMm}
              verticalDirection={session.hitLocationVerticalDirection}
            />
          </div>
        )}
      </CardContent>
    </Card>
  )
}
