import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TabsContent } from "@/components/ui/tabs"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { radarSeriesConfig } from "@/components/app/statistics-charts/constants"
import { RadarLegend } from "@/components/app/statistics-charts/RadarLegend"
import type { SelfAssessmentTabModel } from "@/components/app/statistics-charts/tabs/types"

interface Props {
  model: SelfAssessmentTabModel
}

// Radar-Tab zeigt Prognose/Feedback als Paarvergleich über identische Dimensionen und Skalen.
export function SelfAssessmentTab({ model }: Props) {
  const {
    radarChartData,
    filteredRadarSessionsCount,
    radarDateLabel,
    radarChartConfig,
    radarLegendItems,
  } = model

  return (
    <TabsContent value="selbstbild">
      {radarChartData.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-wrap items-baseline gap-2">
              Prognose vs. Feedback (7 Dimensionen)
              <span className="text-base font-normal text-muted-foreground">
                {filteredRadarSessionsCount} Einheit
                {filteredRadarSessionsCount !== 1 ? "en" : ""}
                {radarDateLabel ? ` · ${radarDateLabel}` : ""}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={radarChartConfig} className="h-[340px] w-full">
              <RadarChart data={radarChartData} outerRadius="72%">
                {/* Etwas kleinerer Radius lässt lange deutsche Labels ohne Überlappung lesbar. */}
                <PolarGrid stroke="var(--border)" strokeOpacity={0.65} />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
                />
                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} tickLine={false} />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => (
                        <div className="flex w-full items-center justify-between gap-6">
                          <span className="text-muted-foreground">
                            {name === "prognosis"
                              ? radarSeriesConfig.prognosis.label
                              : radarSeriesConfig.feedback.label}
                          </span>
                          <span className="text-foreground font-mono font-medium tabular-nums">
                            {typeof value === "number" ? value.toFixed(1) : String(value ?? "")}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Radar
                  name="prognosis"
                  dataKey="prognosis"
                  stroke={radarSeriesConfig.prognosis.color}
                  fill={radarSeriesConfig.prognosis.color}
                  strokeWidth={2}
                  fillOpacity={0.2}
                />
                <Radar
                  name="feedback"
                  dataKey="feedback"
                  stroke={radarSeriesConfig.feedback.color}
                  fill={radarSeriesConfig.feedback.color}
                  strokeWidth={2}
                  fillOpacity={0.18}
                />
              </RadarChart>
            </ChartContainer>
            <RadarLegend items={radarLegendItems} />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Keine Prognose-/Feedback-Daten für den gewählten Filter.
          </CardContent>
        </Card>
      )}
    </TabsContent>
  )
}
