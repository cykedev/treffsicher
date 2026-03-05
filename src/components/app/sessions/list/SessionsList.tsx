import type { SessionWithDiscipline } from "@/lib/sessions/actions"
import { SessionListItemCard } from "@/components/app/sessions/list/SessionListItemCard"

interface Props {
  sessions: SessionWithDiscipline[]
  displayTimeZone: string
}

export function SessionsList({ sessions, displayTimeZone }: Props) {
  return (
    <div className="space-y-2">
      {sessions.map((session) => (
        <SessionListItemCard key={session.id} session={session} displayTimeZone={displayTimeZone} />
      ))}
    </div>
  )
}
