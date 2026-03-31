"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function SessionDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
      <h1 className="text-2xl font-bold">Fehler beim Laden der Einheit</h1>
      <p className="text-muted-foreground">
        Die Einheit konnte nicht geladen werden. Bitte versuche es erneut.
      </p>
      <div className="flex gap-2">
        <Button onClick={reset}>Erneut versuchen</Button>
        <Button variant="outline" asChild>
          <Link href="/sessions">Zurück zur Übersicht</Link>
        </Button>
      </div>
    </div>
  )
}
