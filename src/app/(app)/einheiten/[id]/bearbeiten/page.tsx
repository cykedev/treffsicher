import { notFound, redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth-helpers"
import { getSessionById } from "@/lib/sessions/actions"
import { getDisciplines } from "@/lib/disciplines/actions"
import { getGoalsForSelection } from "@/lib/goals/actions"
import { EinheitForm } from "@/components/app/EinheitForm"

export default async function EinheitBearbeitenPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  const { id } = await params
  const [einheit, disciplines, goals] = await Promise.all([
    getSessionById(id),
    getDisciplines(),
    getGoalsForSelection(),
  ])

  if (!einheit) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Einheit bearbeiten</h1>
        <p className="text-muted-foreground">Typ, Datum, Serien und weitere Angaben anpassen.</p>
      </div>
      <EinheitForm disciplines={disciplines} goals={goals} initialData={einheit} sessionId={id} />
    </div>
  )
}
