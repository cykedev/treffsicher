"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { setDisciplineArchived } from "@/lib/disciplines/actions"
import { Button } from "@/components/ui/button"

interface Props {
  disciplineId: string
  isArchived: boolean
  isSystem?: boolean
}

// Schaltet den Archiv-Status einer Disziplin um.
// System-Disziplinen koennen nur durch Admins umgeschaltet werden.
export function ArchiveDisciplineButton({ disciplineId, isArchived, isSystem = false }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleToggleArchive() {
    const nextArchived = !isArchived
    if (
      nextArchived &&
      !window.confirm("Disziplin archivieren? Sie erscheint dann nicht mehr in der Auswahl.")
    ) {
      return
    }

    if (!nextArchived && !window.confirm("Disziplin wieder aktivieren?")) return

    startTransition(async () => {
      await setDisciplineArchived(disciplineId, nextArchived)
      // Liste aktualisieren ohne Vollseiten-Reload
      router.refresh()
    })
  }

  return (
    <Button
      variant={isArchived ? "secondary" : isSystem ? "outline" : "ghost"}
      size="sm"
      onClick={handleToggleArchive}
      disabled={isPending}
    >
      {isPending ? "..." : isArchived ? "Aktivieren" : "Archivieren"}
    </Button>
  )
}
