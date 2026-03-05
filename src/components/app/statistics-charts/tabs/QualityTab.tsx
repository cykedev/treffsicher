import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TabsContent } from "@/components/ui/tabs"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { shotDistributionBundledColors } from "@/components/app/statistics-charts/constants"
import { formatDisplayScore, renderScatterPoint } from "@/components/app/statistics-charts/utils"
import type { QualityTabModel } from "@/components/app/statistics-charts/tabs/types"

interface Props {
  model: QualityTabModel
}

export function QualityTab({ model }: Props) {
  const {
    filteredQualityCount,
    qualityChartConfig,
    qualityYAxis,
    qualityScoreLabel,
    qualityDisplayData,
    effectiveDisplayMode,
    selectedDiscipline,
    aggregatedShotDistribution,
    shotDistributionChartConfig,
    shotDistributionTicks,
  } = model

  return (
    <TabsContent value="qualitaet" className="space-y-4">
      {filteredQualityCount > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-baseline gap-2">
              Ausführungsqualität vs. Serienergebnis
              {effectiveDisplayMode === "projected" && selectedDiscipline && (
                <span className="text-base font-normal text-muted-foreground">
                  Hochrechnung auf {selectedDiscipline.shotsPerSeries} Sch./Serie
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={qualityChartConfig} className="h-[240px] w-full">
              <ScatterChart margin={{ top: 5, right: 20, bottom: 15, left: 0 }}>
                <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
                <XAxis
                  dataKey="quality"
                  type="number"
                  domain={[0.5, 5.5]}
                  ticks={[1, 2, 3, 4, 5]}
                  tickFormatter={(v) =>
                    ["", "Schlecht", "Mässig", "Mittel", "Gut", "Sehr gut"][v] ?? v
                  }
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  label={{
                    value: "Ausführung",
                    position: "insideBottom",
                    offset: -8,
                    fontSize: 11,
                    fill: "var(--muted-foreground)",
                  }}
                />
                <YAxis
                  dataKey="displayScore"
                  type="number"
                  domain={qualityYAxis.domain}
                  ticks={qualityYAxis.ticks}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={40}
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
                            {name === "displayScore" ? qualityScoreLabel : "Ausführung"}
                          </span>
                          <span className="text-foreground font-mono font-medium tabular-nums">
                            {typeof value === "number" && name === "displayScore"
                              ? formatDisplayScore(value, effectiveDisplayMode, selectedDiscipline)
                              : String(value ?? "")}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Scatter
                  data={qualityDisplayData}
                  fill="var(--chart-2)"
                  shape={(props: { cx?: number; cy?: number }) =>
                    renderScatterPoint(props, "var(--chart-2)")
                  }
                />
              </ScatterChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {aggregatedShotDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-baseline gap-2">
              Schussverteilung im Zeitverlauf
              <span className="text-base font-normal text-muted-foreground">
                Anteil je Ringwert in % · aggregiert & gebündelt
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={shotDistributionChartConfig} className="h-[300px] w-full">
              <AreaChart
                data={aggregatedShotDistribution}
                margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
              >
                <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
                <XAxis
                  dataKey="i"
                  ticks={shotDistributionTicks}
                  tickFormatter={(i: number) => aggregatedShotDistribution[i]?.dateLabel ?? ""}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, 100]}
                  tickFormatter={(v: number) => `${v}%`}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  width={38}
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      indicator="line"
                      labelFormatter={(_label, payload) => {
                        const tooltipLabel = payload?.[0]?.payload?.tooltipLabel
                        return typeof tooltipLabel === "string" ? tooltipLabel : ""
                      }}
                      payloadFilter={(item) =>
                        typeof item.value === "number" &&
                        Number.isFinite(item.value) &&
                        item.value > 0
                      }
                      payloadSorter={(a, b) => {
                        const order: Record<string, number> = {
                          r10: 5,
                          r9: 4,
                          r8: 3,
                          r7: 2,
                          r0to6: 1,
                        }
                        return (order[String(b.name)] ?? 0) - (order[String(a.name)] ?? 0)
                      }}
                      formatter={(value, name) => (
                        <div className="flex w-full items-center justify-between gap-6">
                          <span className="text-muted-foreground">
                            {name === "r10"
                              ? "10er"
                              : name === "r9"
                                ? "9er"
                                : name === "r8"
                                  ? "8er"
                                  : name === "r7"
                                    ? "7er"
                                    : "0–6er"}
                          </span>
                          <span className="text-foreground font-mono font-medium tabular-nums">
                            {typeof value === "number"
                              ? `${value.toFixed(1)} %`
                              : String(value ?? "")}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Legend
                  content={(props) => {
                    const { payload } = props as {
                      payload?: Array<{ value: string; color: string }>
                    }
                    const order: Record<string, number> = {
                      r10: 5,
                      r9: 4,
                      r8: 3,
                      r7: 2,
                      r0to6: 1,
                    }
                    const items = [...(payload ?? [])].sort((a, b) => {
                      return (order[b.value] ?? 0) - (order[a.value] ?? 0)
                    })
                    return (
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          justifyContent: "center",
                          gap: "4px 12px",
                          paddingTop: 8,
                          fontSize: 11,
                          color: "var(--muted-foreground)",
                        }}
                      >
                        {items.map((entry) => (
                          <div
                            key={entry.value}
                            style={{ display: "flex", alignItems: "center", gap: 4 }}
                          >
                            <div
                              style={{
                                width: 10,
                                height: 10,
                                background: entry.color,
                                borderRadius: 2,
                                flexShrink: 0,
                              }}
                            />
                            <span>
                              {entry.value === "r10"
                                ? "10er"
                                : entry.value === "r9"
                                  ? "9er"
                                  : entry.value === "r8"
                                    ? "8er"
                                    : entry.value === "r7"
                                      ? "7er"
                                      : "0–6er"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="r0to6"
                  stackId="rings"
                  stroke={shotDistributionBundledColors.r0to6}
                  fill={shotDistributionBundledColors.r0to6}
                  fillOpacity={0.9}
                />
                <Area
                  type="monotone"
                  dataKey="r7"
                  stackId="rings"
                  stroke={shotDistributionBundledColors.r7}
                  fill={shotDistributionBundledColors.r7}
                />
                <Area
                  type="monotone"
                  dataKey="r8"
                  stackId="rings"
                  stroke={shotDistributionBundledColors.r8}
                  fill={shotDistributionBundledColors.r8}
                />
                <Area
                  type="monotone"
                  dataKey="r9"
                  stackId="rings"
                  stroke={shotDistributionBundledColors.r9}
                  fill={shotDistributionBundledColors.r9}
                />
                <Area
                  type="monotone"
                  dataKey="r10"
                  stackId="rings"
                  stroke={shotDistributionBundledColors.r10}
                  fill={shotDistributionBundledColors.r10}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </TabsContent>
  )
}
