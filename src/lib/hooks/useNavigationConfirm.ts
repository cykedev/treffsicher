"use client"

import { useState } from "react"

interface Result {
  // true, wenn ein Bestätigungsdialog offen ist.
  isConfirmOpen: boolean
  // Startet den Schutz: zeigt Dialog, wenn dirty; sonst sofortige Ausführung.
  requestNavigation: (run: () => void) => void
  // Dialog-Aktionen.
  confirm: () => void
  cancel: () => void
}

interface Options {
  // Ungespeicherte Änderungen vorhanden?
  isDirty: boolean
}

// Kapselt den Bestätigungs-Flow für internes Abbrechen/Wegnavigieren.
// Wenn nichts geändert wurde, läuft die Aktion ohne Rückfrage.
export function useNavigationConfirm({ isDirty }: Options): Result {
  const [pendingRun, setPendingRun] = useState<(() => void) | null>(null)

  function requestNavigation(run: () => void): void {
    if (!isDirty) {
      run()
      return
    }
    setPendingRun(() => run)
  }

  function confirm(): void {
    pendingRun?.()
    setPendingRun(null)
  }

  function cancel(): void {
    setPendingRun(null)
  }

  return { isConfirmOpen: pendingRun !== null, requestNavigation, confirm, cancel }
}
