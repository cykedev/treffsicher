import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth-helpers"
import { ShotRoutineEditor } from "@/components/app/shot-routines/ShotRoutineEditor"
import { PageHeader } from "@/components/app/shell/PageHeader"

export default async function NeuerShotRoutinesPage() {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  return (
    <div className="space-y-6">
      <PageHeader
        title="Neuer Schuss-Ablauf"
        description="Beschreibe die Schritte deines idealen Schuss-Ablaufs."
      />
      <ShotRoutineEditor />
    </div>
  )
}
