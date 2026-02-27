import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth-helpers"
import { ShotRoutineEditor } from "@/components/app/ShotRoutineEditor"

export default async function NeuerSchussAblaufPage() {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Neuer Schuss-Ablauf</h1>
        <p className="text-muted-foreground">
          Beschreibe die Schritte deines idealen Schuss-Ablaufs.
        </p>
      </div>
      <ShotRoutineEditor />
    </div>
  )
}
