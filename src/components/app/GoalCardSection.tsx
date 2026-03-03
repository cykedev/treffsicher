"use client"

import { useState, useTransition, type FormEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Pencil, Target, Trash2 } from "lucide-react"
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
import { SelectableRow } from "@/components/ui/selectable-row"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  deleteGoal,
  updateGoal,
  updateGoalAssignments,
  type GoalActionResult,
  type GoalSessionOption,
  type GoalWithAssignments,
} from "@/lib/goals/actions"

interface Props {
  goal: GoalWithAssignments
  sessions: GoalSessionOption[]
  backHref?: string
  displayTimeZone: string
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

function formatDateOnly(date: Date, displayTimeZone: string): string {
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: displayTimeZone,
  }).format(new Date(date))
}

function formatDateTime(date: Date, displayTimeZone: string): string {
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: displayTimeZone,
  }).format(new Date(date))
}

function toDateInputValue(date: Date): string {
  return new Date(date).toISOString().slice(0, 10)
}

export function GoalCardSection({ goal, sessions, backHref, displayTimeZone }: Props) {
  const router = useRouter()
  const [editingGoal, setEditingGoal] = useState(false)
  const [editingAssignments, setEditingAssignments] = useState(false)
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>(goal.sessionIds)
  const [message, setMessage] = useState<string | null>(null)
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

  function handleAssignmentsSubmit(event: FormEvent<HTMLFormElement>) {
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
      <form onSubmit={handleGoalSubmit} className="space-y-4 rounded-md border p-3">
        {message && <p className="text-sm text-destructive">{message}</p>}
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
        {message && <p className="text-sm text-destructive">{message}</p>}
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
                <SelectableRow
                  key={entry.id}
                  selected={selected}
                  onToggle={() => toggleSession(entry.id)}
                  disabled={pending}
                  className={
                    index > 0
                      ? "w-full rounded-none border-t border-border/40"
                      : "w-full rounded-none"
                  }
                >
                  <span className="font-medium">{sessionTypeLabels[entry.type] ?? entry.type}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {formatDateTime(entry.date, displayTimeZone)}
                  </span>
                  {entry.disciplineName && (
                    <span className="text-muted-foreground"> · {entry.disciplineName}</span>
                  )}
                  {entry.location && (
                    <span className="text-muted-foreground"> · {entry.location}</span>
                  )}
                </SelectableRow>
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
      {message && <p className="text-sm text-destructive">{message}</p>}
      <div className="space-y-2">
        <div className="flex items-start justify-end">
          <div className="flex w-full flex-wrap items-center justify-end gap-0.5 sm:w-auto sm:shrink-0 sm:gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setEditingGoal(true)}
              disabled={pending}
              className="size-9"
              aria-label="Ziel bearbeiten"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={openAssignmentsEditor}
              disabled={pending}
              className="px-2 sm:px-3"
              aria-label="Einheiten zuweisen"
            >
              <Target className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Zuweisen</span>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="icon"
                  variant="destructive"
                  className="size-9 sm:h-8 sm:w-auto sm:px-3"
                  disabled={pending}
                  aria-label="Ziel löschen"
                >
                  <Trash2 className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Löschen</span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Ziel löschen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Das Ziel und alle Verknüpfungen zu Einheiten werden entfernt.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-white hover:bg-destructive/90"
                    onClick={handleDelete}
                  >
                    Löschen
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {backHref && (
              <Button variant="ghost" size="sm" className="px-2 sm:px-3" asChild>
                <Link href={backHref} aria-label="Zurück zu Zielen">
                  <ArrowLeft className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Zurück</span>
                </Link>
              </Button>
            )}
          </div>
        </div>

        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-semibold">{goal.title}</p>
            <Badge variant="outline">{goalTypeLabels[goal.type] ?? goal.type}</Badge>
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
      </div>
    </div>
  )
}
