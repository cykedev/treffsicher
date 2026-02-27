import { getAuthSession } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import { DisziplinForm } from "@/components/app/DisziplinForm"

export default async function NeueDisziplinPage() {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Neue Disziplin</h1>
        <p className="text-muted-foreground">Eigene Disziplin mit individuellem Format anlegen.</p>
      </div>
      <DisziplinForm />
    </div>
  )
}
