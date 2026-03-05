import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, XAxis, YAxis } from "recharts"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart"
import {
  CHART_TREND_STROKE_OPACITY,
  CHART_TREND_STROKE_WIDTH,
  HIT_LOCATION_TREND_BAND_OPACITY,
  HIT_LOCATION_ZERO_LINE_STROKE,
  HIT_LOCATION_ZERO_LINE_STROKE_OPACITY,
  HIT_LOCATION_ZERO_LINE_STROKE_WIDTH,
} from "@/components/app/statistics-charts/constants"
import {
  createActiveDotStyle,
  createDotStyle,
  createTrendStroke,
  formatSignedMillimeters,
} from "@/components/app/statistics-charts/utils"
import type { HitLocationTrendModel } from "@/components/app/statistics-charts/tabs/types"

interface Props {
  model: HitLocationTrendModel
}

export function HitLocationTrendCard({ model }: Props) {
  const {
    displayTimeZone,
    showHitLocationTrendX,
    showHitLocationTrendY,
    onToggleHitLocationTrendX,
    onToggleHitLocationTrendY,
    hitLocationTrendChartConfig,
    hitLocationTrendData,
    hitLocationTrendTicks,
    hitLocationTrendAxis,
    showHitLocationTrendXSeries,
    showHitLocationTrendYSeries,
  } = model

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex flex-wrap items-baseline gap-2">
            Trefferlage-Trend über Zeit
            <span className="text-base font-normal text-muted-foreground">
              → X (rechts/links) · ↑ Y (hoch/tief)
            </span>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant={showHitLocationTrendX ? "default" : "outline"}
              className="h-8 px-3 text-xs"
              // Mindestens eine Achse aktiv lassen, sonst wirkt das Chart "leer" trotz vorhandener Daten.
              disabled={showHitLocationTrendX && !showHitLocationTrendY}
              onClick={onToggleHitLocationTrendX}
            >
              X {showHitLocationTrendX ? "an" : "aus"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={showHitLocationTrendY ? "default" : "outline"}
              className="h-8 px-3 text-xs"
              disabled={showHitLocationTrendY && !showHitLocationTrendX}
              onClick={onToggleHitLocationTrendY}
            >
              Y {showHitLocationTrendY ? "an" : "aus"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ChartContainer config={hitLocationTrendChartConfig} className="h-[280px] w-full">
          <ComposedChart
            data={hitLocationTrendData}
            margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
          >
            <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} vertical={false} />
            <XAxis
              dataKey="i"
              ticks={hitLocationTrendTicks}
              tickFormatter={(i: number) => hitLocationTrendData[i]?.dateLabel ?? ""}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={hitLocationTrendAxis.domain}
              ticks={hitLocationTrendAxis.ticks}
              tickFormatter={(value: number) => `${value > 0 ? "+" : ""}${value.toFixed(1)}`}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={46}
            />
            <ReferenceLine
              y={0}
              stroke={HIT_LOCATION_ZERO_LINE_STROKE}
              strokeOpacity={HIT_LOCATION_ZERO_LINE_STROKE_OPACITY}
              strokeWidth={HIT_LOCATION_ZERO_LINE_STROKE_WIDTH}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(_label, payload) => {
                    // Index-gestützte Zuordnung vermeidet Datumsdrift, falls Recharts intern sortiert/filtert.
                    const index = Number(payload?.[0]?.payload?.i)
                    const dateValue = hitLocationTrendData[index]?.date
                    if (!dateValue) return ""
                    return new Intl.DateTimeFormat("de-CH", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      timeZone: displayTimeZone,
                    }).format(new Date(dateValue))
                  }}
                  formatter={(value, name) => (
                    <div className="flex w-full items-center justify-between gap-6">
                      <span className="text-muted-foreground">
                        {name === "x"
                          ? "X Punkt"
                          : name === "y"
                            ? "Y Punkt"
                            : name === "xTrend"
                              ? "X Trend"
                              : "Y Trend"}
                      </span>
                      <span className="text-foreground font-mono font-medium tabular-nums">
                        {formatSignedMillimeters(typeof value === "number" ? value : Number(value))}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            {showHitLocationTrendXSeries && (
              <Area
                type="monotone"
                dataKey="xTrendBand"
                legendType="none"
                tooltipType="none"
                stroke="none"
                fill={createTrendStroke("var(--chart-1)")}
                fillOpacity={HIT_LOCATION_TREND_BAND_OPACITY}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
            {showHitLocationTrendXSeries && (
              <Line
                type="monotone"
                dataKey="xTrend"
                name="xTrend"
                stroke={createTrendStroke("var(--chart-1)")}
                strokeWidth={CHART_TREND_STROKE_WIDTH}
                strokeOpacity={CHART_TREND_STROKE_OPACITY}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={false}
                connectNulls={false}
              />
            )}
            {showHitLocationTrendXSeries && (
              <Line
                type="linear"
                dataKey="x"
                name="x"
                // Eigene Punktserie hält Trendlinie und Messpunkte getrennt steuerbar.
                stroke="transparent"
                strokeWidth={0}
                dot={createDotStyle("var(--chart-1)")}
                activeDot={createActiveDotStyle("var(--chart-1)")}
                connectNulls={false}
              />
            )}
            {showHitLocationTrendYSeries && (
              <Area
                type="monotone"
                dataKey="yTrendBand"
                legendType="none"
                tooltipType="none"
                stroke="none"
                fill={createTrendStroke("var(--chart-2)")}
                fillOpacity={HIT_LOCATION_TREND_BAND_OPACITY}
                connectNulls={false}
                isAnimationActive={false}
              />
            )}
            {showHitLocationTrendYSeries && (
              <Line
                type="monotone"
                dataKey="yTrend"
                name="yTrend"
                stroke={createTrendStroke("var(--chart-2)")}
                strokeWidth={CHART_TREND_STROKE_WIDTH}
                strokeOpacity={CHART_TREND_STROKE_OPACITY}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={false}
                connectNulls={false}
              />
            )}
            {showHitLocationTrendYSeries && (
              <Line
                type="linear"
                dataKey="y"
                name="y"
                stroke="transparent"
                strokeWidth={0}
                dot={createDotStyle("var(--chart-2)")}
                activeDot={createActiveDotStyle("var(--chart-2)")}
                connectNulls={false}
              />
            )}
          </ComposedChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
