"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { deleteSession } from "@/lib/sessions/actions"
import { Button } from "@/components/ui/button"

interface Props {
  sessionId: string
}

// Löscht eine Einheit nach Bestätigung durch den Nutzer.
// Nutzt window.confirm für einfache Bestätigung ohne externe Abhängigkeit.
export function DeleteSessionButton({ sessionId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleDelete() {
    if (!window.confirm("Einheit wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.")) {
      return
    }
    startTransition(async () => {
      const result = await deleteSession(sessionId)
      if (result.success) {
        router.push("/einheiten")
      }
    })
  }

  return (
    <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isPending}>
      {isPending ? "Löschen..." : "Löschen"}
    </Button>
  )
}
