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
import { getHiddenDisciplineIds } from "@/lib/disciplines/actions"
import { StatisticsChartsWrapper } from "@/components/app/statistics-charts/StatisticsChartsWrapper"
import { PageHeader } from "@/components/app/shell/PageHeader"

export default async function StatisticsPage() {
  const displayTimeZone = getDisplayTimeZone()
  const session = await getAuthSession()
  if (!session) redirect("/login")

  // Alle Daten parallel laden — Client-Komponente filtert Ergebnisse in Memory
  const [
    sessions,
    wellbeingData,
    qualityData,
    shotDistributionData,
    radarData,
    hiddenDisciplineIds,
  ] = await Promise.all([
    getStatsData({}),
    getWellbeingCorrelationData({}),
    getQualityVsScoreData({}),
    getShotDistributionData({}),
    getRadarComparisonData({}),
    getHiddenDisciplineIds(),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Statistiken"
        description="Übersicht je Disziplin sowie Verläufe, Trefferlagen, Korrelationen, Schussverteilung und Prognose/Feedback."
      />

      <StatisticsChartsWrapper
        data={{
          sessions,
          wellbeingData,
          qualityData,
          shotDistributionData,
          radarData,
        }}
        hiddenDisciplineIds={hiddenDisciplineIds}
        displayTimeZone={displayTimeZone}
      />
    </div>
  )
}
