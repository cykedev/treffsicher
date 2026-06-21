import { useMemo } from "react"
import type { DisciplineForStats, StatsSession } from "@/lib/stats/actions"

interface Params {
  sessions: StatsSession[]
  hiddenDisciplineIds: string[]
}

export function useAvailableDisciplines({ sessions, hiddenDisciplineIds }: Params) {
  return useMemo<DisciplineForStats[]>(() => {
    // Filterliste aus vorhandenen Sessions ableiten — ausgeblendete Disziplinen ausschliessen.
    // So bleibt die Filterliste auf tatsaechlich vorhandene und sichtbare Daten begrenzt.
    const hiddenSet = new Set(hiddenDisciplineIds)
    const seen = new Set<string>()
    const result: DisciplineForStats[] = []
    for (const session of sessions) {
      if (
        session.discipline &&
        !seen.has(session.discipline.id) &&
        !hiddenSet.has(session.discipline.id)
      ) {
        seen.add(session.discipline.id)
        result.push(session.discipline)
      }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name, "de"))
  }, [sessions, hiddenDisciplineIds])
}
