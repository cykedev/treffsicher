import { getAuthSession } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import { getDisciplines, getFavouriteDisciplineId } from "@/lib/disciplines/actions"
import { getGoalsForSelection } from "@/lib/goals/actions"
import { EinheitForm } from "@/components/app/EinheitForm"

export default async function NeueEinheitPage() {
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
      <EinheitForm
        disciplines={disciplines}
        goals={goals}
        defaultDisciplineId={favouriteDisciplineId ?? undefined}
      />
    </div>
  )
}
