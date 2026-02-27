"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { archiveDiscipline } from "@/lib/disciplines/actions"
import { Button } from "@/components/ui/button"

interface Props {
  disciplineId: string
}

// Archiviert eine eigene Disziplin nach Bestätigung.
// Archivierte Disziplinen erscheinen nicht mehr in der Auswahl, aber bestehende Einheiten bleiben lesbar.
export function ArchiveDisciplineButton({ disciplineId }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleArchive() {
    if (!window.confirm("Disziplin archivieren? Sie erscheint dann nicht mehr in der Auswahl.")) {
      return
    }
    startTransition(async () => {
      await archiveDiscipline(disciplineId)
      // Liste aktualisieren ohne Vollseiten-Reload
      router.refresh()
    })
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleArchive} disabled={isPending}>
      {isPending ? "..." : "Archivieren"}
    </Button>
  )
}
