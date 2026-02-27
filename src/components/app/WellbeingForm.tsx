"use client"

import { useActionState, useState } from "react"
import { saveWellbeing, type ActionResult } from "@/lib/sessions/actions"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { Wellbeing } from "@/generated/prisma/client"

interface Props {
  sessionId: string
  initialData?: Wellbeing | null
}

const wellbeingFields = [
  { name: "sleep", label: "Schlaf" },
  { name: "energy", label: "Energie" },
  { name: "stress", label: "Stress" },
  { name: "motivation", label: "Motivation" },
] as const

// Erfasst das Befinden vor einer Einheit (4 Schieberegler, je 0–10).
// Kann jederzeit nachträglich gespeichert oder aktualisiert werden.
export function WellbeingForm({ sessionId, initialData }: Props) {
  const action = saveWellbeing.bind(null, sessionId)
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(action, null)

  // Lokale State-Werte für Live-Anzeige des Slider-Werts
  const [values, setValues] = useState({
    sleep: initialData?.sleep ?? 5,
    energy: initialData?.energy ?? 5,
    stress: initialData?.stress ?? 5,
    motivation: initialData?.motivation ?? 5,
  })

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && (
        <p className="text-sm text-green-600">Befinden gespeichert.</p>
      )}

      {wellbeingFields.map((field) => (
        <div key={field.name} className="space-y-1">
          <div className="flex items-center justify-between">
            <Label htmlFor={field.name}>{field.label}</Label>
            <span className="text-sm font-medium tabular-nums">
              {values[field.name]} / 10
            </span>
          </div>
          <input
            id={field.name}
            name={field.name}
            type="range"
            min="0"
            max="10"
            step="1"
            value={values[field.name]}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, [field.name]: Number(e.target.value) }))
            }
            disabled={pending}
            className="w-full accent-primary"
          />
        </div>
      ))}

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Speichern..." : "Befinden speichern"}
      </Button>
    </form>
  )
}
