import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus } from "lucide-react"
import { getAuthSession } from "@/lib/auth-helpers"
import { getShotRoutines } from "@/lib/shot-routines/actions"
import type { RoutineStep } from "@/lib/shot-routines/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date)
}

export default async function ShotRoutinesPage() {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  const routines = await getShotRoutines()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Schuss-Abläufe</h1>
          <p className="text-muted-foreground">
            Definiere und pflege deinen idealen Schuss-Ablauf.
          </p>
        </div>
        <Button asChild className="w-full sm:w-auto">
          <Link href="/shot-routines/new">
            <Plus className="mr-1.5 h-4 w-4" />
            Neuer Ablauf
          </Link>
        </Button>
      </div>

      {routines.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Noch kein Ablauf vorhanden. Erstelle deinen ersten Schuss-Ablauf.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {routines.map((r) => {
            const steps: RoutineStep[] = Array.isArray(r.steps) ? (r.steps as RoutineStep[]) : []
            const stepCountText = `${steps.length} ${steps.length === 1 ? "Schritt" : "Schritte"}`
            return (
              <Card key={r.id}>
                <CardContent className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-0.5">
                    <p className="break-words font-medium">{r.name}</p>
                    <p className="break-words text-sm text-muted-foreground">
                      {stepCountText} · Zuletzt geändert am {formatDate(r.updatedAt)}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild className="w-full sm:w-auto">
                    <Link href={`/shot-routines/${r.id}`}>Anzeigen</Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
