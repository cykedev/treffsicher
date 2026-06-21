"use client"

import { Button } from "@/components/ui/button"

interface Props {
  sessionId?: string
  pending: boolean
  formError: string | null
  showValidationHint: boolean
  // Vom Parent berechnet: deaktiviert Submit (kein Typ / Validierungsfehler / Trefferlage).
  submitDisabled: boolean
  // Abbrechen wird vom Parent über den Dirty-Guard geführt.
  onCancel: () => void
}

// Footer bündelt Submit/Cancel/Fehlermeldungen, damit die Formularstruktur in Create/Edit identisch bleibt.
export function SessionFormFooter({
  sessionId,
  pending,
  formError,
  showValidationHint,
  submitDisabled,
  onCancel,
}: Props) {
  return (
    <>
      <div className="space-y-2">
        {formError && <p className="text-sm text-destructive">{formError}</p>}
      </div>

      <div className="flex gap-3">
        <Button type="submit" disabled={submitDisabled}>
          {pending ? "Speichern…" : sessionId ? "Änderungen speichern" : "Einheit speichern"}
        </Button>
        {showValidationHint && (
          <p className="self-center text-sm text-destructive">Bitte ungültige Werte korrigieren.</p>
        )}
        <Button type="button" variant="outline" disabled={pending} onClick={onCancel}>
          Abbrechen
        </Button>
      </div>
    </>
  )
}
