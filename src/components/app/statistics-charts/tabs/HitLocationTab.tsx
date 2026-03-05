import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TabsContent } from "@/components/ui/tabs"
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
  HIT_LOCATION_CLOUD_AXIS_SIZE,
  HIT_LOCATION_CLOUD_MARGIN,
  HIT_LOCATION_CLOUD_TRAIL_END_RADIUS,
  HIT_LOCATION_CLOUD_TRAIL_START_RADIUS,
  HIT_LOCATION_CLOUD_TRAIL_STROKE,
  HIT_LOCATION_CLOUD_TRAIL_STROKE_OPACITY,
  HIT_LOCATION_CLOUD_TRAIL_STROKE_WIDTH,
  HIT_LOCATION_TREND_BAND_OPACITY,
  HIT_LOCATION_ZERO_LINE_STROKE,
  HIT_LOCATION_ZERO_LINE_STROKE_OPACITY,
  HIT_LOCATION_ZERO_LINE_STROKE_WIDTH,
} from "@/components/app/statistics-charts/constants"
import {
  createActiveDotStyle,
  createDotStyle,
  createTrendStroke,
  formatDirectionalMillimeters,
  formatSignedMillimeters,
  renderScatterPoint,
} from "@/components/app/statistics-charts/utils"
import type { HitLocationTabModel } from "@/components/app/statistics-charts/tabs/types"

interface Props {
  model: HitLocationTabModel
}

