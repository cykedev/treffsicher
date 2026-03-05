import { Goal, Target } from "lucide-react"
import { SESSION_TYPE_BADGE_CLASS, SESSION_TYPE_LABELS } from "@/lib/sessions/presentation"
import type { SessionDetail } from "@/lib/sessions/actions"
import { Badge } from "@/components/ui/badge"
import { SessionDetailHeaderActions } from "@/components/app/sessions/detail/SessionDetailHeaderActions"

interface Props {
  session: SessionDetail
  displayTimeZone: string
}

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

export function SessionDetailHeader({ session, displayTimeZone }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <Badge variant="outline" className={SESSION_TYPE_BADGE_CLASS[session.type] ?? ""}>
          {SESSION_TYPE_LABELS[session.type] ?? session.type}
        </Badge>
        <SessionDetailHeaderActions sessionId={session.id} isFavourite={session.isFavourite} />
      </div>

      <div className="min-w-0 space-y-1.5">
        <h1 className="text-2xl font-bold">{formatDate(session.date, displayTimeZone)}</h1>

        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          {session.discipline && <span className="break-words">{session.discipline.name}</span>}
          {session.location && (
            <span className="break-words">
              {session.discipline ? `· ${session.location}` : session.location}
            </span>
          )}
        </div>

        {session.trainingGoal && (
          <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
            <Target className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{session.trainingGoal}</span>
          </div>
        )}

        {session.goals.length > 0 && (
          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex items-start gap-1.5">
              <Goal className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Zahlt auf folgende Saisonziele ein:</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pl-0 sm:pl-5">
              {session.goals.map((entry) => (
                <Badge key={entry.goalId} variant="outline" className="text-xs">
                  {entry.goal.title}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
