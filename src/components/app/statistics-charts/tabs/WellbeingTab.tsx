import { CartesianGrid, Scatter, ScatterChart, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TabsContent } from "@/components/ui/tabs"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { formatDisplayScore, renderScatterPoint } from "@/components/app/statistics-charts/utils"
import type { WellbeingTabModel } from "@/components/app/statistics-charts/tabs/types"

interface Props {
  model: WellbeingTabModel
}

export function WellbeingTab({ model }: Props) {
  const {
    filteredWellbeingCount,
    wellbeingChartConfig,
    wellbeingYAxis,
    wellbeingScoreLabel,
    wellbeingDisplayData,
    effectiveDisplayMode,
    selectedDiscipline,
  } = model

  return (
    <TabsContent value="befinden" className="overflow-x-hidden">
      {filteredWellbeingCount > 0 ? (
        <div className="grid min-w-0 gap-4 sm:grid-cols-2">
          {(
            [
              { key: "sleep" as const, label: "Schlaf" },
              { key: "energy" as const, label: "Energie" },
              { key: "stress" as const, label: "Stress" },
              { key: "motivation" as const, label: "Motivation" },
            ] as const
          ).map(({ key, label }) => (
            <Card key={key} className="min-w-0 overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-baseline gap-2 text-base">
                  {label}
                  {effectiveDisplayMode === "projected" && selectedDiscipline && (
                    <span className="text-sm font-normal text-muted-foreground">Hochrechnung</span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="min-w-0 overflow-x-hidden">
                <ChartContainer
                  config={wellbeingChartConfig}
                  className="h-[180px] w-full max-w-full overflow-hidden"
                >
                  <ScatterChart margin={{ top: 5, right: 8, bottom: 16, left: 0 }}>
                    <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
                    <XAxis
                      dataKey={key}
                      type="number"
                      domain={[0, 100]}
                      allowDecimals={true}
                      label={{
                        value: label,
                        position: "insideBottom",
                        offset: -8,
                        fontSize: 11,
                        fill: "var(--muted-foreground)",
                      }}
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      dataKey="displayScore"
                      type="number"
                      domain={wellbeingYAxis.domain}
                      ticks={wellbeingYAxis.ticks}
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      width={34}
                      tickFormatter={(v: number) =>
                        effectiveDisplayMode === "projected" && selectedDiscipline
                          ? formatDisplayScore(v, effectiveDisplayMode, selectedDiscipline)
                          : v.toFixed(2)
                      }
                    />
                    <ChartTooltip
                      cursor={{ fill: "var(--muted)", opacity: 0.3 }}
                      content={
                        <ChartTooltipContent
                          hideLabel
                          formatter={(value, name) => (
                            <div className="flex w-full items-center justify-between gap-6">
                              <span className="text-muted-foreground">
                                {name === "displayScore" ? wellbeingScoreLabel : label}
                              </span>
                              <span className="text-foreground font-mono font-medium tabular-nums">
                                {typeof value === "number" && name === "displayScore"
                                  ? formatDisplayScore(
                                      value,
                                      effectiveDisplayMode,
                                      selectedDiscipline
                                    )
                                  : String(value ?? "")}
                              </span>
                            </div>
                          )}
                        />
                      }
                    />
                    <Scatter
                      data={wellbeingDisplayData}
                      fill="var(--chart-1)"
                      shape={(props: { cx?: number; cy?: number }) =>
                        renderScatterPoint(props, "var(--chart-1)")
                      }
                    />
                  </ScatterChart>
                </ChartContainer>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Keine Befinden-Daten für den gewählten Filter.
          </CardContent>
        </Card>
      )}
    </TabsContent>
  )
}
