"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Archive, RotateCcw } from "lucide-react"
import { setDisciplineArchived } from "@/lib/disciplines/actions"
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
  disciplineId: string
  isArchived: boolean
  compact?: boolean
}

// Schaltet den Archiv-Status einer Disziplin um.
// System-Disziplinen koennen nur durch Admins umgeschaltet werden.
export function ArchiveDisciplineButton({ disciplineId, isArchived, compact = false }: Props) {
  const [isPending, startTransition] = useTransition()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const router = useRouter()
  const nextArchived = !isArchived

  function handleToggleArchive(): void {
    startTransition(async () => {
      await setDisciplineArchived(disciplineId, nextArchived)
      // Liste aktualisieren ohne Vollseiten-Reload
      setConfirmOpen(false)
      router.refresh()
    })
  }

  return (
    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant={nextArchived ? "destructive" : "secondary"}
          size={compact ? "icon" : "sm"}
          disabled={isPending}
          className={compact ? "size-9 sm:h-8 sm:w-auto sm:px-3" : undefined}
          aria-label={nextArchived ? "Disziplin archivieren" : "Disziplin aktivieren"}
        >
          {isArchived ? (
            <RotateCcw className={compact ? "h-4 w-4 sm:mr-1.5" : "mr-1.5 h-3.5 w-3.5"} />
          ) : (
            <Archive className={compact ? "h-4 w-4 sm:mr-1.5" : "mr-1.5 h-3.5 w-3.5"} />
          )}
          {compact ? (
            <span className="hidden sm:inline">
              {isPending ? "..." : isArchived ? "Aktivieren" : "Archivieren"}
            </span>
          ) : (
            <span>{isPending ? "..." : isArchived ? "Aktivieren" : "Archivieren"}</span>
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {nextArchived ? "Disziplin archivieren?" : "Disziplin aktivieren?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {nextArchived
              ? "Archivierte Disziplinen erscheinen nicht mehr in der Auswahl."
              : "Die Disziplin wird wieder in der Auswahl angezeigt."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleToggleArchive}
            disabled={isPending}
            className={
              nextArchived ? "bg-destructive text-white hover:bg-destructive/90" : undefined
            }
          >
            {nextArchived ? "Archivieren" : "Aktivieren"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
