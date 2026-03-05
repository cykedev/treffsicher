"use client"

import Link from "next/link"
import { useActionState, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { updateUser, type AdminActionResult, type AdminUserSummary } from "@/lib/admin/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { MAX_USER_EMAIL_LENGTH } from "@/lib/authValidation"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Props {
  user: AdminUserSummary
}

export function AdminEditUserForm({ user }: Props) {
  const router = useRouter()
  const action = updateUser.bind(null, user.id)
  const [showPassword, setShowPassword] = useState(false)
  const [state, formAction, pending] = useActionState<AdminActionResult | null, FormData>(
    action,
    null
  )

  useEffect(() => {
    // Nach erfolgreichem Save zurück zur Übersicht, damit Tabelle und Detailzustand sofort konsistent sind.
    if (!state?.success) return
    router.push("/admin")
  }, [state?.success, router])

  return (
    <form action={formAction} className="max-w-3xl space-y-4">
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="space-y-2">
        <Label htmlFor="admin-edit-name">Name</Label>
        <Input
          id="admin-edit-name"
          name="name"
          type="text"
          defaultValue={user.name ?? ""}
          autoComplete="name"
          required
          disabled={pending}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-edit-email">E-Mail</Label>
        <Input
          id="admin-edit-email"
          name="email"
          type="email"
          defaultValue={user.email}
          autoComplete="off"
          maxLength={MAX_USER_EMAIL_LENGTH}
          required
          disabled={pending}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="admin-edit-role">Rolle</Label>
          <Select name="role" defaultValue={user.role} required>
            <SelectTrigger id="admin-edit-role" className="w-full sm:w-56" disabled={pending}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USER">USER</SelectItem>
              <SelectItem value="ADMIN">ADMIN</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="admin-edit-active">Status</Label>
          <Select name="isActive" defaultValue={user.isActive ? "true" : "false"} required>
            <SelectTrigger id="admin-edit-active" className="w-full sm:w-56" disabled={pending}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">Aktiv</SelectItem>
              <SelectItem value="false">Inaktiv</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="admin-edit-password">Neues temporaeres Passwort (optional)</Label>
        <Input
          id="admin-edit-password"
          name="tempPassword"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Leer lassen, wenn unveraendert"
          minLength={12}
          disabled={pending}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-auto"
          onClick={() => setShowPassword((current) => !current)}
          disabled={pending}
          aria-label={showPassword ? "Passwort ausblenden" : "Passwort einblenden"}
        >
          {showPassword ? "Ausblenden" : "Einblenden"}
        </Button>
        <p className="text-xs text-muted-foreground">
          Wenn gesetzt, ersetzt es sofort das bisherige Passwort.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Speichern..." : "Änderungen speichern"}
        </Button>
        <Button type="button" variant="outline" asChild disabled={pending}>
          <Link href="/admin">Abbrechen</Link>
        </Button>
      </div>
    </form>
  )
}
