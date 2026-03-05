import { CartesianGrid, Scatter, ScatterChart, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { formatDisplayScore, renderScatterPoint } from "@/components/app/statistics-charts/utils"
import type { QualityTabModel } from "@/components/app/statistics-charts/tabs/types"

interface Props {
  model: QualityTabModel["scatter"]
}

export function QualityScatterCard({ model }: Props) {
  const {
    filteredQualityCount,
    qualityChartConfig,
    qualityYAxis,
    qualityScoreLabel,
    qualityDisplayData,
    effectiveDisplayMode,
    selectedDiscipline,
  } = model

  if (filteredQualityCount <= 1) return null

  return (
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
              tickFormatter={(value) =>
                ["", "Schlecht", "Mässig", "Mittel", "Gut", "Sehr gut"][value] ?? value
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
              tickFormatter={(value: number) =>
                effectiveDisplayMode === "projected" && selectedDiscipline
                  ? formatDisplayScore(value, effectiveDisplayMode, selectedDiscipline)
                  : value.toFixed(2)
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
  )
}
