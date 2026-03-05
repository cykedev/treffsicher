"use client"

import { useActionState, useState, useEffect } from "react"
import { saveWellbeing, type ActionResult } from "@/lib/sessions/actions"
import { ActionFormFooter } from "@/components/app/sessions/shared/ActionFormFooter"
import { ActionFormMessages } from "@/components/app/sessions/shared/ActionFormMessages"
import { ScoreSliderRows } from "@/components/app/sessions/shared/ScoreSliderRows"
import type { Wellbeing } from "@/generated/prisma/client"

interface Props {
  sessionId: string
  initialData?: Wellbeing | null
  onSuccess?: () => void
  onCancel?: () => void
}

const wellbeingFields = [
  { id: "wellbeing-sleep", name: "sleep", label: "Schlaf" },
  { id: "wellbeing-energy", name: "energy", label: "Energie" },
  { id: "wellbeing-stress", name: "stress", label: "Stress" },
  { id: "wellbeing-motivation", name: "motivation", label: "Motivation" },
] as const

export function WellbeingForm({ sessionId, initialData, onSuccess, onCancel }: Props) {
  const action = saveWellbeing.bind(null, sessionId)
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(action, null)

  const [values, setValues] = useState({
    sleep: initialData?.sleep ?? 50,
    energy: initialData?.energy ?? 50,
    stress: initialData?.stress ?? 50,
    motivation: initialData?.motivation ?? 50,
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
        successMessage="Befinden gespeichert."
      />

      <ScoreSliderRows
        title="Befinden (0–100)"
        rows={wellbeingFields}
        values={values}
        pending={pending}
        onValueChange={(name, value) => {
          setValues((current) => ({
            ...current,
            [name]: value,
          }))
        }}
      />

      <ActionFormFooter
        pending={pending}
        submitLabel="Befinden speichern"
        submitPendingLabel="Speichern..."
        onCancel={onCancel}
      />
    </form>
  )
}
