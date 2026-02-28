import { redirect } from "next/navigation"
import dynamic from "next/dynamic"
import { getAuthSession } from "@/lib/auth-helpers"
import {
  getStatsData,
  getWellbeingCorrelationData,
  getQualityVsScoreData,
} from "@/lib/stats/actions"

// ssr: false verhindert den Radix-UI-Hydration-Fehler (aria-controls IDs differ between
// SSR and client). Da die Seite auth-geschützt ist, ist kein SSR für die Charts nötig.
const StatistikCharts = dynamic(
  () => import("@/components/app/StatistikCharts").then((m) => m.StatistikCharts),
  { ssr: false }
)

export default async function StatistikenPage() {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  // Alle Daten parallel laden — Client-Komponente filtert Ergebnisse in Memory
  const [sessions, wellbeingData, qualityData] = await Promise.all([
    getStatsData({}),
    getWellbeingCorrelationData({}),
    getQualityVsScoreData({}),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Statistiken</h1>
        <p className="text-muted-foreground">Ergebnisverlauf, Serienanalyse und Befinden-Korrelation</p>
      </div>

      <StatistikCharts sessions={sessions} wellbeingData={wellbeingData} qualityData={qualityData} />
    </div>
  )
}
