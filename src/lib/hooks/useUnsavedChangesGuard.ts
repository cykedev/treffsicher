"use client"

import { useEffect } from "react"

interface Options {
  // Aktiv schalten, sobald das Formular ungespeicherte Änderungen hat.
  enabled: boolean
}

// Warnt den Nutzer vor Datenverlust, wenn er den Tab schließt oder neu lädt,
// solange ungespeicherte Änderungen bestehen (enabled === true).
// Internes Wegnavigieren/Abbrechen wird über useNavigationConfirm() abgesichert.
export function useUnsavedChangesGuard({ enabled }: Options): void {
  useEffect(() => {
    if (!enabled) return

    function handleBeforeUnload(event: BeforeUnloadEvent): void {
      event.preventDefault()
      // Moderne Browser zeigen einen generischen Text; returnValue wird für ältere benötigt.
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [enabled])
}
