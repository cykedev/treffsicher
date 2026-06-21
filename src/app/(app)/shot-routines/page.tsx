import { redirect } from "next/navigation"
import Link from "next/link"
import { ListChecks } from "lucide-react"
import { getAuthSession } from "@/lib/auth-helpers"
import { formatDateOnly, getDisplayTimeZone } from "@/lib/dateTime"
import { getShotRoutines } from "@/lib/shot-routines/actions"
import type { RoutineStep } from "@/lib/shot-routines/actions"
import { CreateItemLinkButton } from "@/components/app/sessions/CreateItemLinkButton"
import { PageHeader } from "@/components/app/shell/PageHeader"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"

export default async function ShotRoutinesPage() {
  const displayTimeZone = getDisplayTimeZone()
  const session = await getAuthSession()
  if (!session) redirect("/login")

  const routines = await getShotRoutines()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schuss-Abläufe"
        description="Lege Abläufe mit ihren Schritten an und verfeinere sie laufend."
        action={<CreateItemLinkButton href="/shot-routines/new" label="Neuer Ablauf" />}
      />

      {routines.length === 0 ? (
        <EmptyState
          title="Noch kein Ablauf vorhanden"
          description="Erstelle deinen ersten Schuss-Ablauf."
          icon={ListChecks}
          actionLabel="Neuer Ablauf"
          actionHref="/shot-routines/new"
        />
      ) : (
        <div className="space-y-2">
          {routines.map((r) => {
            const steps: RoutineStep[] = Array.isArray(r.steps) ? (r.steps as RoutineStep[]) : []
            const stepCountText = `${steps.length} ${steps.length === 1 ? "Schritt" : "Schritte"}`
            return (
              // Ganze Karte klickbar statt separatem Detail-Button:
              // das entspricht dem Tagebuch-Flow und reduziert einen unnötigen Extra-Schritt.
              <Link key={r.id} href={`/shot-routines/${r.id}`} className="block">
                <Card className="transition-colors hover:bg-muted/30">
                  <CardContent className="py-4">
                    <div className="min-w-0 space-y-0.5">
                      <p className="break-words font-medium">{r.name}</p>
                      <p className="break-words text-sm text-muted-foreground">
                        {stepCountText} · Zuletzt geändert am{" "}
                        {formatDateOnly(r.updatedAt, displayTimeZone)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
