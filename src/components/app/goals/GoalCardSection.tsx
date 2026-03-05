"use client"

import { useState, useTransition, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import {
  deleteGoal,
  updateGoal,
  updateGoalAssignments,
  type GoalActionResult,
  type GoalSessionOption,
  type GoalWithAssignments,
} from "@/lib/goals/actions"
import { GoalActions } from "@/components/app/goals/goal-card-section/GoalActions"
import { GoalAssignmentsForm } from "@/components/app/goals/goal-card-section/GoalAssignmentsForm"
import { GoalEditForm } from "@/components/app/goals/goal-card-section/GoalEditForm"
import { GoalSummary } from "@/components/app/goals/goal-card-section/GoalSummary"

interface Props {
  goal: GoalWithAssignments
  sessions: GoalSessionOption[]
  backHref?: string
  displayTimeZone: string
}

export function GoalCardSection({ goal, sessions, backHref, displayTimeZone }: Props) {
  const router = useRouter()
  const [editingGoal, setEditingGoal] = useState(false)
  const [editingAssignments, setEditingAssignments] = useState(false)
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>(goal.sessionIds)
  const [message, setMessage] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function openAssignmentsEditor(): void {
    // Immer vom persistierten Zustand starten, damit abgebrochene Edits keine "Geisterauswahl" hinterlassen.
    setSelectedSessionIds(goal.sessionIds)
    setEditingAssignments(true)
  }

  function toggleSession(sessionId: string): void {
    setSelectedSessionIds((prev) => {
      if (prev.includes(sessionId)) {
        return prev.filter((id) => id !== sessionId)
      }
      return [...prev, sessionId]
    })
  }

  function handleGoalSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setMessage(null)

    startTransition(async () => {
      const result: GoalActionResult = await updateGoal(goal.id, formData)
      if (result.error) {
        setMessage(result.error)
        return
      }
      setEditingGoal(false)
      router.refresh()
    })
  }

  function handleAssignmentsSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    setMessage(null)

    startTransition(async () => {
      const result: GoalActionResult = await updateGoalAssignments(goal.id, formData)
      if (result.error) {
        setMessage(result.error)
        return
      }
      setEditingAssignments(false)
      router.refresh()
    })
  }

  function handleDelete(): void {
    setMessage(null)
    startTransition(async () => {
      const result: GoalActionResult = await deleteGoal(goal.id)
      if (result.error) {
        setMessage(result.error)
        return
      }
      router.refresh()
    })
  }

  if (editingGoal) {
    return (
      <GoalEditForm
        goal={goal}
        message={message}
        pending={pending}
        onSubmit={handleGoalSubmit}
        onCancel={() => setEditingGoal(false)}
      />
    )
  }

  if (editingAssignments) {
    return (
      <GoalAssignmentsForm
        sessions={sessions}
        selectedSessionIds={selectedSessionIds}
        message={message}
        pending={pending}
        displayTimeZone={displayTimeZone}
        onSubmit={handleAssignmentsSubmit}
        onCancel={() => setEditingAssignments(false)}
        onToggleSession={toggleSession}
      />
    )
  }

  return (
    <div className="space-y-3">
      {message && <p className="text-sm text-destructive">{message}</p>}
      <div className="space-y-2">
        <GoalActions
          pending={pending}
          backHref={backHref}
          onEditGoal={() => setEditingGoal(true)}
          onEditAssignments={openAssignmentsEditor}
          onDelete={handleDelete}
        />
        <GoalSummary goal={goal} displayTimeZone={displayTimeZone} />
      </div>
    </div>
  )
}
