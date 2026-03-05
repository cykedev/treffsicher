import Link from "next/link"
import { Heart, Target } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { SessionWithDiscipline } from "@/lib/sessions/actions"
import { buildSessionListItemModel } from "@/components/app/sessions/list/sessionListItemModel"

interface SessionResultProps {
  result: NonNullable<ReturnType<typeof buildSessionListItemModel>["result"]>
  mobile: boolean
}

function SessionResult({ result, mobile }: SessionResultProps) {
  const scoreBlockClass = result.isPracticeOnly ? "text-muted-foreground/70" : ""
  const scoreValueClass = result.isPracticeOnly ? "text-muted-foreground" : ""
  const scoreMetaClass = result.isPracticeOnly
    ? "text-[11px] leading-tight text-muted-foreground/70"
    : "text-[11px] leading-tight text-muted-foreground/80"
  const shotCountClass = result.isPracticeOnly
    ? "text-xs text-muted-foreground/80"
    : "text-xs text-muted-foreground"
  const wrapperClass = mobile
    ? `shrink-0 text-right sm:hidden ${scoreBlockClass}`
    : `hidden text-right sm:ml-4 sm:block sm:shrink-0 ${scoreBlockClass}`

  return (
    <div className={wrapperClass}>
      <span className={`text-xl font-bold tabular-nums ${scoreValueClass}`}>
        {result.formattedScore}
        {/* Probe-only Kennzeichnung direkt am Wert spart zusätzlichen Erklärtext in der Liste. */}
        {result.isPracticeOnly && <span className="ml-1 text-sm font-semibold">(P)</span>}
      </span>
      {result.formattedMaxScore && <p className={scoreMetaClass}>von {result.formattedMaxScore}</p>}
      <p className={shotCountClass}>{result.shotsLabel}</p>
    </div>
  )
}

interface Props {
  session: SessionWithDiscipline
  displayTimeZone: string
}

// Karte konsumiert nur ein fertiges View-Model, damit Renderlogik und Berechnung sauber getrennt bleiben.
export function SessionListItemCard({ session, displayTimeZone }: Props) {
  const model = buildSessionListItemModel(session, displayTimeZone)

  return (
    <Link href={`/sessions/${model.id}`} className="block">
      <Card className="transition-colors hover:bg-muted/30">
        <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  {model.isFavourite && (
                    <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500 shrink-0" />
                  )}
                  <Badge variant="outline" className={model.typeBadgeClass}>
                    {model.typeLabel}
                  </Badge>
                  {model.disciplineName && (
                    <span className="break-words text-sm text-muted-foreground">
                      {model.disciplineName}
                    </span>
                  )}
                </div>
              </div>

              {model.result && <SessionResult result={model.result} mobile={true} />}
            </div>

            <p className="break-words text-sm text-muted-foreground">
              {model.formattedDate}
              {model.location && (
                <span className="text-muted-foreground/60"> · {model.location}</span>
              )}
            </p>
            {model.trainingGoal && (
              <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                <Target className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="break-words">{model.trainingGoal}</span>
              </div>
            )}

            {model.mentalLabels.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {model.mentalLabels.map((label) => (
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

          {model.result && <SessionResult result={model.result} mobile={false} />}
        </CardContent>
      </Card>
    </Link>
  )
}
