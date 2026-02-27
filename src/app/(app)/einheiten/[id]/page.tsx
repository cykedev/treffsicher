import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getAuthSession } from "@/lib/auth-helpers"
import { getSessionById } from "@/lib/sessions/actions"
import { calculateTotalScore } from "@/lib/sessions/calculateScore"
import { AttachmentSection } from "@/components/app/AttachmentSection"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const sessionTypeLabels: Record<string, string> = {
  TRAINING: "Training",
  WETTKAMPF: "Wettkampf",
  TROCKENTRAINING: "Trockentraining",
  MENTAL: "Mentaltraining",
}

const executionQualityLabels: Record<number, string> = {
  1: "Schlecht",
  2: "Mässig",
  3: "Mittel",
  4: "Gut",
  5: "Sehr gut",
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{sessionTypeLabels[einheit.type] ?? einheit.type}</Badge>
            {einheit.discipline && (
              <span className="text-muted-foreground text-sm">{einheit.discipline.name}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold">{formatDate(einheit.date)}</h1>
          {einheit.location && <p className="text-sm text-muted-foreground">{einheit.location}</p>}
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href="/einheiten">Zurück</Link>
        </Button>
      </div>

      <Separator />

      {/* Ergebnis + Serien */}
      {hasScoring && einheit.series.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-baseline justify-between">
              <span>Ergebnis</span>
              <span className="text-3xl font-bold">
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
                    <th className="pb-2 font-medium">Schüsse</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {einheit.series.map((serie, idx) => {
                    const shotsArray = parseShotsJson(serie.shots)
                    const scoreValue =
                      serie.scoreTotal !== null && serie.scoreTotal !== undefined
                        ? parseFloat(String(serie.scoreTotal))
                        : null

                    return (
                      <tr key={serie.id} className={serie.isPractice ? "opacity-60" : ""}>
                        <td className="py-2 pr-4">
                          {serie.isPractice
                            ? `Probe ${idx + 1}`
                            : `Serie ${idx - (einheit.discipline?.practiceSeries ?? 0) + 1}`}
                          {serie.isPractice && (
                            <span className="ml-1 text-xs text-muted-foreground">(P)</span>
                          )}
                        </td>
                        <td className="py-2 pr-4 font-medium">
                          {scoreValue !== null
                            ? isDecimal
                              ? scoreValue.toFixed(1)
                              : scoreValue
                            : "–"}
                        </td>
                        <td className="py-2 pr-4 text-muted-foreground">
                          {serie.executionQuality
                            ? (executionQualityLabels[serie.executionQuality] ??
                              serie.executionQuality)
                            : "–"}
                        </td>
                        <td className="py-2">
                          {shotsArray && shotsArray.length > 0 ? (
                            <span className="font-mono text-xs text-muted-foreground">
                              {shotsArray.join(" · ")}
                            </span>
                          ) : (
                            "–"
                          )}
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

      {/* Anhänge */}
      <Card>
        <CardHeader>
          <CardTitle>
            Anhänge
            {einheit.attachments.length > 0 && (
              <span className="ml-2 text-base font-normal text-muted-foreground">
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
    </div>
  )
}
