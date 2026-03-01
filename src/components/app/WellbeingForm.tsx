"use client"

import { useActionState, useState, useEffect } from "react"
import { saveWellbeing, type ActionResult } from "@/lib/sessions/actions"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import type { Wellbeing } from "@/generated/prisma/client"

interface Props {
  sessionId: string
  initialData?: Wellbeing | null
  onSuccess?: () => void
  onCancel?: () => void
}

const wellbeingFields = [
  { name: "sleep", label: "Schlaf" },
  { name: "energy", label: "Energie" },
  { name: "stress", label: "Stress" },
  { name: "motivation", label: "Motivation" },
] as const

export function WellbeingForm({ sessionId, initialData, onSuccess, onCancel }: Props) {
  const action = saveWellbeing.bind(null, sessionId)
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(action, null)

  const [values, setValues] = useState({
    sleep: initialData?.sleep ?? 5,
    energy: initialData?.energy ?? 5,
    stress: initialData?.stress ?? 5,
    motivation: initialData?.motivation ?? 5,
  })

  useEffect(() => {
    if (state?.success) onSuccess?.()
  }, [state?.success, onSuccess])

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && !onSuccess && (
        <p className="text-sm text-green-600">Befinden gespeichert.</p>
      )}

      <div className="space-y-3">
        {wellbeingFields.map((field) => (
          // Gleiche Ausrichtung wie Lese-Ansicht: Label (w-28) | Slider (flex-1) | Wert (w-12)
          <div key={field.name} className="flex items-center gap-3">
            <Label htmlFor={field.name} className="w-28 shrink-0 text-sm">
              {field.label}
            </Label>
            <input type="hidden" name={field.name} value={values[field.name]} />
            <Slider
              id={field.name}
              min={0}
              max={10}
              step={1}
              value={[values[field.name]]}
              onValueChange={([v]) =>
                setValues((prev) => ({ ...prev, [field.name]: v }))
              }
              disabled={pending}
              className="flex-1"
            />
            <span className="w-10 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
              {values[field.name]}/10
            </span>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Speichern..." : "Befinden speichern"}
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
