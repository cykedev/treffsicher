import type {
  HitLocationHorizontalDirection,
  HitLocationVerticalDirection,
} from "@/generated/prisma/client"

interface HitLocationVisualizationProps {
  horizontalMm: number
  horizontalDirection: HitLocationHorizontalDirection
  verticalMm: number
  verticalDirection: HitLocationVerticalDirection
}

function formatDirection(
  horizontalDirection: HitLocationHorizontalDirection,
  verticalDirection: HitLocationVerticalDirection
): string {
  const horizontal = horizontalDirection === "RIGHT" ? "rechts" : "links"
  const vertical = verticalDirection === "HIGH" ? "hoch" : "tief"
  return `${horizontal}, ${vertical}`
}

export function HitLocationVisualization({
  horizontalMm,
  horizontalDirection,
  verticalMm,
  verticalDirection,
}: HitLocationVisualizationProps) {
  const directionLabel = formatDirection(horizontalDirection, verticalDirection)
  const diagonalArrow =
    horizontalDirection === "RIGHT" && verticalDirection === "HIGH"
      ? "↗"
      : horizontalDirection === "RIGHT" && verticalDirection === "LOW"
        ? "↘"
        : horizontalDirection === "LEFT" && verticalDirection === "HIGH"
          ? "↖"
          : "↙"
  const horizontalArrow = horizontalDirection === "RIGHT" ? "→" : "←"
  const verticalArrow = verticalDirection === "HIGH" ? "↑" : "↓"

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="inline-flex items-center gap-2 rounded-md border border-border/60 bg-muted/10 px-2.5 py-1.5 font-medium">
        <span className="leading-none text-primary">{diagonalArrow}</span>
        <span>{directionLabel}</span>
      </span>
      <span className="rounded-md border border-border/50 px-2 py-1 tabular-nums text-muted-foreground">
        {horizontalArrow} {horizontalMm.toFixed(2)} mm
      </span>
      <span className="rounded-md border border-border/50 px-2 py-1 tabular-nums text-muted-foreground">
        {verticalArrow} {verticalMm.toFixed(2)} mm
      </span>
    </div>
  )
}
