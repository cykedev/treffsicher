import {
  CHART_POINT_OPACITY,
  CHART_POINT_RADIUS,
  CHART_POINT_STROKE_WIDTH,
  CHART_TREND_POINT_ACTIVE_OPACITY,
  CHART_TREND_POINT_ACTIVE_RADIUS,
  CHART_TREND_POINT_OPACITY,
  CHART_TREND_POINT_RADIUS,
} from "@/components/app/statistics-charts/constants"

// Style-Fabriken halten Recharts-Props zentral, damit Punkt-/Trendoptik konsistent bleibt.
export function createDotStyle(color: string) {
  return {
    r: CHART_TREND_POINT_RADIUS,
    fill: color,
    fillOpacity: CHART_TREND_POINT_OPACITY,
    stroke: "var(--background)",
    strokeWidth: CHART_POINT_STROKE_WIDTH,
  }
}

export function createActiveDotStyle(color: string) {
  return {
    r: CHART_TREND_POINT_ACTIVE_RADIUS,
    fill: color,
    fillOpacity: CHART_TREND_POINT_ACTIVE_OPACITY,
    stroke: "var(--background)",
    strokeWidth: CHART_POINT_STROKE_WIDTH,
  }
}

export function renderScatterPoint(props: { cx?: number; cy?: number }, color: string) {
  return (
    <circle
      cx={props.cx}
      cy={props.cy}
      r={CHART_POINT_RADIUS}
      fill={color}
      opacity={CHART_POINT_OPACITY}
      stroke="var(--background)"
      strokeWidth={CHART_POINT_STROKE_WIDTH}
    />
  )
}

export function createTrendStroke(color: string): string {
  return `color-mix(in srgb, ${color} 85%, white 15%)`
}
