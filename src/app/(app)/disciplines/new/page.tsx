import { getAuthSession } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import { DisciplineForm } from "@/components/app/DisciplineForm"

export default async function NewDisciplinePage() {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  const isAdmin = session.user.role === "ADMIN"

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {isAdmin ? "Neue Disziplin anlegen" : "Neue Disziplin"}
        </h1>
        <p className="text-muted-foreground">
          {isAdmin
            ? "Als Admin kannst du System-Disziplinen fuer alle oder eigene Disziplinen anlegen."
            : "Eigene Disziplin mit individuellem Format anlegen."}
        </p>
      </div>
      <DisciplineForm canCreateSystem={isAdmin} />
    </div>
  )
}
