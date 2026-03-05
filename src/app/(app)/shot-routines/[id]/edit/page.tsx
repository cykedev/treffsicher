import { notFound, redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth-helpers"
import { getShotRoutineById } from "@/lib/shot-routines/actions"
import { ShotRoutineEditor } from "@/components/app/shot-routines/ShotRoutineEditor"
import type { RoutineStep } from "@/lib/shot-routines/actions"

export default async function EditShotRoutinePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  const { id } = await params
  const routine = await getShotRoutineById(id)

  if (!routine) notFound()

  const steps: RoutineStep[] = Array.isArray(routine.steps) ? (routine.steps as RoutineStep[]) : []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Schuss-Ablauf bearbeiten</h1>
        <p className="text-muted-foreground">Schritte anpassen, umordnen oder neue hinzufügen.</p>
      </div>
      <ShotRoutineEditor initialName={routine.name} initialSteps={steps} routineId={id} />
    </div>
  )
}
