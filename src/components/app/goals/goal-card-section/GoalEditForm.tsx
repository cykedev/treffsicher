"use client"

import type { FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { GoalWithAssignments } from "@/lib/goals/actions"
import { toDateInputValue } from "@/components/app/goals/goal-card-section/format"

interface Props {
  goal: GoalWithAssignments
  message: string | null
  pending: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onCancel: () => void
}

// Inline-Edit nutzt eine normale Form, damit dieselbe Server-Validation wie beim Erstellen greift.
export function GoalEditForm({ goal, message, pending, onSubmit, onCancel }: Props) {
  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-md border p-3">
      {message && <p className="text-sm text-destructive">{message}</p>}
      <p className="text-sm font-medium">Zieldaten bearbeiten</p>
      <div className="grid gap-3 md:grid-cols-2 [&>*]:min-w-0">
        {/* Typ bleibt editierbar, damit Ergebnis-/Prozessziel ohne Neuanlage umklassifiziert werden kann. */}
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
        <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={pending}>
          Abbrechen
        </Button>
      </div>
    </form>
  )
}
