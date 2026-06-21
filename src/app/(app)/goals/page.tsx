import Link from "next/link"
import { redirect } from "next/navigation"
import { Goal } from "lucide-react"
import { getAuthSession } from "@/lib/auth-helpers"
import { formatDateOnly, getDisplayTimeZone } from "@/lib/dateTime"
import { getGoalsWithAssignments } from "@/lib/goals/actions"
import { CreateItemLinkButton } from "@/components/app/sessions/CreateItemLinkButton"
import { PageHeader } from "@/components/app/shell/PageHeader"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { EmptyState } from "@/components/ui/empty-state"

const goalTypeLabels: Record<string, string> = {
  RESULT: "Ergebnisziel",
  PROCESS: "Prozessziel",
}

export default async function GoalsPage() {
  const displayTimeZone = getDisplayTimeZone()
  const session = await getAuthSession()
  if (!session) redirect("/login")

  const goals = await getGoalsWithAssignments()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Saisonziele"
        description="Lege Ziele an und öffne sie für Bearbeiten, Zuweisen und Löschen."
        action={<CreateItemLinkButton href="/goals/new" label="Neues Ziel" />}
      />

      {goals.length === 0 ? (
        <EmptyState
          title="Noch keine Saisonziele vorhanden"
          description="Lege dein erstes Ziel an."
          icon={Goal}
          actionLabel="Neues Ziel"
          actionHref="/goals/new"
        />
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
                    Zeitraum: {formatDateOnly(new Date(goal.dateFrom), displayTimeZone)} bis{" "}
                    {formatDateOnly(new Date(goal.dateTo), displayTimeZone)}
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
