"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
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
    if (
      !window.confirm(
        "Einheit wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden."
      )
    ) {
      return
    }
    startTransition(async () => {
      const result = await deleteSession(sessionId)
      if (result.success) {
        router.push("/sessions")
      }
    })
  }

  return (
    <Button
      variant="destructive"
      size="sm"
      className="px-2 sm:px-3"
      onClick={handleDelete}
      disabled={isPending}
      aria-label={isPending ? "Löschen..." : "Löschen"}
    >
      <Trash2 className="h-4 w-4 sm:mr-1.5" />
      <span className="hidden sm:inline">{isPending ? "Löschen..." : "Löschen"}</span>
    </Button>
  )
}
