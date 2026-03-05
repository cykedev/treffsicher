"use client"

import { useActionState, useState, useEffect } from "react"
import { saveReflection, type ActionResult } from "@/lib/sessions/actions"
import { Label } from "@/components/ui/label"
import { SelectableRow } from "@/components/ui/selectable-row"
import { Textarea } from "@/components/ui/textarea"
import { ActionFormFooter } from "@/components/app/sessions/shared/ActionFormFooter"
import { ActionFormMessages } from "@/components/app/sessions/shared/ActionFormMessages"
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
  const [routineFollowed, setRoutineFollowed] = useState(initialData?.routineFollowed ?? true)

  // Nach erfolgreichem Speichern Callback aufrufen (für Section-Wrapper)
  useEffect(() => {
    if (state?.success) {
      onSuccess?.()
    }
  }, [state?.success, onSuccess])

  return (
    <form action={formAction} className="space-y-4">
      <ActionFormMessages
        error={state?.error}
        success={state?.success}
        showInlineSuccess={!onSuccess}
        successMessage="Reflexion gespeichert."
      />

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
        {/* Boolean-Feld per Hidden-Input übergeben, damit die Server-Action konsistent "on"/leer auswertet. */}
        {routineFollowed && <input type="hidden" name="routineFollowed" value="on" />}
        <SelectableRow
          selected={routineFollowed}
          onToggle={() => setRoutineFollowed(!routineFollowed)}
          disabled={pending}
          className="w-full rounded-md"
        >
          Schuss-Ablauf eingehalten
        </SelectableRow>

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

      <ActionFormFooter
        pending={pending}
        submitLabel="Reflexion speichern"
        submitPendingLabel="Speichern..."
        onCancel={onCancel}
      />
    </form>
  )
}
