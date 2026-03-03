import { notFound, redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth-helpers"
import { getDisplayTimeZone } from "@/lib/dateTime"
import { getGoalById, getGoalSessionOptions } from "@/lib/goals/actions"
import { GoalCardSection } from "@/components/app/GoalCardSection"

export default async function GoalDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const displayTimeZone = getDisplayTimeZone()
  const session = await getAuthSession()
  if (!session) redirect("/login")

  const { id } = await params
  const [goal, sessions] = await Promise.all([getGoalById(id), getGoalSessionOptions()])
  if (!goal) notFound()

  return (
    <div className="space-y-6">
      <GoalCardSection
        goal={goal}
        sessions={sessions}
        backHref="/goals"
        displayTimeZone={displayTimeZone}
      />
    </div>
  )
}
