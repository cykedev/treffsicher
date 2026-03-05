"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { deleteSession } from "@/lib/sessions/actions"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

interface Props {
  sessionId: string
}

// Löscht eine Einheit nach expliziter Bestätigung in einem Dialog.
// Dialog statt Browser-confirm für konsistentes Verhalten auf Desktop und Mobil.
// und konsistente Gestaltung mit den restlichen shadcn-Komponenten.
export function DeleteSessionButton({ sessionId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  function handleDelete(): void {
    setMessage(null)
    startTransition(async () => {
      const result = await deleteSession(sessionId)
      if (result.error) {
        setMessage(result.error)
        return
      }
      if (result.success) {
        router.push("/sessions")
      }
    })
  }

  return (
    <div className="space-y-2">
      {message && <p className="text-sm text-destructive">{message}</p>}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            size="icon"
            // Mobil gleich gross wie andere Icon-Aktionen in der Kopfzeile;
            // ab `sm` wieder kompakt mit Textlabel.
            className="size-9 sm:h-8 sm:w-auto sm:px-3"
            disabled={isPending}
            aria-label={isPending ? "Löschen..." : "Löschen"}
          >
            <Trash2 className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">{isPending ? "Löschen..." : "Löschen"}</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Einheit löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              disabled={isPending}
              onClick={handleDelete}
            >
              Löschen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
