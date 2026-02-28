"use client"

import { useActionState, useState, useEffect } from "react"
import { saveReflection, type ActionResult } from "@/lib/sessions/actions"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { Reflection } from "@/generated/prisma/client"

interface Props {
  sessionId: string
  initialData?: Reflection | null
  // Callbacks für den Einsatz im Section-Wrapper (view/edit-Modus)
  onSuccess?: () => void
  onCancel?: () => void
}

// Erfasst die Reflexion nach einer Einheit.
// Alle Felder sind optional — auch nur ein einzelnes ausgefülltes Feld ist sinnvoll.
// Unterstützt Standalone-Nutzung (ohne Callbacks) und eingebettet im Section-Wrapper.
export function ReflectionForm({ sessionId, initialData, onSuccess, onCancel }: Props) {
  const action = saveReflection.bind(null, sessionId)
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(action, null)

  // Lokaler State für Ablauf-Checkbox — bestimmt ob Abweichungsfeld angezeigt wird
  const [routineFollowed, setRoutineFollowed] = useState(
    initialData?.routineFollowed ?? true
  )

  // Nach erfolgreichem Speichern Callback aufrufen (für Section-Wrapper)
  useEffect(() => {
    if (state?.success) {
      onSuccess?.()
    }
  }, [state?.success, onSuccess])

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {/* Erfolgsmeldung nur ohne Callback — Wrapper übernimmt sonst die Navigation */}
      {state?.success && !onSuccess && (
        <p className="text-sm text-green-600">Reflexion gespeichert.</p>
      )}

      <div className="space-y-2">
        <Label htmlFor="observations">Beobachtungen</Label>
        <Textarea
          id="observations"
          name="observations"
          placeholder="Was ist aufgefallen? Was lief gut, was nicht?"
          defaultValue={initialData?.observations ?? ""}
          disabled={pending}
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="insight">Heute ist mir klargeworden, dass …</Label>
        <Textarea
          id="insight"
          name="insight"
          placeholder="Ergänze den Satz …"
          defaultValue={initialData?.insight ?? ""}
          disabled={pending}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="learningQuestion">Was kann ich tun, um …?</Label>
        <Textarea
          id="learningQuestion"
          name="learningQuestion"
          placeholder="Ergänze die Frage …"
          defaultValue={initialData?.learningQuestion ?? ""}
          disabled={pending}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            name="routineFollowed"
            checked={routineFollowed}
            onChange={(e) => setRoutineFollowed(e.target.checked)}
            disabled={pending}
            className="h-4 w-4"
          />
          Schuss-Ablauf eingehalten
        </label>

        {/* Abweichungsfeld nur wenn Ablauf nicht eingehalten */}
        {!routineFollowed && (
          <div className="ml-6 space-y-1">
            <Label htmlFor="routineDeviation" className="text-sm text-muted-foreground">
              Was war anders?
            </Label>
            <Textarea
              id="routineDeviation"
              name="routineDeviation"
              placeholder="Beschreibe die Abweichung …"
              defaultValue={initialData?.routineDeviation ?? ""}
              disabled={pending}
              rows={2}
            />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Speichern..." : "Reflexion speichern"}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={pending}>
            Abbrechen
          </Button>
        )}
      </div>
    </form>
  )
}
