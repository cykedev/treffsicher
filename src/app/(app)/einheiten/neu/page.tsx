import { getAuthSession } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import { getDisciplines } from "@/lib/disciplines/actions"
import { EinheitForm } from "@/components/app/EinheitForm"

export default async function NeueEinheitPage() {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  const disciplines = await getDisciplines()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Neue Einheit</h1>
        <p className="text-muted-foreground">
          Training, Wettkampf, Trockentraining oder Mentaltraining erfassen.
        </p>
      </div>
      <EinheitForm disciplines={disciplines} />
    </div>
  )
}
