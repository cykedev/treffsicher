import { Area, AreaChart, CartesianGrid, Legend, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { shotDistributionBundledColors } from "@/components/app/statistics-charts/constants"
import type { QualityTabModel } from "@/components/app/statistics-charts/tabs/types"

interface Props {
  model: QualityTabModel["distribution"]
}

const RING_ORDER: Record<string, number> = {
  r10: 5,
  r9: 4,
  r8: 3,
  r7: 2,
  r0to6: 1,
}

function formatRingLabel(value: string): string {
  if (value === "r10") return "10er"
  if (value === "r9") return "9er"
  if (value === "r8") return "8er"
  if (value === "r7") return "7er"
  return "0–6er"
}

export function ShotDistributionTimelineCard({ model }: Props) {
  const { aggregatedShotDistribution, shotDistributionChartConfig, shotDistributionTicks } = model

  if (aggregatedShotDistribution.length === 0) return null

  return (
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
              tickFormatter={(index: number) => aggregatedShotDistribution[index]?.dateLabel ?? ""}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(value: number) => `${value}%`}
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
                  // Null-/0-Werte ausblenden, damit das Tooltip nur die aktuell relevanten Ringe zeigt.
                  payloadFilter={(item) =>
                    typeof item.value === "number" && Number.isFinite(item.value) && item.value > 0
                  }
                  payloadSorter={(a, b) =>
                    (RING_ORDER[String(b.name)] ?? 0) - (RING_ORDER[String(a.name)] ?? 0)
                  }
                  formatter={(value, name) => (
                    <div className="flex w-full items-center justify-between gap-6">
                      <span className="text-muted-foreground">{formatRingLabel(String(name))}</span>
                      <span className="text-foreground font-mono font-medium tabular-nums">
                        {typeof value === "number" ? `${value.toFixed(1)} %` : String(value ?? "")}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Legend
              content={(props) => {
                const payload = (props as { payload?: Array<{ value: string; color: string }> })
                  .payload
                // Legende in derselben Rangfolge wie Tooltip halten (10er zuerst), sonst wirkt die Lesereihenfolge inkonsistent.
                const items = [...(payload ?? [])].sort((a, b) => {
                  return (RING_ORDER[b.value] ?? 0) - (RING_ORDER[a.value] ?? 0)
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
                        <span>{formatRingLabel(entry.value)}</span>
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
  )
}
