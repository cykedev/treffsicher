import { notFound, redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth-helpers"
import { getDisciplineById } from "@/lib/disciplines/actions"
import { DisciplineForm } from "@/components/app/disciplines/DisciplineForm"
import { PageHeader } from "@/components/app/shell/PageHeader"

export default async function EditDisciplinePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  const { id } = await params
  const discipline = await getDisciplineById(id)

  if (!discipline) notFound()

  return (
    <div className="space-y-6">
      <PageHeader
        title={discipline.isSystem ? "System-Disziplin bearbeiten" : "Disziplin bearbeiten"}
        description={
          discipline.isSystem
            ? "Diese Standard-Disziplin gilt für alle Nutzer."
            : "Name, Serien und Schusszahl anpassen."
        }
      />
      <DisciplineForm initialData={discipline} disciplineId={id} />
    </div>
  )
}
