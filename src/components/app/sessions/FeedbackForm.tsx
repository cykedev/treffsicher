"use client"

import { useActionState, useState, useEffect } from "react"
import { saveFeedback, type ActionResult } from "@/lib/sessions/actions"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { SelectableRow } from "@/components/ui/selectable-row"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import type { Feedback } from "@/generated/prisma/client"

interface Props {
  sessionId: string
  initialData?: Feedback | null
  onSuccess?: () => void
  onCancel?: () => void
}

const dimensions = [
  { name: "fitness", label: "Kondition" },
  { name: "nutrition", label: "Ernährung" },
  { name: "technique", label: "Technik" },
  { name: "tactics", label: "Taktik" },
  { name: "mentalStrength", label: "Mentale Stärke" },
  { name: "environment", label: "Umfeld" },
  { name: "equipment", label: "Material" },
] as const

type DimensionKey = (typeof dimensions)[number]["name"]

export function FeedbackForm({ sessionId, initialData, onCancel, onSuccess }: Props) {
  const action = saveFeedback.bind(null, sessionId)
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
  const [goalAchieved, setGoalAchieved] = useState(initialData?.goalAchieved ?? false)

  useEffect(() => {
    if (state?.success) onSuccess?.()
  }, [state?.success, onSuccess])

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && !onSuccess && (
        <p className="text-sm text-green-600">Feedback gespeichert.</p>
      )}

      <div className="space-y-3">
        <p className="text-sm font-medium">Tatsächlicher Stand (0–100)</p>
        {dimensions.map((dim) => (
          // Gleiche Ausrichtung wie Lese-Ansicht: Label (w-32) | Slider (flex-1) | Wert (w-8)
          <div key={dim.name} className="flex items-center gap-3">
            <Label htmlFor={`feedback-${dim.name}`} className="w-32 shrink-0 truncate text-sm">
              {dim.label}
            </Label>
            <input type="hidden" name={dim.name} value={values[dim.name]} />
            <Slider
              id={`feedback-${dim.name}`}
              min={0}
              max={100}
              step={1}
              value={[values[dim.name]]}
              onValueChange={([v]) => setValues((prev) => ({ ...prev, [dim.name]: v }))}
              disabled={pending}
              className="flex-1"
            />
            <span className="w-8 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
              {values[dim.name]}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <Label htmlFor="explanation">Erklärung / Abweichungen zur Prognose</Label>
        <Textarea
          id="explanation"
          name="explanation"
          placeholder="Was erklärt den tatsächlichen Stand?"
          defaultValue={initialData?.explanation ?? ""}
          disabled={pending}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        {/* Boolean-Feld per Hidden-Input übergeben, damit die Server-Action konsistent "on"/leer auswertet. */}
        {goalAchieved && <input type="hidden" name="goalAchieved" value="on" />}
        <SelectableRow
          selected={goalAchieved}
          onToggle={() => setGoalAchieved(!goalAchieved)}
          disabled={pending}
          className="w-full rounded-md"
        >
          Leistungsziel erreicht
        </SelectableRow>
        {goalAchieved && (
          <div className="ml-6">
            <Textarea
              name="goalAchievedNote"
              placeholder="Anmerkung zum Ziel …"
              defaultValue={initialData?.goalAchievedNote ?? ""}
              disabled={pending}
              rows={2}
            />
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="progress">Fortschritte durch diese Einheit</Label>
        <Textarea
          id="progress"
          name="progress"
          placeholder="Was hat sich verbessert?"
          defaultValue={initialData?.progress ?? ""}
          disabled={pending}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="wentWell">Was lief besonders gut?</Label>
        <Textarea
          id="wentWell"
          name="wentWell"
          placeholder=""
          defaultValue={initialData?.wentWell ?? ""}
          disabled={pending}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="fiveBestShots">Five Best Shots</Label>
        <Textarea
          id="fiveBestShots"
          name="fiveBestShots"
          placeholder="Was waren die 5 besten Schüsse dieser Einheit?"
          defaultValue={initialData?.fiveBestShots ?? ""}
          disabled={pending}
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="insights">Aha-Erlebnisse</Label>
        <Textarea
          id="insights"
          name="insights"
          placeholder="Erkenntnisse, die bleiben …"
          defaultValue={initialData?.insights ?? ""}
          disabled={pending}
          rows={2}
        />
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Speichern..." : "Feedback speichern"}
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
