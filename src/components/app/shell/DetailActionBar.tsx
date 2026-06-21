import type { ReactNode } from "react"

interface Props {
  children: ReactNode
}

// Einheitliche Detail-Aktionsleiste: oben rechts, alle Aktionen als ghost-Buttons.
// Verbindliche Reihenfolge der Children: fachliche/sekundäre Aktionen → destruktive Aktion → Zurück.
export function DetailActionBar({ children }: Props) {
  return <div className="flex flex-wrap items-center justify-end gap-0.5 sm:gap-1">{children}</div>
}
