import Link from "next/link"
import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth-helpers"
import { getGoalsWithAssignments } from "@/lib/goals/actions"
import { CreateItemLinkButton } from "@/components/app/CreateItemLinkButton"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

const goalTypeLabels: Record<string, string> = {
  RESULT: "Ergebnisziel",
  PROCESS: "Prozessziel",
}

function formatDateOnly(date: Date): string {
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(date))
}

export default async function GoalsPage() {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  const goals = await getGoalsWithAssignments()

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Saisonziele</h1>
          <p className="text-muted-foreground">
            Lege Ziele an und öffne sie für Bearbeiten, Zuweisen und Löschen.
          </p>
        </div>
        <CreateItemLinkButton href="/goals/new" label="Neues Ziel" />
      </div>

      {goals.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Noch keine Saisonziele vorhanden.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => (
            // Ganze Karte klickbar wie in den anderen Übersichtslisten.
            // So bleibt der Flow konsistent: Liste -> Detail -> Aktionen.
            <Link key={goal.id} href={`/goals/${goal.id}`} className="block">
              <Card className="transition-colors hover:bg-muted/30">
                <CardContent className="space-y-2 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="break-words font-medium">{goal.title}</p>
                    <Badge variant="outline">{goalTypeLabels[goal.type] ?? goal.type}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Zeitraum: {formatDateOnly(goal.dateFrom)} bis {formatDateOnly(goal.dateTo)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Einheiten, die auf das Ziel einzahlen: {goal.sessionCount}
                  </p>
                  {goal.description && (
                    <p className="break-words text-sm text-muted-foreground">{goal.description}</p>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
