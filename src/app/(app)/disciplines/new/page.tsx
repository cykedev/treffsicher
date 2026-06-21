import { getAuthSession } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import { DisciplineForm } from "@/components/app/disciplines/DisciplineForm"
import { PageHeader } from "@/components/app/shell/PageHeader"

export default async function NewDisciplinePage() {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  const isAdmin = session.user.role === "ADMIN"

  return (
    <div className="space-y-6">
      <PageHeader
        title={isAdmin ? "Neue Disziplin anlegen" : "Neue Disziplin"}
        description={
          isAdmin
            ? "Als Admin kannst du System-Disziplinen für alle oder eigene Disziplinen anlegen."
            : "Eigene Disziplin mit individuellem Format anlegen."
        }
      />
      <DisciplineForm canCreateSystem={isAdmin} />
    </div>
  )
}
