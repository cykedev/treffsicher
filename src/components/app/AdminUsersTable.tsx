"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Pencil } from "lucide-react"
import { setUserActive, type AdminUserSummary } from "@/lib/admin/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface Props {
  users: AdminUserSummary[]
  currentAdminId: string
}

function getRoleBadgeClass(role: AdminUserSummary["role"]): string {
  if (role === "ADMIN") {
    return "border-amber-800 bg-amber-950 text-amber-300"
  }
  return "border-sky-800 bg-sky-950 text-sky-300"
}

function getStatusBadgeClass(isActive: boolean): string {
  if (isActive) {
    return "border-emerald-800 bg-emerald-950 text-emerald-300"
  }
  return "border-zinc-700 bg-zinc-900 text-zinc-300"
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

export function AdminUsersTable({ users, currentAdminId }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  function handleSetActive(user: AdminUserSummary, nextIsActive: boolean) {
    if (!nextIsActive) {
      const label = user.name ? `${user.name} <${user.email}>` : user.email
      const confirmed = window.confirm(`Nutzer "${label}" wirklich deaktivieren?`)
      if (!confirmed) return
    }

    setMessage(null)
    startTransition(async () => {
      const result = await setUserActive(user.id, nextIsActive)
      if (result.error) {
        setMessage(result.error)
        return
      }

      router.refresh()
    })
  }

  return (
    <div className="space-y-3">
      {message && <p className="text-sm text-destructive">{message}</p>}

      <div className="space-y-2 md:hidden">
        {users.map((user) => {
          const isSelf = user.id === currentAdminId
          return (
            <Card key={user.id}>
              <CardContent className="space-y-3 py-4">
                <div className="space-y-1">
                  <p className="break-words font-medium">{user.name ?? "—"}</p>
                  <p className="break-all text-sm text-muted-foreground">{user.email}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={getRoleBadgeClass(user.role)}>
                    {user.role}
                  </Badge>
                  <Badge variant="outline" className={getStatusBadgeClass(user.isActive)}>
                    {user.isActive ? "Aktiv" : "Inaktiv"}
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground">Angelegt: {formatDate(user.createdAt)}</p>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" asChild>
                    <Link href={`/admin/users/${user.id}/edit`}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" />
                      Bearbeiten
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={user.isActive ? "outline" : "secondary"}
                    disabled={pending || (isSelf && user.isActive)}
                    onClick={() => handleSetActive(user, !user.isActive)}
                  >
                    {user.isActive ? "Deaktivieren" : "Aktivieren"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-[760px] w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">Name</th>
              <th className="pb-2 pr-4 font-medium">E-Mail</th>
              <th className="pb-2 pr-4 font-medium">Rolle</th>
              <th className="pb-2 pr-4 font-medium">Status</th>
              <th className="pb-2 pr-4 font-medium">Angelegt</th>
              <th className="pb-2 font-medium">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {users.map((user) => {
              const isSelf = user.id === currentAdminId
              return (
                <tr key={user.id}>
                  <td className="py-2 pr-4 break-words">{user.name ?? "—"}</td>
                  <td className="py-2 pr-4 break-all">{user.email}</td>
                  <td className="py-2 pr-4">
                    <Badge variant="outline" className={getRoleBadgeClass(user.role)}>
                      {user.role}
                    </Badge>
                  </td>
                  <td className="py-2 pr-4">
                    <Badge variant="outline" className={getStatusBadgeClass(user.isActive)}>
                      {user.isActive ? "Aktiv" : "Inaktiv"}
                    </Badge>
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">{formatDate(user.createdAt)}</td>
                  <td className="py-2">
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="outline" asChild>
                        <Link href={`/admin/users/${user.id}/edit`}>
                          <Pencil className="mr-1.5 h-3.5 w-3.5" />
                          Bearbeiten
                        </Link>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={user.isActive ? "outline" : "secondary"}
                        disabled={pending || (isSelf && user.isActive)}
                        onClick={() => handleSetActive(user, !user.isActive)}
                      >
                        {user.isActive ? "Deaktivieren" : "Aktivieren"}
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted-foreground">
        Der eigene aktive Admin-Account kann nicht deaktiviert werden.
      </p>
    </div>
  )
}