export function HitLocationTab({ model }: Props) {
  const {
    filteredHitLocations,
    showCloudTrail,
    onToggleCloudTrail,
    hitLocationCloudChartConfig,
    hitLocationCloudAxes,
    displayTimeZone,
    hitLocationCloudCurveSegments,
    hitLocationCloudPathStart,
    hitLocationCloudPathEnd,
    hitLocationMetrics,
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
    <TabsContent value="trefferlage" className="space-y-4">
      {filteredHitLocations.length > 0 ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <CardTitle className="flex flex-wrap items-baseline gap-2">
                  Trefferlagen-Cloud
                  <span className="text-base font-normal text-muted-foreground">
                    {filteredHitLocations.length} Einheit
                    {filteredHitLocations.length !== 1 ? "en" : ""}
                  </span>
                </CardTitle>
                <Button
                  type="button"
                  size="sm"
                  variant={showCloudTrail ? "default" : "outline"}
                  className="h-8 px-3 text-xs"
                  onClick={onToggleCloudTrail}
                >
                  Verlauf {showCloudTrail ? "an" : "aus"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="mx-auto aspect-square w-full max-w-[560px]">
                <ChartContainer config={hitLocationCloudChartConfig} className="h-full w-full">
                  <ScatterChart margin={HIT_LOCATION_CLOUD_MARGIN}>
                    <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} />
                    <XAxis
                      type="number"
                      dataKey="x"
                      domain={hitLocationCloudAxes.xDomain}
                      ticks={hitLocationCloudAxes.xTicks}
                      tickFormatter={(value: number) =>
                        `${value > 0 ? "+" : ""}${value.toFixed(1)}`
                      }
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      height={HIT_LOCATION_CLOUD_AXIS_SIZE}
                      label={{
                        value: "X (rechts + / links −) in mm",
                        position: "insideBottom",
                        offset: -6,
                        fontSize: 11,
                        fill: "var(--muted-foreground)",
                      }}
                    />
                    <YAxis
                      type="number"
                      dataKey="y"
                      domain={hitLocationCloudAxes.yDomain}
                      ticks={hitLocationCloudAxes.yTicks}
                      tickFormatter={(value: number) =>
                        `${value > 0 ? "+" : ""}${value.toFixed(1)}`
                      }
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      axisLine={false}
                      tickLine={false}
                      width={HIT_LOCATION_CLOUD_AXIS_SIZE}
                      label={{
                        value: "Y (hoch + / tief −) in mm",
                        angle: -90,
                        position: "insideLeft",
                        style: { textAnchor: "middle", fill: "var(--muted-foreground)" },
                        fontSize: 11,
                      }}
                    />
                    <ReferenceLine
                      x={0}
                      stroke={HIT_LOCATION_ZERO_LINE_STROKE}
                      strokeOpacity={HIT_LOCATION_ZERO_LINE_STROKE_OPACITY}
                      strokeWidth={HIT_LOCATION_ZERO_LINE_STROKE_WIDTH}
                    />
                    <ReferenceLine
                      y={0}
                      stroke={HIT_LOCATION_ZERO_LINE_STROKE}
                      strokeOpacity={HIT_LOCATION_ZERO_LINE_STROKE_OPACITY}
                      strokeWidth={HIT_LOCATION_ZERO_LINE_STROKE_WIDTH}
                    />
                    <ChartTooltip
                      cursor={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.45 }}
                      content={
                        <ChartTooltipContent
                          labelFormatter={(_label, payload) => {
                            const dateValue = payload?.[0]?.payload?.date
                            if (!dateValue) return ""
                            return new Intl.DateTimeFormat("de-CH", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              timeZone: displayTimeZone,
                            }).format(new Date(dateValue as Date))
                          }}
                          formatter={(value, name) => (
                            <div className="flex w-full items-center justify-between gap-6">
                              <span className="text-muted-foreground">
                                {name === "x" ? "X" : "Y"}
                              </span>
                              <span className="text-foreground font-mono font-medium tabular-nums">
                                {formatSignedMillimeters(
                                  typeof value === "number" ? value : Number(value)
                                )}
                              </span>
                            </div>
                          )}
                        />
                      }
                    />
                    {showCloudTrail &&
                      hitLocationCloudCurveSegments.map(([from, to], index) => (
                        <ReferenceLine
                          key={`hit-location-cloud-curve-${index}`}
                          segment={[
                            { x: from.x, y: from.y },
                            { x: to.x, y: to.y },
                          ]}
                          stroke={HIT_LOCATION_CLOUD_TRAIL_STROKE}
                          strokeWidth={HIT_LOCATION_CLOUD_TRAIL_STROKE_WIDTH}
                          strokeOpacity={HIT_LOCATION_CLOUD_TRAIL_STROKE_OPACITY}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          ifOverflow="extendDomain"
                        />
                      ))}
                    <Scatter
                      data={filteredHitLocations}
                      fill="var(--chart-1)"
                      shape={(props: { cx?: number; cy?: number }) =>
                        renderScatterPoint(props, "var(--chart-1)")
                      }
                    />
                    {showCloudTrail && hitLocationCloudPathStart && (
                      <Scatter
                        data={[hitLocationCloudPathStart]}
                        legendType="none"
                        fill="transparent"
                        shape={(props: { cx?: number; cy?: number }) => (
                          <circle
                            cx={props.cx}
                            cy={props.cy}
                            r={HIT_LOCATION_CLOUD_TRAIL_START_RADIUS}
                            fill="none"
                            stroke={HIT_LOCATION_CLOUD_TRAIL_STROKE}
                            strokeOpacity={0.58}
                            strokeWidth={1}
                          />
                        )}
                      />
                    )}
                    {showCloudTrail && hitLocationCloudPathEnd && (
                      <Scatter
                        data={[hitLocationCloudPathEnd]}
                        legendType="none"
                        fill="transparent"
                        shape={(props: { cx?: number; cy?: number }) => (
                          <circle
                            cx={props.cx}
                            cy={props.cy}
                            r={HIT_LOCATION_CLOUD_TRAIL_END_RADIUS}
                            fill={HIT_LOCATION_CLOUD_TRAIL_STROKE}
                            fillOpacity={0.68}
                            stroke="var(--background)"
                            strokeWidth={1}
                          />
                        )}
                      />
                    )}
                  </ScatterChart>
                </ChartContainer>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Mittelwert X (→/←)
                  </p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatDirectionalMillimeters(hitLocationMetrics.meanX, "x")}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Mittelwert Y (↑/↓)
                  </p>
                  <p className="text-lg font-semibold tabular-nums">
                    {formatDirectionalMillimeters(hitLocationMetrics.meanY, "y")}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

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
                              {formatSignedMillimeters(
                                typeof value === "number" ? value : Number(value)
                              )}
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
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Keine Trefferlagen-Daten für den gewählten Filter.
          </CardContent>
        </Card>
      )}
    </TabsContent>
  )
}
