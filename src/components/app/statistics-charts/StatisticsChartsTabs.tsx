import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { HitLocationTab } from "@/components/app/statistics-charts/tabs/HitLocationTab"
import { QualityTab } from "@/components/app/statistics-charts/tabs/QualityTab"
import { SelfAssessmentTab } from "@/components/app/statistics-charts/tabs/SelfAssessmentTab"
import { TrendTab } from "@/components/app/statistics-charts/tabs/TrendTab"
import type { StatisticsChartsTabsProps } from "@/components/app/statistics-charts/tabs/types"
import { WellbeingTab } from "@/components/app/statistics-charts/tabs/WellbeingTab"

// Tabs bleiben horizontal scrollbar, damit alle Statistikbereiche auch mobil direkt erreichbar bleiben.
export function StatisticsChartsTabs({ model }: StatisticsChartsTabsProps) {
  return (
    <Tabs defaultValue="verlauf">
      {/* overflow-x-auto: Tabs scrollen auf kleinen Screens statt zu brechen */}
      <div className="no-scrollbar overflow-x-auto pb-px">
        <TabsList className="mb-2 w-max min-w-full">
          <TabsTrigger value="verlauf" className="shrink-0 flex-none">
            Verlauf
          </TabsTrigger>
          <TabsTrigger value="trefferlage" className="shrink-0 flex-none">
            Trefferlage
          </TabsTrigger>
          <TabsTrigger value="selbstbild" className="shrink-0 flex-none">
            Selbsteinschätzung
          </TabsTrigger>
          <TabsTrigger value="befinden" className="shrink-0 flex-none">
            Befinden
          </TabsTrigger>
          <TabsTrigger value="qualitaet" className="shrink-0 flex-none">
            Qualität &amp; Schüsse
          </TabsTrigger>
        </TabsList>
      </div>

      <TrendTab model={model.trend} />
      <HitLocationTab model={model.hitLocation} />
      <SelfAssessmentTab model={model.selfAssessment} />
      <WellbeingTab model={model.wellbeing} />
      <QualityTab model={model.quality} />
    </Tabs>
  )
}
