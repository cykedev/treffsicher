import { notFound, redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth-helpers"
import { getDisciplineById } from "@/lib/disciplines/actions"
import { DisziplinForm } from "@/components/app/DisziplinForm"

export default async function DisziplinBearbeitenPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  const { id } = await params
  const discipline = await getDisciplineById(id)

  if (!discipline) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {discipline.isSystem ? "System-Disziplin bearbeiten" : "Disziplin bearbeiten"}
        </h1>
        <p className="text-muted-foreground">
          {discipline.isSystem
            ? "Diese Standard-Disziplin gilt für alle Nutzer."
            : "Name, Serien und Schusszahl anpassen."}
        </p>
      </div>
      <DisziplinForm initialData={discipline} disciplineId={id} />
    </div>
  )
}
