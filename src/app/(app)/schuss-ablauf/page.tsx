import { redirect } from "next/navigation"
import Link from "next/link"
import { getAuthSession } from "@/lib/auth-helpers"
import { getShotRoutines } from "@/lib/shot-routines/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default async function SchussAblaufPage() {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  const routines = await getShotRoutines()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Schuss-Abläufe</h1>
          <p className="text-muted-foreground">
            Definiere und pflege deinen idealen Schuss-Ablauf.
          </p>
        </div>
        <Button asChild>
          <Link href="/schuss-ablauf/neu">Neuer Ablauf</Link>
        </Button>
      </div>

      {routines.length === 0 ? (
        <p className="text-muted-foreground">
          Noch kein Ablauf vorhanden. Erstelle deinen ersten Schuss-Ablauf.
        </p>
      ) : (
        <div className="space-y-2">
          {routines.map((r) => {
            const steps = Array.isArray(r.steps) ? r.steps : []
            return (
              <Card key={r.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <span className="font-medium">{r.name}</span>
                    <p className="text-sm text-muted-foreground">
                      {steps.length} {steps.length === 1 ? "Schritt" : "Schritte"}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/schuss-ablauf/${r.id}`}>Bearbeiten</Link>
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
