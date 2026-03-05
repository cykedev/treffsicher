import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import {
  Pencil,
  ArrowLeft,
  Download,
  Heart,
  Goal,
  Target,
  Gauge,
  CheckCircle2,
  MessageSquare,
  Paperclip,
} from "lucide-react"
import { getAuthSession } from "@/lib/auth-helpers"
import { getSessionById } from "@/lib/sessions/actions"
import { calculateTotalScore } from "@/lib/sessions/calculateScore"
import { getDisplayTimeZone } from "@/lib/dateTime"
import { SESSION_TYPE_BADGE_CLASS, SESSION_TYPE_LABELS } from "@/lib/sessions/presentation"
import { parseShotsJson } from "@/lib/sessions/shots"
import { AttachmentSection } from "@/components/app/sessions/AttachmentSection"
import { DeleteSessionButton } from "@/components/app/sessions/DeleteSessionButton"
import { FavouriteButton } from "@/components/app/sessions/FavouriteButton"
import { WellbeingSection } from "@/components/app/sessions/WellbeingSection"
import { ReflectionSection } from "@/components/app/sessions/ReflectionSection"
import { PrognosisSection } from "@/components/app/sessions/PrognosisSection"
import { FeedbackSection } from "@/components/app/sessions/FeedbackSection"
import { SessionPrognosisFeedbackComparisonCard } from "@/components/app/sessions/SessionPrognosisFeedbackComparisonCard"
import { SessionSeriesResultCard } from "@/components/app/sessions/SessionSeriesResultCard"
import { ShotHistogram } from "@/components/app/sessions/ShotHistogram"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function formatDate(date: Date, displayTimeZone: string): string {
  return new Intl.DateTimeFormat("de-CH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: displayTimeZone,
  }).format(date)
}

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const displayTimeZone = getDisplayTimeZone()
  const session = await getAuthSession()
  if (!session) redirect("/login")

  const { id } = await params
  const sessionRecord = await getSessionById(id)
  if (!sessionRecord) notFound()

  const totalScore = calculateTotalScore(
    sessionRecord.series.map((s) => ({
      scoreTotal:
        typeof s.scoreTotal === "object" && s.scoreTotal !== null
          ? parseFloat(String(s.scoreTotal))
          : typeof s.scoreTotal === "number"
            ? s.scoreTotal
            : null,
      isPractice: s.isPractice,
    }))
  )

  const hasScoring = sessionRecord.type === "TRAINING" || sessionRecord.type === "WETTKAMPF"
  const isDecimal = sessionRecord.discipline?.scoringType === "TENTH"
  // Prognose und Feedback nur bei TRAINING und WETTKAMPF anzeigen
  const hasPrognosisFeedback = hasScoring

  // Nur Wertungsschüsse für das Histogramm — Probeschüsse sind nicht Teil der Auswertung
  const allShots = sessionRecord.series
    .filter((serie) => !serie.isPractice)
    .flatMap((serie) => parseShotsJson(serie.shots))
  const hasShots = allShots.length > 0

  // Anhänge nur bei TRAINING und WETTKAMPF sinnvoll
  const hasAttachmentSection =
    sessionRecord.type === "TRAINING" || sessionRecord.type === "WETTKAMPF"
  const showShotDistribution = hasScoring && hasShots

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        {/* Badge + Aktionen bewusst in einer eigenen oberen Zeile:
            so bleibt die Icon-Leiste auf Mobil immer oben sichtbar. */}
        <div className="flex items-start justify-between gap-2">
          <Badge variant="outline" className={SESSION_TYPE_BADGE_CLASS[sessionRecord.type] ?? ""}>
            {SESSION_TYPE_LABELS[sessionRecord.type] ?? sessionRecord.type}
          </Badge>
          <div className="flex flex-wrap items-center justify-end gap-0.5 sm:gap-1">
            <FavouriteButton
              sessionId={sessionRecord.id}
              initialFavourite={sessionRecord.isFavourite}
            />
            <Button variant="ghost" size="sm" className="px-2 sm:px-3" asChild>
              <Link
                href={`/sessions/${sessionRecord.id}/export/pdf`}
                target="_blank"
                aria-label="Als PDF exportieren"
              >
                <Download className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">PDF</span>
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/sessions/${sessionRecord.id}/edit`} aria-label="Bearbeiten">
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
            <DeleteSessionButton sessionId={sessionRecord.id} />
            <Button variant="ghost" size="sm" className="px-2 sm:px-3" asChild>
              <Link href="/sessions" aria-label="Zurück zu Einheiten">
                <ArrowLeft className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Zurück</span>
              </Link>
            </Button>
          </div>
        </div>

        <div className="min-w-0 space-y-1.5">
          <h1 className="text-2xl font-bold">{formatDate(sessionRecord.date, displayTimeZone)}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {sessionRecord.discipline && (
              <span className="break-words">{sessionRecord.discipline.name}</span>
            )}
            {sessionRecord.location && (
              <span className="break-words">
                {sessionRecord.discipline ? `· ${sessionRecord.location}` : sessionRecord.location}
              </span>
            )}
          </div>
          {/* Trainingsziel — nur wenn gesetzt und nicht WETTKAMPF (dort: Leistungsziel in Prognose) */}
          {sessionRecord.trainingGoal && (
            <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
              <Target className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{sessionRecord.trainingGoal}</span>
            </div>
          )}
          {sessionRecord.goals.length > 0 && (
            <div className="space-y-1 text-sm text-muted-foreground">
              <div className="flex items-start gap-1.5">
                <Goal className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>Zahlt auf folgende Saisonziele ein:</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pl-0 sm:pl-5">
                {sessionRecord.goals.map((entry) => (
                  <Badge key={entry.goalId} variant="outline" className="text-xs">
                    {entry.goal.title}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Ergebnis + Serien */}
      {hasScoring && sessionRecord.series.length > 0 && (
        <SessionSeriesResultCard
          session={sessionRecord}
          totalScore={totalScore}
          isDecimal={isDecimal}
        />
      )}

      {/* Schussverteilung — nur wenn Einzelschüsse erfasst wurden */}
      {showShotDistribution && (
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
              {sessionRecord.attachments.length > 0 && (
                <span className="text-base font-normal text-muted-foreground">
                  ({sessionRecord.attachments.length})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AttachmentSection
              sessionId={sessionRecord.id}
              attachments={sessionRecord.attachments.map((a) => ({
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
          <WellbeingSection sessionId={sessionRecord.id} initialData={sessionRecord.wellbeing} />
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
            <PrognosisSection sessionId={sessionRecord.id} initialData={sessionRecord.prognosis} />
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
            <FeedbackSection sessionId={sessionRecord.id} initialData={sessionRecord.feedback} />
          </CardContent>
        </Card>
      )}

      {/* Vergleich Prognose vs. Feedback — eigene Card, nur wenn beide erfasst */}
      {hasPrognosisFeedback && sessionRecord.prognosis && sessionRecord.feedback && (
        <SessionPrognosisFeedbackComparisonCard
          prognosis={sessionRecord.prognosis}
          feedback={sessionRecord.feedback}
        />
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
          <ReflectionSection sessionId={sessionRecord.id} initialData={sessionRecord.reflection} />
        </CardContent>
      </Card>
    </div>
  )
}
