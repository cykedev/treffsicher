import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus } from "lucide-react"
import { getAuthSession } from "@/lib/auth-helpers"
import { getGoalsWithAssignments, getGoalSessionOptions } from "@/lib/goals/actions"
import { GoalCardSection } from "@/components/app/GoalCardSection"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default async function GoalsPage() {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  const [goals, sessions] = await Promise.all([getGoalsWithAssignments(), getGoalSessionOptions()])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Saisonziele</h1>
          <p className="text-muted-foreground">
            Ziele anlegen, bearbeiten und Einheiten markieren, die auf ein Ziel einzahlen.
          </p>
        </div>
        <Button asChild>
          <Link href="/goals/new">
            <Plus className="mr-1.5 h-4 w-4" />
            Neues Ziel
          </Link>
        </Button>
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
