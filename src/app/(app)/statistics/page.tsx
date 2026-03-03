import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth-helpers"
import { getDisplayTimeZone } from "@/lib/dateTime"
import {
  getStatsData,
  getWellbeingCorrelationData,
  getQualityVsScoreData,
  getShotDistributionData,
  getRadarComparisonData,
} from "@/lib/stats/actions"
import { StatisticsChartsWrapper } from "@/components/app/StatisticsChartsWrapper"

export default async function StatisticsPage() {
  const displayTimeZone = getDisplayTimeZone()
  const session = await getAuthSession()
  if (!session) redirect("/login")

  // Alle Daten parallel laden — Client-Komponente filtert Ergebnisse in Memory
  const [sessions, wellbeingData, qualityData, shotDistributionData, radarData] = await Promise.all(
    [
      getStatsData({}),
      getWellbeingCorrelationData({}),
      getQualityVsScoreData({}),
      getShotDistributionData({}),
      getRadarComparisonData({}),
    ]
  )

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Statistiken</h1>
        <p className="text-muted-foreground">
          Vergleiche Verläufe, Trefferlagen, Korrelationen, Schussverteilung sowie Prognose und
          Feedback.
        </p>
      </div>

      <StatisticsChartsWrapper
        sessions={sessions}
        wellbeingData={wellbeingData}
        qualityData={qualityData}
        shotDistributionData={shotDistributionData}
        radarData={radarData}
        displayTimeZone={displayTimeZone}
      />
    </div>
  )
}
