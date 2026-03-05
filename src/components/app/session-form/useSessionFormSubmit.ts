import { useState, type FormEvent } from "react"
import { createSession, updateSession } from "@/lib/sessions/actions"
import { toIsoFromDateTimeLocalValue } from "@/components/app/session-form/utils"

interface Params {
  sessionId?: string
  dateValue: string
  showShots: boolean
  shots: string[][]
  hasValidationErrors: boolean
  hasHitLocationValidationError: boolean
}

function appendShotArraysToFormData(formData: FormData, shots: string[][]): void {
  if (shots.length === 0) return
  shots.forEach((seriesShots, index) => {
    formData.set(`series[${index}][shots]`, JSON.stringify(seriesShots))
  })
}

export function useSessionFormSubmit({
  sessionId,
  dateValue,
  showShots,
  shots,
  hasValidationErrors,
  hasHitLocationValidationError,
}: Params): {
  pending: boolean
  formError: string | null
  showValidationHint: boolean
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>
} {
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    setFormError(null)

    if (hasValidationErrors) {
      setFormError("Bitte ungültige Werte korrigieren.")
      return
    }
    if (hasHitLocationValidationError) {
      setFormError("Bitte Trefferlage vollständig und korrekt erfassen oder löschen.")
      return
    }

    const normalizedDateIso = toIsoFromDateTimeLocalValue(dateValue)
    if (!normalizedDateIso) {
      setFormError("Datum/Uhrzeit ist ungültig.")
      return
    }

    setPending(true)

    const formData = new FormData(event.currentTarget)
    formData.set("date", normalizedDateIso)

    if (showShots) {
      appendShotArraysToFormData(formData, shots)
    }

    const result = sessionId
      ? await updateSession(sessionId, formData)
      : await createSession(formData)

    if (result.error) {
      setFormError(result.error)
      setPending(false)
      return
    }

    // Falls keine Navigation erfolgt, Formular wieder freigeben.
    setPending(false)
  }

  return {
    pending,
    formError,
    showValidationHint: !formError && hasValidationErrors,
    handleSubmit,
  }
}
