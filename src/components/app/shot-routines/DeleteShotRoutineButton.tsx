"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"

import { deleteShotRoutine } from "@/lib/shot-routines/actions"
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
  routineId: string
}

// Löscht einen Ablauf mit dem gleichen Dialogmuster wie andere destruktive Aktionen.
// Lösch-Interaktion bewusst an das gemeinsame Muster angepasst, damit Verhalten überall gleich bleibt.
export function DeleteShotRoutineButton({ routineId }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  function handleDelete(): void {
    setMessage(null)
    startTransition(async () => {
      const result = await deleteShotRoutine(routineId)
      if (result.error) {
        setMessage(result.error)
        return
      }
      router.push("/shot-routines")
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
            // Header-Aktionen bleiben auf Mobil als Icon-Leiste oben;
            // ab `sm` wird das Textlabel wieder eingeblendet.
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
            <AlertDialogTitle>Ablauf löschen?</AlertDialogTitle>
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
