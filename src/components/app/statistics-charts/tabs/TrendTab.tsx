import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Line, XAxis, YAxis } from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TabsContent } from "@/components/ui/tabs"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  CHART_TREND_BAND_FILL,
  CHART_TREND_BAND_OPACITY,
  CHART_TREND_STROKE_OPACITY,
  CHART_TREND_STROKE_WIDTH,
} from "@/components/app/statistics-charts/constants"
import {
  createActiveDotStyle,
  createDotStyle,
  createTrendStroke,
  formatDisplayScore,
} from "@/components/app/statistics-charts/utils"
import type { TrendTabModel } from "@/components/app/statistics-charts/tabs/types"

interface Props {
  model: TrendTabModel
}

export function TrendTab({ model }: Props) {
  const {
    hasData,
    effectiveDisplayMode,
    selectedDiscipline,
    totalDisciplineShots,
    lineChartConfig,
    lineData,
    lineChartTicks,
    resultTrendYAxis,
    metricLabel,
    barData,
    disciplineFilter,
    seriesChartConfig,
    seriesYAxis,
    seriesHasDecimals,
  } = model

  return (
    <TabsContent value="verlauf" className="space-y-4">
      {!hasData ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Keine Daten für den gewählten Filter.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-baseline gap-2">
                Ergebnisverlauf
                <span className="text-base font-normal text-muted-foreground">
                  {effectiveDisplayMode === "projected" && selectedDiscipline
                    ? `Hochrechnung auf ${totalDisciplineShots} Schuss`
                    : "Ringe pro Schuss"}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={lineChartConfig} className="h-[280px] w-full">
                <ComposedChart data={lineData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
                  {/* dataKey="i" statt "datum" — verhindert Kollision wenn zwei Einheiten
                  am selben Tag existieren (gleicher Datumsstring → gleicher x-Slot) */}
                  <XAxis
                    dataKey="i"
                    ticks={lineChartTicks}
                    tickFormatter={(i: number) => lineData[i]?.datum ?? ""}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    domain={resultTrendYAxis.domain}
                    ticks={resultTrendYAxis.ticks}
                    allowDataOverflow={true}
                    tickFormatter={(v: number) =>
                      effectiveDisplayMode === "projected" && selectedDiscipline
                        ? formatDisplayScore(v, effectiveDisplayMode, selectedDiscipline)
                        : v
                            .toFixed(2)
                            .replace(/\.00$/, "")
                            .replace(/(\.\d)0$/, "$1")
                    }
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    axisLine={false}
                    tickLine={false}
                    width={40}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        indicator="line"
                        labelFormatter={(_label, payload) => {
                          const index = Number(payload?.[0]?.payload?.i)
                          return lineData[index]?.datum ?? ""
                        }}
                        formatter={(value, name) => (
                          <div className="flex w-full items-center justify-between gap-6">
                            <span className="text-muted-foreground">
                              {name === "wert" ? metricLabel : "Trend"}
                            </span>
                            <span className="text-foreground font-mono font-medium tabular-nums">
                              {typeof value === "number"
                                ? formatDisplayScore(value, effectiveDisplayMode, selectedDiscipline)
                                : String(value ?? "")}
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    type="monotone"
                    dataKey="trendBand"
                    legendType="none"
                    tooltipType="none"
                    stroke="none"
                    fill={CHART_TREND_BAND_FILL}
                    fillOpacity={CHART_TREND_BAND_OPACITY}
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="trend"
                    name="trend"
                    stroke={createTrendStroke("var(--chart-1)")}
                    strokeWidth={CHART_TREND_STROKE_WIDTH}
                    strokeOpacity={CHART_TREND_STROKE_OPACITY}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    dot={false}
                    connectNulls={false}
                  />
                  <Line
                    type="linear"
                    dataKey="wert"
                    name="wert"
                    stroke="transparent"
                    strokeWidth={0}
                    dot={createDotStyle("var(--chart-1)")}
                    activeDot={createActiveDotStyle("var(--chart-1)")}
                    connectNulls={false}
                  />
                </ComposedChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {barData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-baseline gap-2">
                  Serienwertungen
                  {disciplineFilter === "all" && (
                    <span className="text-sm font-normal text-muted-foreground">
                      (Disziplin wählen für vergleichbare Werte)
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={seriesChartConfig} className="h-[240px] w-full">
                  <BarChart data={barData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={seriesYAxis.domain}
                      ticks={seriesYAxis.ticks}
                      tickFormatter={(v: number) =>
                        seriesHasDecimals ? v.toFixed(1).replace(/\.0$/, "") : String(Math.round(v))
                      }
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      width={36}
                    />
                    <ChartTooltip
                      cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                      content={<ChartTooltipContent indicator="line" />}
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="Min" fill="var(--chart-2)" opacity={0.5} />
                    <Bar dataKey="Avg" fill="var(--chart-1)" />
                    <Bar dataKey="Max" fill="var(--chart-1)" opacity={0.4} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </TabsContent>
  )
}
