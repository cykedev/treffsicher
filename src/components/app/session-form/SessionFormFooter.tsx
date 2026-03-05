"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

interface Props {
  sessionId?: string
  pending: boolean
  hasType: boolean
  formError: string | null
  showValidationHint: boolean
  hasHitLocationValidationError: boolean
}

// Footer bündelt Submit/Cancel/Fehlermeldungen, damit die Formularstruktur in Create/Edit identisch bleibt.
export function SessionFormFooter({
  sessionId,
  pending,
  hasType,
  formError,
  showValidationHint,
  hasHitLocationValidationError,
}: Props) {
  const router = useRouter()

  return (
    <>
      <div className="space-y-2">
        {formError && <p className="text-sm text-destructive">{formError}</p>}
      </div>

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={pending || !hasType || showValidationHint || hasHitLocationValidationError}
        >
          {pending ? "Speichern..." : sessionId ? "Änderungen speichern" : "Einheit speichern"}
        </Button>
        {showValidationHint && (
          <p className="self-center text-sm text-destructive">Bitte ungültige Werte korrigieren.</p>
        )}
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => router.push(sessionId ? `/sessions/${sessionId}` : "/sessions")}
        >
          Abbrechen
        </Button>
      </div>
    </>
  )
}
