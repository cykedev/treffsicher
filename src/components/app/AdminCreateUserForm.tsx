"use client"

import { useActionState, useEffect, useRef, useState } from "react"
import { createUser, type AdminActionResult } from "@/lib/admin/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function AdminCreateUserForm() {
  const [state, formAction, pending] = useActionState<AdminActionResult | null, FormData>(
    createUser,
    null
  )
  const formRef = useRef<HTMLFormElement>(null)
  const [showPassword, setShowPassword] = useState(false)

  useEffect(() => {
    if (!state?.success || !formRef.current) return
    formRef.current.reset()
  }, [state?.success])

  return (
    <form ref={formRef} action={formAction} className="max-w-3xl space-y-4">
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-500">Nutzer wurde angelegt.</p>}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2 md:col-span-1">
          <Label htmlFor="admin-create-email">E-Mail</Label>
          <Input
            id="admin-create-email"
            name="email"
            type="email"
            autoComplete="off"
            placeholder="user@example.com"
            required
            disabled={pending}
          />
        </div>

        <div className="space-y-2 md:col-span-1">
          <Label htmlFor="admin-create-password">Temporäres Passwort</Label>
          <Input
            id="admin-create-password"
            name="tempPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="mind. 12 Zeichen"
            minLength={12}
            required
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
        </div>

        <div className="space-y-2 md:col-span-1">
          <Label htmlFor="admin-create-role">Rolle</Label>
          <Select name="role" defaultValue="USER" required>
            <SelectTrigger id="admin-create-role" className="w-full sm:w-56" disabled={pending}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USER">USER</SelectItem>
              <SelectItem value="ADMIN">ADMIN</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Lege an..." : "Nutzer anlegen"}
      </Button>
    </form>
  )
}
