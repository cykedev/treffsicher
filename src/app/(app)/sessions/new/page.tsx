import { getAuthSession } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import { getDisciplines, getFavouriteDisciplineId } from "@/lib/disciplines/actions"
import { getGoalsForSelection } from "@/lib/goals/actions"
import { SessionForm } from "@/components/app/SessionForm"

export default async function NewSessionPage() {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  const [disciplines, favouriteDisciplineId, goals] = await Promise.all([
    getDisciplines(),
    getFavouriteDisciplineId(),
    getGoalsForSelection(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Neue Einheit</h1>
        <p className="text-muted-foreground">
          Training, Wettkampf, Trockentraining oder Mentaltraining erfassen.
        </p>
      </div>
      <SessionForm
        disciplines={disciplines}
        goals={goals}
        defaultDisciplineId={favouriteDisciplineId ?? undefined}
      />
    </div>
  )
}
