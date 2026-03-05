"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { deleteDiscipline } from "@/lib/disciplines/actions"
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

type Props = {
  disciplineId: string
  compact?: boolean
}

// Endgültiges Löschen wird separat vom Archivieren angeboten.
// Der Server blockiert den Vorgang, sobald die Disziplin noch verwendet wird.
export function DeleteDisciplineButton({ disciplineId, compact = false }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  function handleDelete(): void {
    setMessage(null)
    startTransition(async () => {
      const result = await deleteDiscipline(disciplineId)
      if (result.error) {
        setMessage(typeof result.error === "string" ? result.error : "Löschen fehlgeschlagen.")
        setConfirmOpen(false)
        return
      }
      if (result.success) {
        router.push("/disciplines")
      }
    })
  }

  return (
    <div className="space-y-2">
      {message && <p className="text-sm text-destructive">{message}</p>}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            size={compact ? "icon" : "sm"}
            className={compact ? "size-9 sm:h-8 sm:w-auto sm:px-3" : undefined}
            disabled={isPending}
            aria-label={isPending ? "Löschen..." : "Disziplin löschen"}
          >
            <Trash2 className={compact ? "h-4 w-4 sm:mr-1.5" : "mr-1.5 h-3.5 w-3.5"} />
            {compact ? (
              <span className="hidden sm:inline">{isPending ? "Löschen..." : "Löschen"}</span>
            ) : (
              <span>{isPending ? "Löschen..." : "Löschen"}</span>
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disziplin endgültig löschen?</AlertDialogTitle>
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
