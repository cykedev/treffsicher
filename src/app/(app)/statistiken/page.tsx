import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth-helpers"
import { getStatsData } from "@/lib/stats/actions"
import { StatistikCharts } from "@/components/app/StatistikCharts"

export default async function StatistikenPage() {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  // Alle Einheiten laden — Client-Komponente filtert in Memory
  const sessions = await getStatsData({})

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Statistiken</h1>
        <p className="text-muted-foreground">Ergebnisverlauf und Serienanalyse</p>
      </div>

      <StatistikCharts sessions={sessions} />
    </div>
  )
}
