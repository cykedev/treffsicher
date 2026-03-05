"use client"

import type { FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { SelectableRow } from "@/components/ui/selectable-row"
import type { GoalSessionOption } from "@/lib/goals/actions"
import { SESSION_TYPE_LABELS } from "@/lib/sessions/presentation"
import { formatDateTime } from "@/components/app/goals/goal-card-section/format"

interface Props {
  sessions: GoalSessionOption[]
  selectedSessionIds: string[]
  message: string | null
  pending: boolean
  displayTimeZone: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onCancel: () => void
  onToggleSession: (sessionId: string) => void
}

export function GoalAssignmentsForm({
  sessions,
  selectedSessionIds,
  message,
  pending,
  displayTimeZone,
  onSubmit,
  onCancel,
  onToggleSession,
}: Props) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
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
                onToggle={() => onToggleSession(entry.id)}
                disabled={pending}
                className={
                  index > 0
                    ? "w-full rounded-none border-t border-border/40"
                    : "w-full rounded-none"
                }
              >
                <span className="font-medium">{SESSION_TYPE_LABELS[entry.type] ?? entry.type}</span>
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
        <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={pending}>
          Abbrechen
        </Button>
      </div>
    </form>
  )
}
