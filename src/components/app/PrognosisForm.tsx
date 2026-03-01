"use client"

import { useActionState, useState, useEffect } from "react"
import { savePrognosis, type ActionResult, type SerializedPrognosis } from "@/lib/sessions/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"

interface Props {
  sessionId: string
  initialData?: SerializedPrognosis | null
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
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && !onSuccess && (
        <p className="text-sm text-green-600">Prognose gespeichert.</p>
      )}

      <div className="space-y-3">
        <p className="text-sm font-medium">Selbsteinschätzung (0–100)</p>
        {dimensions.map((dim) => (
          // Gleiche Ausrichtung wie Lese-Ansicht: Label (w-32) | Slider (flex-1) | Wert (w-8)
          <div key={dim.name} className="flex items-center gap-3">
            <Label
              htmlFor={`prognosis-${dim.name}`}
              className="w-32 shrink-0 truncate text-sm"
            >
              {dim.label}
            </Label>
            <input type="hidden" name={dim.name} value={values[dim.name]} />
            <Slider
              id={`prognosis-${dim.name}`}
              min={0}
              max={100}
              step={1}
              value={[values[dim.name]]}
              onValueChange={([v]) =>
                setValues((prev) => ({ ...prev, [dim.name]: v }))
              }
              disabled={pending}
              className="flex-1"
            />
            <span className="w-8 shrink-0 text-right text-sm tabular-nums text-muted-foreground">
              {values[dim.name]}
            </span>
          </div>
        ))}
      </div>

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
          <Label htmlFor="expectedCleanShots">Erwartete Volltreffer</Label>
          <Input
            id="expectedCleanShots"
            name="expectedCleanShots"
            type="number"
            min="0"
            placeholder="Anzahl 10er"
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

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Speichern..." : "Prognose speichern"}
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
