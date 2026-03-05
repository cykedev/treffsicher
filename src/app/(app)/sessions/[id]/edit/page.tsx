import { notFound, redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth-helpers"
import { getSessionById } from "@/lib/sessions/actions"
import { getDisciplines } from "@/lib/disciplines/actions"
import { getGoalsForSelection } from "@/lib/goals/actions"
import { SessionForm } from "@/components/app/session-form/SessionForm"

export default async function EditSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  const { id } = await params
  const [sessionRecord, disciplines, goals] = await Promise.all([
    getSessionById(id),
    getDisciplines(),
    getGoalsForSelection(),
  ])

  if (!sessionRecord) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Einheit bearbeiten</h1>
        <p className="text-muted-foreground">Typ, Datum, Serien und weitere Angaben anpassen.</p>
      </div>
      <SessionForm
        disciplines={disciplines}
        goals={goals}
        initialData={sessionRecord}
        sessionId={id}
      />
    </div>
  )
}
