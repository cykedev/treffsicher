"use client"

import { useState, useTransition, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Check, Pencil, Target, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  deleteGoal,
  updateGoal,
  updateGoalAssignments,
  type GoalSessionOption,
  type GoalWithAssignments,
} from "@/lib/goals/actions"

interface Props {
  goal: GoalWithAssignments
  sessions: GoalSessionOption[]
}

const sessionTypeLabels: Record<string, string> = {
  TRAINING: "Training",
  WETTKAMPF: "Wettkampf",
  TROCKENTRAINING: "Trockentraining",
  MENTAL: "Mentaltraining",
}

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

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

function toDateInputValue(date: Date): string {
  return new Date(date).toISOString().slice(0, 10)
}

export function GoalCardSection({ goal, sessions }: Props) {
  const router = useRouter()
  const [editingGoal, setEditingGoal] = useState(false)
  const [editingAssignments, setEditingAssignments] = useState(false)
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>(goal.sessionIds)
  const [pending, startTransition] = useTransition()

  function openAssignmentsEditor() {
    // Beim Öffnen immer den aktuell gespeicherten Stand als Ausgangslage setzen
    setSelectedSessionIds(goal.sessionIds)
    setEditingAssignments(true)
  }

  function toggleSession(sessionId: string) {
    setSelectedSessionIds((prev) => {
      if (prev.includes(sessionId)) {
        return prev.filter((id) => id !== sessionId)
      }
      return [...prev, sessionId]
    })
  }

  function handleGoalSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      await updateGoal(goal.id, formData)
      setEditingGoal(false)
      router.refresh()
    })
  }

  function handleAssignmentsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      await updateGoalAssignments(goal.id, formData)
      setEditingAssignments(false)
      router.refresh()
    })
  }

  function handleDeleteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    startTransition(async () => {
      await deleteGoal(goal.id)
      router.refresh()
    })
  }

  if (editingGoal) {
    return (
      <form onSubmit={handleGoalSubmit} className="space-y-4 rounded-md border p-3">
        <p className="text-sm font-medium">Zieldaten bearbeiten</p>
        <div className="grid gap-3 md:grid-cols-2 [&>*]:min-w-0">
          <div className="space-y-1.5">
            <Label htmlFor={`goal-title-${goal.id}`}>Titel</Label>
            <Input id={`goal-title-${goal.id}`} name="title" required defaultValue={goal.title} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`goal-type-${goal.id}`}>Typ</Label>
            <Select name="type" required defaultValue={goal.type}>
              <SelectTrigger id={`goal-type-${goal.id}`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RESULT">Ergebnisziel</SelectItem>
                <SelectItem value="PROCESS">Prozessziel</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor={`goal-description-${goal.id}`}>Beschreibung</Label>
          <Textarea
            id={`goal-description-${goal.id}`}
            name="description"
            rows={2}
            defaultValue={goal.description ?? ""}
          />
        </div>
        <div className="grid gap-3 md:grid-cols-2 [&>*]:min-w-0">
          <div className="space-y-1.5">
            <Label htmlFor={`goal-from-${goal.id}`}>Von</Label>
            <Input
              id={`goal-from-${goal.id}`}
              name="dateFrom"
              type="date"
              required
              defaultValue={toDateInputValue(goal.dateFrom)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`goal-to-${goal.id}`}>Bis</Label>
            <Input
              id={`goal-to-${goal.id}`}
              name="dateTo"
              type="date"
              required
              defaultValue={toDateInputValue(goal.dateTo)}
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Speichern..." : "Ziel speichern"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setEditingGoal(false)}
            disabled={pending}
          >
            Abbrechen
          </Button>
        </div>
      </form>
    )
  }

  if (editingAssignments) {
    return (
      <form onSubmit={handleAssignmentsSubmit} className="space-y-3">
        <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Was bedeutet „Zahlt auf das Ziel ein“?</p>
          <p>
            Du markierst damit, welche Einheiten diesem Ziel gewidmet waren. Die Markierung ist nur
            für Übersicht und Auswertung und ändert keine Werte in der Einheit selbst.
          </p>
        </div>
        {sessions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Noch keine Einheiten vorhanden.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border/60 bg-muted/10">
            {sessions.map((entry, index) => {
              const selected = selectedSessionIds.includes(entry.id)

              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => toggleSession(entry.id)}
                  disabled={pending}
                  className={`flex w-full items-start gap-2 px-3 py-2.5 text-left text-sm transition-colors ${
                    index > 0 ? "border-t border-border/40" : ""
                  } ${
                    selected ? "bg-primary/10" : "bg-background/10 hover:bg-muted/20"
                  }`}
                  aria-pressed={selected}
                >
                  <span
                    className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                      selected
                        ? "bg-primary text-primary-foreground"
                        : "border border-border/60 bg-background/20 text-muted-foreground/40"
                    }`}
                  >
                    <Check className={`h-3.5 w-3.5 ${selected ? "opacity-100" : "opacity-0"}`} />
                  </span>
                  <span className="leading-5">
                    <span className="font-medium">
                      {sessionTypeLabels[entry.type] ?? entry.type}
                    </span>
                    <span className="text-muted-foreground"> · {formatDateTime(entry.date)}</span>
                    {entry.disciplineName && (
                      <span className="text-muted-foreground"> · {entry.disciplineName}</span>
                    )}
                    {entry.location && (
                      <span className="text-muted-foreground"> · {entry.location}</span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
        )}
        {selectedSessionIds.length === 0 ? (
          <p className="text-xs text-muted-foreground">Keine Einheit ausgewählt</p>
        ) : (
          <p className="text-xs text-muted-foreground">
            {selectedSessionIds.length} Einheit{selectedSessionIds.length === 1 ? "" : "en"}{" "}
            ausgewählt
          </p>
        )}
        {selectedSessionIds.map((sessionId) => (
          <input key={sessionId} type="hidden" name="sessionIds" value={sessionId} />
        ))}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Speichern..." : "Markierung speichern"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setEditingAssignments(false)}
            disabled={pending}
          >
            Abbrechen
          </Button>
        </div>
      </form>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold">{goal.title}</p>
            <Badge variant="outline">{goalTypeLabels[goal.type] ?? goal.type}</Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            Zeitraum: {formatDateOnly(goal.dateFrom)} bis {formatDateOnly(goal.dateTo)}
          </div>
          <div className="text-sm text-muted-foreground">
            Einheiten, die auf das Ziel einzahlen: {goal.sessionCount}
          </div>
          {goal.description && <p className="text-sm whitespace-pre-wrap">{goal.description}</p>}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setEditingGoal(true)}
            disabled={pending}
          >
            <Pencil className="mr-1.5 h-4 w-4" />
            Bearbeiten
          </Button>
          <Button size="sm" variant="outline" onClick={openAssignmentsEditor} disabled={pending}>
            <Target className="mr-1.5 h-4 w-4" />
            Zahlt auf Ziel ein
          </Button>
          <form onSubmit={handleDeleteSubmit}>
            <Button
              type="submit"
              size="sm"
              variant="ghost"
              disabled={pending}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="mr-1.5 h-4 w-4" />
              Löschen
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
