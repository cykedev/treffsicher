import { SelectableRow } from "@/components/ui/selectable-row"
import { Label } from "@/components/ui/label"
import type { GoalForSelection } from "@/lib/goals/actions"

interface Model {
  goals: GoalForSelection[]
  selectedGoalIds: string[]
  pending: boolean
}

interface Actions {
  toggleGoal: (goalId: string) => void
}

interface Props {
  model: Model
  actions: Actions
}

// Zielauswahl ist absichtlich optional und entkoppelt von Session-Validierung, damit Erfassen nicht blockiert wird.
export function SessionGoalsSection({ model, actions }: Props) {
  const { goals, selectedGoalIds, pending } = model

  if (goals.length === 0) return null

  return (
    <div className="space-y-3">
      <Label>Saisonziele (optional)</Label>
      <p className="text-xs text-muted-foreground">
        Markiere, auf welche Saisonziele diese Einheit einzahlt.
      </p>
      <div className="overflow-hidden rounded-lg border border-border/60 bg-muted/10">
        {goals.map((goal, index) => {
          const selected = selectedGoalIds.includes(goal.id)
          return (
            <SelectableRow
              key={goal.id}
              selected={selected}
              onToggle={() => actions.toggleGoal(goal.id)}
              disabled={pending}
              className={
                index > 0 ? "w-full rounded-none border-t border-border/40" : "w-full rounded-none"
              }
            >
              <span className="font-medium">{goal.title}</span>
              <span className="text-muted-foreground">
                {" "}
                · {goal.type === "RESULT" ? "Ergebnisziel" : "Prozessziel"}
              </span>
            </SelectableRow>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {selectedGoalIds.length === 0
          ? "Kein Ziel ausgewählt"
          : `${selectedGoalIds.length} Ziel${selectedGoalIds.length === 1 ? "" : "e"} ausgewählt`}
      </p>
      {selectedGoalIds.map((goalId) => (
        <input key={goalId} type="hidden" name="goalIds" value={goalId} />
      ))}
    </div>
  )
}
