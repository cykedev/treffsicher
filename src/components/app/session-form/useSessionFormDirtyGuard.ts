"use client"

import { useState } from "react"
import { useUnsavedChangesGuard } from "@/lib/hooks/useUnsavedChangesGuard"
import { useNavigationConfirm } from "@/lib/hooks/useNavigationConfirm"

interface Params {
  // Wird true, während gespeichert wird.
  pending: boolean
  // Wird true, sobald ein gültiger Submit gestartet wurde (Erfolgs-Redirect folgt server-seitig).
  submitted: boolean
}

interface Result {
  // Markiert das Formular als ungespeichert.
  markDirty: () => void
  // Aktueller Schutz-Zustand (für den beforeunload-Guard relevant).
  guardActive: boolean
  // Bestätigungs-Flow für internes Abbrechen/Wegnavigieren.
  nav: ReturnType<typeof useNavigationConfirm>
}

// Kapselt Dirty-Flag + beforeunload-Guard + Navigations-Bestätigung für das Session-Langformular.
// Während Submit/Erfolgs-Redirect bleibt der Guard inaktiv (!pending && !submitted),
// damit der server-seitige redirect() nicht fälschlich blockiert wird.
export function useSessionFormDirtyGuard({ pending, submitted }: Params): Result {
  const [dirty, setDirty] = useState(false)
  const guardActive = dirty && !pending && !submitted

  useUnsavedChangesGuard({ enabled: guardActive })
  const nav = useNavigationConfirm({ isDirty: guardActive })

  return {
    markDirty: () => setDirty(true),
    guardActive,
    nav,
  }
}
