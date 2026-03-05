import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Pencil } from "lucide-react"
import { getAuthSession } from "@/lib/auth-helpers"
import { getShotRoutineById } from "@/lib/shot-routines/actions"
import { ShotRoutineView } from "@/components/app/shot-routines/ShotRoutineView"
import { DeleteShotRoutineButton } from "@/components/app/shot-routines/DeleteShotRoutineButton"
import type { RoutineStep } from "@/lib/shot-routines/actions"
import { Button } from "@/components/ui/button"

export default async function ShotRoutineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  const { id } = await params
  const routine = await getShotRoutineById(id)

  if (!routine) notFound()

  // steps aus Json-Feld in typisiertes Array umwandeln
  const steps: RoutineStep[] = Array.isArray(routine.steps) ? (routine.steps as RoutineStep[]) : []

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-start justify-end">
          <div className="flex w-full flex-wrap items-center justify-end gap-0.5 sm:w-auto sm:shrink-0 sm:gap-1">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/shot-routines/${id}/edit`} aria-label="Ablauf bearbeiten">
                <Pencil className="h-4 w-4" />
              </Link>
            </Button>
            <DeleteShotRoutineButton routineId={id} />
            <Button variant="ghost" size="sm" className="px-2 sm:px-3" asChild>
              <Link href="/shot-routines" aria-label="Zurück zu Abläufen">
                <ArrowLeft className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Zurück</span>
              </Link>
            </Button>
          </div>
        </div>
        <div className="space-y-1">
          <h1 className="break-words text-2xl font-bold tracking-tight">{routine.name}</h1>
        </div>
      </div>

      <ShotRoutineView steps={steps} createdAt={routine.createdAt} updatedAt={routine.updatedAt} />
    </div>
  )
}
