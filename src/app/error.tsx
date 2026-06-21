"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: Props) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-lg font-semibold">Etwas ist schiefgelaufen</h2>
      <p className="text-sm text-muted-foreground">Ein unerwarteter Fehler ist aufgetreten.</p>
      <Button variant="outline" onClick={reset}>
        Erneut versuchen
      </Button>
    </div>
  )
}
