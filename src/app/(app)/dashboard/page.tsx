import { getAuthSession } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Dashboard-Seite: Einstiegspunkt nach dem Login.
// Zeigt in Phase 1 eine einfache Willkommensnachricht.
// Phase 2 ergänzt: letzte Einheiten, Schnellstatistik, Trend.
export default async function DashboardPage() {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Willkommen, {session.user.email}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Neue Einheit</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">
              Training, Wettkampf oder Trockentraining erfassen.
            </p>
            <Button asChild>
              <Link href="/einheiten/neu">Einheit erfassen</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tagebuch</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-muted-foreground">Alle bisherigen Einheiten ansehen.</p>
            <Button variant="outline" asChild>
              <Link href="/einheiten">Zum Tagebuch</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
