"use client"

import { useActionState, useState, useEffect } from "react"
import { saveFeedback, type ActionResult } from "@/lib/sessions/actions"
import { Label } from "@/components/ui/label"
import { SelectableRow } from "@/components/ui/selectable-row"
import { Textarea } from "@/components/ui/textarea"
import { ActionFormFooter } from "@/components/app/sessions/shared/ActionFormFooter"
import { ActionFormMessages } from "@/components/app/sessions/shared/ActionFormMessages"
import { ScoreSliderRows } from "@/components/app/sessions/shared/ScoreSliderRows"
import type { Feedback } from "@/generated/prisma/client"

interface Props {
  sessionId: string
  initialData?: Feedback | null
  onSuccess?: () => void
  onCancel?: () => void
}

const dimensions = [
  { id: "feedback-fitness", name: "fitness", label: "Kondition" },
  { id: "feedback-nutrition", name: "nutrition", label: "Ernährung" },
  { id: "feedback-technique", name: "technique", label: "Technik" },
  { id: "feedback-tactics", name: "tactics", label: "Taktik" },
  { id: "feedback-mentalStrength", name: "mentalStrength", label: "Mentale Stärke" },
  { id: "feedback-environment", name: "environment", label: "Umfeld" },
  { id: "feedback-equipment", name: "equipment", label: "Material" },
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
      <ActionFormMessages
        error={state?.error}
        success={state?.success}
        showInlineSuccess={!onSuccess}
        successMessage="Feedback gespeichert."
      />

      <ScoreSliderRows
        title="Tatsächlicher Stand (0–100)"
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

      <ActionFormFooter
        pending={pending}
        submitLabel="Feedback speichern"
        submitPendingLabel="Speichern..."
        onCancel={onCancel}
      />
    </form>
  )
}
