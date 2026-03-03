"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import type { AdminLoginRateLimitBucket } from "@/lib/admin/actions"
import { clearLoginRateLimitBucket } from "@/lib/admin/actions"
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
  buckets: AdminLoginRateLimitBucket[]
}

const DISPLAY_TIME_ZONE = "Europe/Berlin"

function formatDate(date: Date | null): string {
  if (!date) return "—"
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(new Date(date))
}

function getTypeBadgeClass(type: AdminLoginRateLimitBucket["type"]): string {
  if (type === "IP") {
    return "border-amber-800 bg-amber-950 text-amber-300"
  }
  return "border-sky-800 bg-sky-950 text-sky-300"
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("de-CH").format(value)
}

export function AdminLoginRateLimitTable({ buckets }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [clearCandidate, setClearCandidate] = useState<AdminLoginRateLimitBucket | null>(null)

  function performClear(bucketKey: string): void {
    setMessage(null)
    startTransition(async () => {
      const result = await clearLoginRateLimitBucket(bucketKey)
      if (result.error) {
        setMessage(result.error)
        return
      }
      router.refresh()
    })
  }

  if (buckets.length === 0) {
    return <p className="text-sm text-muted-foreground">Aktuell sind keine Login-Sperren aktiv.</p>
  }

  return (
    <div className="space-y-3">
      {message && <p className="text-sm text-destructive">{message}</p>}

      <div className="space-y-2 md:hidden">
        {buckets.map((bucket) => (
          <Card key={bucket.key}>
            <CardContent className="space-y-3 py-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline" className={getTypeBadgeClass(bucket.type)}>
                    {bucket.type}
                  </Badge>
                  <p className="text-xs text-muted-foreground">Fehlversuche: {bucket.attempts}</p>
                </div>
                <p className="break-all text-sm">{bucket.identifier}</p>
              </div>

              <div className="space-y-1 text-xs text-muted-foreground">
                <p>Fenster seit: {formatDate(bucket.windowStartedAt)}</p>
                <p>Letzter Versuch: {formatDate(bucket.lastAttemptAt)}</p>
                <p>Blockiert bis: {formatDate(bucket.blockedUntil)}</p>
              </div>

              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => setClearCandidate(bucket)}
              >
                Entsperren
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-[860px] w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="pb-2 pr-4 font-medium">Typ</th>
              <th className="pb-2 pr-4 font-medium">Identifikator</th>
              <th className="pb-2 pr-4 font-medium">Fehlversuche</th>
              <th className="pb-2 pr-4 font-medium">Fenster seit</th>
              <th className="pb-2 pr-4 font-medium">Letzter Versuch</th>
              <th className="pb-2 pr-4 font-medium">Blockiert bis</th>
              <th className="pb-2 font-medium">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {buckets.map((bucket) => (
              <tr key={bucket.key}>
                <td className="py-2 pr-4">
                  <Badge variant="outline" className={getTypeBadgeClass(bucket.type)}>
                    {bucket.type}
                  </Badge>
                </td>
                <td className="max-w-[300px] py-2 pr-4">
                  <p className="break-all">{bucket.identifier}</p>
                </td>
                <td className="py-2 pr-4">
                  <span className="tabular-nums">{formatCount(bucket.attempts)}</span>
                </td>
                <td className="py-2 pr-4 text-muted-foreground">{formatDate(bucket.windowStartedAt)}</td>
                <td className="py-2 pr-4 text-muted-foreground">{formatDate(bucket.lastAttemptAt)}</td>
                <td className="py-2 pr-4 text-muted-foreground">{formatDate(bucket.blockedUntil)}</td>
                <td className="py-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => setClearCandidate(bucket)}
                  >
                    Entsperren
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AlertDialog open={clearCandidate !== null} onOpenChange={(open) => !open && setClearCandidate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Login-Sperre entfernen?</AlertDialogTitle>
            <AlertDialogDescription>
              {clearCandidate
                ? `Der Bucket ${clearCandidate.type} (${clearCandidate.identifier}) wird sofort entfernt.`
                : "Der Bucket wird sofort entfernt."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              disabled={pending}
              onClick={() => {
                if (!clearCandidate) return
                const key = clearCandidate.key
                setClearCandidate(null)
                performClear(key)
              }}
            >
              Entsperren
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
