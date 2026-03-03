import { getAuthSession } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Heart, Target } from "lucide-react"
import { getSessions } from "@/lib/sessions/actions"
import { calculateTotalScore } from "@/lib/sessions/calculateScore"
import { getSeriesMax, type ScoringType } from "@/lib/sessions/validation"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { SessionsFilters } from "@/components/app/SessionsFilters"
import { CreateItemLinkButton } from "@/components/app/CreateItemLinkButton"

// Farbige Badges je Einheitentyp (dark-mode-optimiert)
const typeBadgeClass: Record<string, string> = {
  TRAINING: "border-blue-800   bg-blue-950   text-blue-300",
  WETTKAMPF: "border-amber-800  bg-amber-950  text-amber-300",
  TROCKENTRAINING: "border-emerald-800 bg-emerald-950 text-emerald-300",
  MENTAL: "border-purple-800  bg-purple-950  text-purple-300",
}

const sessionTypeLabels: Record<string, string> = {
  TRAINING: "Training",
  WETTKAMPF: "Wettkampf",
  TROCKENTRAINING: "Trockentraining",
  MENTAL: "Mentaltraining",
}

type SessionsSearchParams = Promise<{
  type?: string | string[]
  discipline?: string | string[]
}>

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

function readSearchParam(value: string | string[] | undefined): string {
  if (typeof value === "string") return value
  if (Array.isArray(value)) return value[0] ?? ""
  return ""
}

