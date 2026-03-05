import { useCallback, useState } from "react"
import type { SessionDetail } from "@/lib/sessions/actions"

interface Params {
  initialData?: SessionDetail
}

export function useSessionGoalSelectionState({ initialData }: Params): {
  selectedGoalIds: string[]
  toggleGoal: (goalId: string) => void
} {
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>(() =>
    initialData ? initialData.goals.map((entry) => entry.goalId) : []
  )

  const toggleGoal = useCallback((goalId: string) => {
    setSelectedGoalIds((current) => {
      if (current.includes(goalId)) {
        return current.filter((id) => id !== goalId)
      }
      return [...current, goalId]
    })
  }, [])

  return {
    selectedGoalIds,
    toggleGoal,
  }
}
