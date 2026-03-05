"use client"

import { useActionState, useState, useEffect } from "react"
import { savePrognosis, type ActionResult, type SerializedPrognosis } from "@/lib/sessions/actions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ActionFormFooter } from "@/components/app/sessions/shared/ActionFormFooter"
import { ActionFormMessages } from "@/components/app/sessions/shared/ActionFormMessages"
import { ScoreSliderRows } from "@/components/app/sessions/shared/ScoreSliderRows"

interface Props {
  sessionId: string
  initialData?: SerializedPrognosis | null
  onSuccess?: () => void
  onCancel?: () => void
}

const dimensions = [
  { id: "prognosis-fitness", name: "fitness", label: "Kondition" },
  { id: "prognosis-nutrition", name: "nutrition", label: "Ernährung" },
  { id: "prognosis-technique", name: "technique", label: "Technik" },
  { id: "prognosis-tactics", name: "tactics", label: "Taktik" },
  { id: "prognosis-mentalStrength", name: "mentalStrength", label: "Mentale Stärke" },
  { id: "prognosis-environment", name: "environment", label: "Umfeld" },
  { id: "prognosis-equipment", name: "equipment", label: "Material" },
] as const

type DimensionKey = (typeof dimensions)[number]["name"]

export function PrognosisForm({ sessionId, initialData, onSuccess, onCancel }: Props) {
  const action = savePrognosis.bind(null, sessionId)
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(action, null)

  const [values, setValues] = useState<Record<DimensionKey, number>>({
    fitness: initialData?.fitness ?? 50,
    nutrition: initialData?.nutrition ?? 50,
    technique: initialData?.technique ?? 50,
    tactics: initialData?.tactics ?? 50,
    mentalStrength: initialData?.mentalStrength ?? 50,
    environment: initialData?.environment ?? 50,
    equipment: initialData?.equipment ?? 50,
  })

  useEffect(() => {
    if (state?.success) onSuccess?.()
  }, [state?.success, onSuccess])

  return (
    <form action={formAction} className="space-y-4">
      <ActionFormMessages
        error={state?.error}
        success={state?.success}
        showInlineSuccess={!onSuccess}
        successMessage="Prognose gespeichert."
      />

      <ScoreSliderRows
        title="Selbsteinschätzung (0–100)"
        rows={dimensions}
        values={values}
        pending={pending}
        onValueChange={(name, value) => {
          setValues((current) => ({
            ...current,
            [name]: value,
          }))
        }}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="expectedScore">Erwartetes Ergebnis (Ringe)</Label>
          <Input
            id="expectedScore"
            name="expectedScore"
            type="number"
            step="0.1"
            min="0"
            placeholder="z.B. 355.5"
            defaultValue={
              initialData?.expectedScore != null ? String(initialData.expectedScore) : ""
            }
            disabled={pending}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="expectedCleanShots">Erwartete saubere Schüsse</Label>
          <Input
            id="expectedCleanShots"
            name="expectedCleanShots"
            type="number"
            min="0"
            placeholder="saubere Schüsse"
            defaultValue={initialData?.expectedCleanShots ?? ""}
            disabled={pending}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="performanceGoal">Leistungsziel</Label>
        <Textarea
          id="performanceGoal"
          name="performanceGoal"
          placeholder="Was soll heute gelingen? (Ergebnis oder technischer / mentaler Aspekt)"
          defaultValue={initialData?.performanceGoal ?? ""}
          disabled={pending}
          rows={2}
        />
      </div>

      <ActionFormFooter
        pending={pending}
        submitLabel="Prognose speichern"
        submitPendingLabel="Speichern..."
        onCancel={onCancel}
      />
    </form>
  )
}
