import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Pencil } from "lucide-react"
import { getAuthSession } from "@/lib/auth-helpers"
import { getShotRoutineById } from "@/lib/shot-routines/actions"
import { ShotRoutineView } from "@/components/app/ShotRoutineView"
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="break-words text-2xl font-bold tracking-tight">{routine.name}</h1>
          <p className="text-muted-foreground">
            Übersicht deines Schuss-Ablaufs in geordneter Reihenfolge.
          </p>
        </div>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button variant="outline" className="w-full sm:w-auto" asChild>
            <Link href="/shot-routines">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Zurück
            </Link>
          </Button>
          <Button className="w-full sm:w-auto" asChild>
            <Link href={`/shot-routines/${id}/edit`}>
              <Pencil className="mr-1.5 h-4 w-4" />
              Bearbeiten
            </Link>
          </Button>
        </div>
      </div>

      <ShotRoutineView steps={steps} createdAt={routine.createdAt} updatedAt={routine.updatedAt} />
    </div>
  )
}
