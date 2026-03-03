import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth-helpers"
import { getGoalsWithAssignments, getGoalSessionOptions } from "@/lib/goals/actions"
import { GoalCardSection } from "@/components/app/GoalCardSection"
import { CreateItemLinkButton } from "@/components/app/CreateItemLinkButton"
import { Card, CardContent } from "@/components/ui/card"

export default async function GoalsPage() {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  const [goals, sessions] = await Promise.all([getGoalsWithAssignments(), getGoalSessionOptions()])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Saisonziele</h1>
          <p className="text-muted-foreground">
            Lege Ziele an, passe sie an und markiere Einheiten, die darauf einzahlen.
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
            <Card key={goal.id}>
              <CardContent className="space-y-4">
                <GoalCardSection goal={goal} sessions={sessions} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
