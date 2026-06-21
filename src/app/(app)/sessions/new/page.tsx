import { getAuthSession } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import { getDisciplines, getFavouriteDisciplineId } from "@/lib/disciplines/actions"
import { getGoalsForSelection } from "@/lib/goals/actions"
import { SessionForm } from "@/components/app/session-form/SessionForm"
import { PageHeader } from "@/components/app/shell/PageHeader"

export default async function NewSessionPage() {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  const [disciplines, favouriteDisciplineId, goals] = await Promise.all([
    getDisciplines(),
    getFavouriteDisciplineId(),
    getGoalsForSelection(),
  ])

  // Vorauswahl: Favorit (wenn sichtbar) > einzige verfügbare Disziplin > keine
  const autoSelectId =
    favouriteDisciplineId ?? (disciplines.length === 1 ? disciplines[0].id : undefined)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Neue Einheit"
        description="Training, Wettkampf, Trockentraining oder Mentaltraining erfassen."
      />
      <SessionForm disciplines={disciplines} goals={goals} defaultDisciplineId={autoSelectId} />
    </div>
  )
}
