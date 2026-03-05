"use client"

import { Badge } from "@/components/ui/badge"
import type { GoalWithAssignments } from "@/lib/goals/actions"
import { formatDateOnly, GOAL_TYPE_LABELS } from "@/components/app/goals/goal-card-section/format"

interface Props {
  goal: GoalWithAssignments
  displayTimeZone: string
}

export function GoalSummary({ goal, displayTimeZone }: Props) {
  return (
    <div className="min-w-0 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-base font-semibold">{goal.title}</p>
        <Badge variant="outline">{GOAL_TYPE_LABELS[goal.type] ?? goal.type}</Badge>
      </div>
      <div className="text-sm text-muted-foreground">
        Zeitraum: {formatDateOnly(goal.dateFrom, displayTimeZone)} bis{" "}
        {formatDateOnly(goal.dateTo, displayTimeZone)}
      </div>
      <div className="text-sm text-muted-foreground">
        Einheiten, die auf das Ziel einzahlen: {goal.sessionCount}
      </div>
      {goal.description && <p className="text-sm whitespace-pre-wrap">{goal.description}</p>}
    </div>
  )
}
