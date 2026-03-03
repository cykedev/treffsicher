"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Pencil } from "lucide-react"
import { setUserActive, type AdminUserListItem } from "@/lib/admin/actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface Props {
  users: AdminUserListItem[]
  currentAdminId: string
}

const DISPLAY_TIME_ZONE = "Europe/Berlin"

function getRoleBadgeClass(role: AdminUserListItem["role"]): string {
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
    timeZone: DISPLAY_TIME_ZONE,
  }).format(new Date(date))
}

function formatOptionalDate(date: Date | null): string {
  if (!date) return "—"
  return formatDate(date)
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("de-CH").format(value)
}

export function AdminUsersTable({ users, currentAdminId }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [deactivationCandidate, setDeactivationCandidate] = useState<AdminUserListItem | null>(null)

  function performSetActive(userId: string, nextIsActive: boolean): void {
    setMessage(null)
    startTransition(async () => {
      const result = await setUserActive(userId, nextIsActive)
      if (result.error) {
        setMessage(result.error)
        return
      }

      router.refresh()
    })
  }

  function handleSetActive(user: AdminUserListItem, nextIsActive: boolean) {
    if (!nextIsActive) {
      setDeactivationCandidate(user)
      return
    }
    performSetActive(user.id, nextIsActive)
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

                <p className="text-xs text-muted-foreground">
                  Angelegt: {formatDate(user.createdAt)}
                </p>
                <p className="text-xs text-muted-foreground">
                  Aktivität: {formatCount(user.sessionsCount)} Einheiten,{" "}
                  {formatCount(user.goalsCount)} Ziele, {formatCount(user.shotRoutinesCount)}{" "}
                  Abläufe
                </p>
                <p className="text-xs text-muted-foreground">
                  Letzte Session-Änderung: {formatOptionalDate(user.lastSessionEditAt)}
                </p>

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
        <table className="min-w-[920px] w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">Nutzer</th>
              <th className="pb-2 pr-4 font-medium">Rolle</th>
              <th className="pb-2 pr-4 font-medium">Status</th>
              <th className="pb-2 pr-4 font-medium">Aktivität</th>
              <th className="pb-2 pr-4 font-medium">Letzte Session-Änderung</th>
              <th className="pb-2 font-medium">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {users.map((user) => {
              const isSelf = user.id === currentAdminId
              return (
                <tr key={user.id}>
                  <td className="py-3 pr-4">
                    <div className="max-w-[280px] space-y-1">
                      <p className="break-words font-medium leading-tight">{user.name ?? "—"}</p>
                      <p className="break-all text-xs text-muted-foreground">{user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Angelegt: {formatDate(user.createdAt)}
                      </p>
                    </div>
                  </td>
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
                  <td className="py-3 pr-4">
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>
                        <span className="tabular-nums text-foreground">
                          {formatCount(user.sessionsCount)}
                        </span>{" "}
                        Einheiten
                      </p>
                      <p>
                        <span className="tabular-nums text-foreground">
                          {formatCount(user.goalsCount)}
                        </span>{" "}
                        Ziele
                      </p>
                      <p>
                        <span className="tabular-nums text-foreground">
                          {formatCount(user.shotRoutinesCount)}
                        </span>{" "}
                        Abläufe
                      </p>
                    </div>
                  </td>
                  <td className="py-2 pr-4 text-muted-foreground">
                    {formatOptionalDate(user.lastSessionEditAt)}
                  </td>
                  <td className="py-2">
                    <div className="flex min-w-[160px] flex-col gap-2">
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

      <AlertDialog
        open={deactivationCandidate !== null}
        onOpenChange={(open) => !open && setDeactivationCandidate(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Nutzer deaktivieren?</AlertDialogTitle>
            <AlertDialogDescription>
              {deactivationCandidate
                ? `Der Account "${deactivationCandidate.name ? `${deactivationCandidate.name} <${deactivationCandidate.email}>` : deactivationCandidate.email}" kann sich danach nicht mehr anmelden.`
                : "Der Account kann sich danach nicht mehr anmelden."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={pending}
              onClick={() => {
                if (!deactivationCandidate) return
                const candidateId = deactivationCandidate.id
                setDeactivationCandidate(null)
                performSetActive(candidateId, false)
              }}
            >
              Deaktivieren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
