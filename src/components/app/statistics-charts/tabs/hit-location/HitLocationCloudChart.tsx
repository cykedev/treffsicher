import { CartesianGrid, ReferenceLine, Scatter, ScatterChart, XAxis, YAxis } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import {
  HIT_LOCATION_CLOUD_AXIS_SIZE,
  HIT_LOCATION_CLOUD_MARGIN,
  HIT_LOCATION_CLOUD_TRAIL_END_RADIUS,
  HIT_LOCATION_CLOUD_TRAIL_START_RADIUS,
  HIT_LOCATION_CLOUD_TRAIL_STROKE,
  HIT_LOCATION_CLOUD_TRAIL_STROKE_OPACITY,
  HIT_LOCATION_CLOUD_TRAIL_STROKE_WIDTH,
  HIT_LOCATION_ZERO_LINE_STROKE,
  HIT_LOCATION_ZERO_LINE_STROKE_OPACITY,
  HIT_LOCATION_ZERO_LINE_STROKE_WIDTH,
} from "@/components/app/statistics-charts/constants"
import {
  formatSignedMillimeters,
  renderScatterPoint,
} from "@/components/app/statistics-charts/utils"
import type { HitLocationCloudModel } from "@/components/app/statistics-charts/tabs/types"

interface Props {
  model: HitLocationCloudModel
}

export function HitLocationCloudChart({ model }: Props) {
  const {
    filteredHitLocations,
    showCloudTrail,
    hitLocationCloudChartConfig,
    hitLocationCloudAxes,
    displayTimeZone,
    hitLocationCloudCurveSegments,
    hitLocationCloudPathStart,
    hitLocationCloudPathEnd,
  } = model

  return (
    <div className="mx-auto aspect-square w-full max-w-[560px]">
      <ChartContainer config={hitLocationCloudChartConfig} className="h-full w-full">
        <ScatterChart margin={HIT_LOCATION_CLOUD_MARGIN}>
          <CartesianGrid stroke="var(--border)" strokeOpacity={0.4} />
          <XAxis
            type="number"
            dataKey="x"
            domain={hitLocationCloudAxes.xDomain}
            ticks={hitLocationCloudAxes.xTicks}
            tickFormatter={(value: number) => `${value > 0 ? "+" : ""}${value.toFixed(1)}`}
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
            tickFormatter={(value: number) => `${value > 0 ? "+" : ""}${value.toFixed(1)}`}
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
                  // Tooltip-Datum immer im gleichen Zeitzonenbezug wie die übrigen Statistikachsen anzeigen.
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
                    <span className="text-muted-foreground">{name === "x" ? "X" : "Y"}</span>
                    <span className="text-foreground font-mono font-medium tabular-nums">
                      {formatSignedMillimeters(typeof value === "number" ? value : Number(value))}
                    </span>
                  </div>
                )}
              />
            }
          />
          {/* Verlaufslinien bleiben als Referenzlinien im gleichen Layer wie Grid/Achsen und skalieren sauber mit. */}
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
          {/* Start/End-Punkte bekommen eigene Marker, damit Richtung ohne Tooltip sofort lesbar bleibt. */}
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
  )
}
