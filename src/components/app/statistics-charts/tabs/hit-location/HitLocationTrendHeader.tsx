import { Button } from "@/components/ui/button"
import { CardTitle } from "@/components/ui/card"

interface Props {
  showHitLocationTrendX: boolean
  showHitLocationTrendY: boolean
  onToggleHitLocationTrendX: () => void
  onToggleHitLocationTrendY: () => void
}

export function HitLocationTrendHeader({
  showHitLocationTrendX,
  showHitLocationTrendY,
  onToggleHitLocationTrendX,
  onToggleHitLocationTrendY,
}: Props) {
  return (
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
  )
}
