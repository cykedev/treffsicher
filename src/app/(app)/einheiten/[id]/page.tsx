import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { getAuthSession } from "@/lib/auth-helpers"
import { getSessionById } from "@/lib/sessions/actions"
import { calculateTotalScore } from "@/lib/sessions/calculateScore"
import { AttachmentSection } from "@/components/app/AttachmentSection"
import { DeleteSessionButton } from "@/components/app/DeleteSessionButton"
import { WellbeingSection } from "@/components/app/WellbeingSection"
import { ReflectionSection } from "@/components/app/ReflectionSection"
import { PrognosisSection } from "@/components/app/PrognosisSection"
import { FeedbackSection } from "@/components/app/FeedbackSection"
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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/einheiten/${einheit.id}/bearbeiten`}>Bearbeiten</Link>
          </Button>
          <DeleteSessionButton sessionId={einheit.id} />
          <Button variant="outline" size="sm" asChild>
            <Link href="/einheiten">Zurück</Link>
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

      {/* Befinden — immer anzeigen (bei allen Einheitentypen sinnvoll) */}
      <Card>
        <CardHeader>
          <CardTitle>Befinden</CardTitle>
        </CardHeader>
        <CardContent>
          <WellbeingSection sessionId={einheit.id} initialData={einheit.wellbeing} />
        </CardContent>
      </Card>

      {/* Prognose — nur bei Training und Wettkampf */}
      {hasPrognosisFeedback && (
        <Card>
          <CardHeader>
            <CardTitle>Prognose</CardTitle>
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
            <CardTitle>Feedback</CardTitle>
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
                <tbody className="divide-y">
                  {comparisonDimensions.map(({ key, label }) => {
                    const prog = einheit.prognosis![key]
                    const feed = einheit.feedback![key]
                    const diff = feed - prog
                    return (
                      <tr key={key}>
                        <td className="py-1.5 pr-4">{label}</td>
                        <td className="py-1.5 pr-4">{prog}</td>
                        <td className="py-1.5 pr-4">{feed}</td>
                        <td
                          className={`py-1.5 font-medium ${
                            diff > 0
                              ? "text-green-600"
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
          <CardTitle>Reflexion</CardTitle>
        </CardHeader>
        <CardContent>
          <ReflectionSection sessionId={einheit.id} initialData={einheit.reflection} />
        </CardContent>
      </Card>
    </div>
  )
}
