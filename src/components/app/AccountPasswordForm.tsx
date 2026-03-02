"use client"

import { useActionState, useEffect, useState } from "react"
import { signOut } from "next-auth/react"
import { changeOwnPassword, type AccountActionResult } from "@/lib/account/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/authValidation"

export function AccountPasswordForm() {
  const [showPasswords, setShowPasswords] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [state, formAction, pending] = useActionState<AccountActionResult | null, FormData>(
    changeOwnPassword,
    null
  )

  useEffect(() => {
    if (!state?.success) return

    let canceled = false

    async function finishPasswordChange() {
      setSigningOut(true)
      if (canceled) return
      await signOut({ callbackUrl: "/login?passwordChanged=1" })
    }

    void finishPasswordChange()
    return () => {
      canceled = true
    }
  }, [state?.success])

  const isBusy = pending || signingOut
  const inputType = showPasswords ? "text" : "password"

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && (
        <p className="text-sm text-muted-foreground">Passwort geändert. Abmeldung läuft...</p>
      )}

      <div className="space-y-2">
        <Label htmlFor="account-current-password">Aktuelles Passwort</Label>
        <Input
          id="account-current-password"
          name="currentPassword"
          type={inputType}
          autoComplete="current-password"
          maxLength={MAX_PASSWORD_LENGTH}
          required
          disabled={isBusy}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="account-new-password">Neues Passwort</Label>
        <Input
          id="account-new-password"
          name="newPassword"
          type={inputType}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          maxLength={MAX_PASSWORD_LENGTH}
          required
          disabled={isBusy}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="account-confirm-password">Neues Passwort bestätigen</Label>
        <Input
          id="account-confirm-password"
          name="confirmPassword"
          type={inputType}
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          maxLength={MAX_PASSWORD_LENGTH}
          required
          disabled={isBusy}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={isBusy}>
          {isBusy ? "Speichern..." : "Passwort ändern"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowPasswords((current) => !current)}
          disabled={isBusy}
          aria-label={showPasswords ? "Passwort ausblenden" : "Passwort einblenden"}
        >
          {showPasswords ? "Ausblenden" : "Einblenden"}
        </Button>
      </div>
    </form>
  )
}