function formatSessionCount(count: number): string {
  return `${count} Einheit${count !== 1 ? "en" : ""}`
}

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: SessionsSearchParams
}) {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  const resolvedSearchParams = await searchParams
  const sessions = await getSessions()
  const typeOptions = Object.entries(sessionTypeLabels).map(([value, label]) => ({ value, label }))
  const availableTypes = typeOptions.map((option) => option.value)

  const disciplineMap = new Map<string, string>()
  for (const s of sessions) {
    if (s.discipline) {
      disciplineMap.set(s.discipline.id, s.discipline.name)
    }
  }
  const availableDisciplines = Array.from(disciplineMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"))

  const rawTypeFilter = readSearchParam(resolvedSearchParams.type)
  const rawDisciplineFilter = readSearchParam(resolvedSearchParams.discipline)
  const selectedType = availableTypes.includes(rawTypeFilter) ? rawTypeFilter : "all"
  const selectedDiscipline = availableDisciplines.some((d) => d.id === rawDisciplineFilter)
    ? rawDisciplineFilter
    : "all"
  const hasActiveFilters = selectedType !== "all" || selectedDiscipline !== "all"

  const filteredSessions = sessions.filter((s) => {
    if (selectedType !== "all" && s.type !== selectedType) return false
    if (selectedDiscipline !== "all" && s.disciplineId !== selectedDiscipline) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tagebuch</h1>
          <p className="text-muted-foreground">
            {sessions.length === 0
              ? "Noch keine Einheiten erfasst."
              : hasActiveFilters
                ? `${formatSessionCount(filteredSessions.length)} von ${formatSessionCount(sessions.length)}`
                : formatSessionCount(sessions.length)}
          </p>
        </div>
        <CreateItemLinkButton href="/sessions/new" label="Neue Einheit" />
      </div>

      {sessions.length > 0 && (
        <SessionsFilters
          typeOptions={typeOptions}
          disciplineOptions={availableDisciplines}
          selectedType={selectedType}
          selectedDiscipline={selectedDiscipline}
        />
      )}

      {filteredSessions.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {sessions.length === 0
              ? "Noch keine Einheiten vorhanden. Starte mit der ersten Einheit."
              : "Keine Einheiten für die gewählten Filter."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredSessions.map((s) => {
            const normalizedSeries = s.series.map((series: { scoreTotal: unknown; isPractice: boolean; shots: unknown }) => ({
              scoreTotal: series.scoreTotal !== null ? Number(series.scoreTotal) : null,
              isPractice: series.isPractice,
              shots: series.shots,
            }))
            const totalScore = calculateTotalScore(
              normalizedSeries.map((series) => ({
                scoreTotal: series.scoreTotal,
                isPractice: series.isPractice,
              }))
            )
            const hasSeries = s.series.length > 0
            const scoringType = s.discipline?.scoringType as ScoringType | undefined
            const shotsPerSeries = s.discipline?.shotsPerSeries ?? 0

            const getSeriesShotCount = (serie: { shots: unknown }): number => {
              if (Array.isArray(serie.shots) && serie.shots.length > 0) {
                return serie.shots.length
              }
              return shotsPerSeries
            }

            // Schussanzahl dynamisch: echte Einzelschüsse wenn vorhanden, sonst Disziplin-Standard
            const scoringSeries = normalizedSeries.filter(
              (serie) => !serie.isPractice && serie.scoreTotal !== null
            )
            const totalScoringShots = scoringSeries.reduce(
              (sum, serie) => sum + getSeriesShotCount(serie),
              0
            )

            const practiceSeries = normalizedSeries.filter(
              (serie) => serie.isPractice && serie.scoreTotal !== null
            )
            const totalPracticeShots = practiceSeries.reduce(
              (sum, serie) => sum + getSeriesShotCount(serie),
              0
            )
            const totalPracticeScore = practiceSeries.reduce(
              (sum, serie) => sum + (serie.scoreTotal ?? 0),
              0
            )

            const hasScoringResult = totalScore > 0
            const hasPracticeOnlyResult = scoringSeries.length === 0 && practiceSeries.length > 0
            const shouldShowResult = hasSeries && (hasScoringResult || hasPracticeOnlyResult)

            const displayScore = hasPracticeOnlyResult ? totalPracticeScore : totalScore
            const displayShots = hasPracticeOnlyResult ? totalPracticeShots : totalScoringShots
            const displayMaxScore =
              scoringType && displayShots > 0
                ? getSeriesMax(scoringType, displayShots)
                : 0
            const formattedDisplayScore =
              scoringType === "TENTH" ? displayScore.toFixed(1) : String(displayScore)
            const formattedDisplayMaxScore =
              scoringType === "TENTH" ? displayMaxScore.toFixed(1) : String(displayMaxScore)
            const displayShotsLabel = hasPracticeOnlyResult
              ? `${totalPracticeShots} Sch.`
              : totalScoringShots > 0
                ? `${totalScoringShots} Sch.${totalPracticeShots > 0 ? ` + ${totalPracticeShots} Probe` : ""}`
                : ""
            const scoreBlockClass = hasPracticeOnlyResult ? "text-muted-foreground/70" : ""
            const scoreValueClass = hasPracticeOnlyResult ? "text-muted-foreground" : ""
            const scoreMetaClass = hasPracticeOnlyResult
              ? "text-[11px] leading-tight text-muted-foreground/70"
              : "text-[11px] leading-tight text-muted-foreground/80"
            const shotCountClass = hasPracticeOnlyResult
              ? "text-xs text-muted-foreground/80"
              : "text-xs text-muted-foreground"

            // Einzelschüsse erfasst wenn mindestens eine Serie ein nicht-leeres shots-Array hat
            const hasIndividualShots = s.series.some(
              (serie) => Array.isArray(serie.shots) && (serie.shots as unknown[]).length > 0
            )
            const hasHitLocation =
              s.hitLocationHorizontalMm !== null &&
              s.hitLocationHorizontalDirection !== null &&
              s.hitLocationVerticalMm !== null &&
              s.hitLocationVerticalDirection !== null

            // Mentale Felder die gepflegt wurden
            const filledMental = [
              s.wellbeing && "Befinden",
              s.prognosis && "Prognose",
              s.feedback && "Feedback",
              s.reflection && "Reflexion",
              hasIndividualShots && "Einzelschüsse",
              hasHitLocation && "Trefferlage",
            ].filter((x): x is string => Boolean(x))

            return (
              // Ganzer Card ist klickbar — führt zur Detailansicht
              <Link key={s.id} href={`/sessions/${s.id}`} className="block">
                <Card className="transition-colors hover:bg-muted/30">
                  <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {s.isFavourite && (
                              <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500 shrink-0" />
                            )}
                            <Badge variant="outline" className={typeBadgeClass[s.type] ?? ""}>
                              {sessionTypeLabels[s.type] ?? s.type}
                            </Badge>
                            {s.discipline && (
                              <span className="break-words text-sm text-muted-foreground">
                                {s.discipline.name}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Gesamtergebnis rechts (mobile oben) */}
                        {shouldShowResult && (
                          <div className={`shrink-0 text-right sm:hidden ${scoreBlockClass}`}>
                            <span className={`text-xl font-bold tabular-nums ${scoreValueClass}`}>
                              {formattedDisplayScore}
                              {hasPracticeOnlyResult && (
                                <span className="ml-1 text-sm font-semibold">(P)</span>
                              )}
                            </span>
                            {displayMaxScore > 0 && (
                              <p className={scoreMetaClass}>
                                von {formattedDisplayMaxScore}
                              </p>
                            )}
                            <p className={shotCountClass}>{displayShotsLabel}</p>
                          </div>
                        )}
                      </div>

                      <p className="break-words text-sm text-muted-foreground">
                        {formatDate(s.date)}
                        {s.location && (
                          <span className="text-muted-foreground/60"> · {s.location}</span>
                        )}
                      </p>
                      {s.trainingGoal && (
                        <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                          <Target className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                          <span className="break-words">{s.trainingGoal}</span>
                        </div>
                      )}

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

                    {/* Gesamtergebnis rechts (desktop) */}
                    {shouldShowResult && (
                      <div className={`hidden text-right sm:ml-4 sm:block sm:shrink-0 ${scoreBlockClass}`}>
                        <span className={`text-xl font-bold tabular-nums ${scoreValueClass}`}>
                          {formattedDisplayScore}
                          {hasPracticeOnlyResult && (
                            <span className="ml-1 text-sm font-semibold">(P)</span>
                          )}
                        </span>
                        {displayMaxScore > 0 && (
                          <p className={scoreMetaClass}>
                            von {formattedDisplayMaxScore}
                          </p>
                        )}
                        <p className={shotCountClass}>{displayShotsLabel}</p>
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
