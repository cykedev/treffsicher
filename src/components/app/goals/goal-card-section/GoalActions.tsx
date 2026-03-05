"use client"

import Link from "next/link"
import { ArrowLeft, Pencil, Target, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
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

interface Props {
  pending: boolean
  backHref?: string
  onEditGoal: () => void
  onEditAssignments: () => void
  onDelete: () => void
}

// Aktionsleiste bündelt Bearbeiten/Zuweisen/Löschen, damit Card-Header aufgeräumt bleibt.
export function GoalActions({ pending, backHref, onEditGoal, onEditAssignments, onDelete }: Props) {
  return (
    <div className="flex items-start justify-end">
      {/* Mobile bekommt dieselben Aktionen als Icon/kurze Labels, damit nichts aus dem Header herausbricht. */}
      <div className="flex w-full flex-wrap items-center justify-end gap-0.5 sm:w-auto sm:shrink-0 sm:gap-1">
        <Button
          size="icon"
          variant="ghost"
          onClick={onEditGoal}
          disabled={pending}
          className="size-9"
          aria-label="Ziel bearbeiten"
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onEditAssignments}
          disabled={pending}
          className="px-2 sm:px-3"
          aria-label="Einheiten zuweisen"
        >
          <Target className="h-4 w-4 sm:mr-1.5" />
          <span className="hidden sm:inline">Zuweisen</span>
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              size="icon"
              variant="destructive"
              className="size-9 sm:h-8 sm:w-auto sm:px-3"
              disabled={pending}
              aria-label="Ziel löschen"
            >
              <Trash2 className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Löschen</span>
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Ziel löschen?</AlertDialogTitle>
              <AlertDialogDescription>
                Das Ziel und alle Verknüpfungen zu Einheiten werden entfernt.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Abbrechen</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-white hover:bg-destructive/90"
                onClick={onDelete}
              >
                Löschen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        {backHref && (
          <Button variant="ghost" size="sm" className="px-2 sm:px-3" asChild>
            <Link href={backHref} aria-label="Zurück zu Zielen">
              <ArrowLeft className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">Zurück</span>
            </Link>
          </Button>
        )}
      </div>
    </div>
  )
}
