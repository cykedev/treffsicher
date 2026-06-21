import { useState, type FormEvent } from "react"
import { toast } from "sonner"
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
  // true, sobald ein gültiger Submit gestartet wurde — der Dirty-Guard darf den
  // server-seitigen Erfolgs-Redirect dann nicht mehr blockieren.
  submitted: boolean
  formError: string | null
  showValidationHint: boolean
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>
} {
  const [pending, setPending] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

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
    // Erfolg führt server-seitig zu einem redirect(); Guard ab hier deaktivieren.
    setSubmitted(true)

    const formData = new FormData(event.currentTarget)
    formData.set("date", normalizedDateIso)

    if (showShots) {
      appendShotArraysToFormData(formData, shots)
    }

    const result = sessionId
      ? await updateSession(sessionId, formData)
      : await createSession(formData)

    if (result.error) {
      setSubmitted(false)
      setFormError(result.error)
      toast.error(result.error)
      setPending(false)
      return
    }

    // Falls keine Navigation erfolgt, Formular wieder freigeben.
    setPending(false)
  }

  return {
    pending,
    submitted,
    formError,
    showValidationHint: !formError && hasValidationErrors,
    handleSubmit,
  }
}
