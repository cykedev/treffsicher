import { Input } from "@/components/ui/input"
import type {
  SeriesEditorCardActions,
  SeriesEditorCardModel,
} from "@/components/app/session-form/types"

interface Props {
  model: SeriesEditorCardModel
  actions: SeriesEditorCardActions
}

export function SeriesShotsGrid({ model, actions }: Props) {
  const {
    seriesIndex,
    pending,
    scoringType,
    currentShotCount,
    shotsForSeries,
    computedTotal,
    maxLabel,
    invalidShots,
    invalidShotCount,
  } = model

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Schüsse:</span>
        <Input
          type="number"
          min="1"
          max="99"
          value={currentShotCount}
          onChange={(event) =>
            actions.shotCountChange(seriesIndex, parseInt(event.target.value, 10) || 1)
          }
          disabled={pending}
          className="h-7 w-16 px-2 text-center text-xs"
          aria-label={`Schussanzahl Serie ${seriesIndex + 1}`}
        />
      </div>
      <div className="grid grid-cols-5 gap-1">
        {Array.from({ length: currentShotCount }, (_, shotIndex) => {
          const isInvalid = invalidShots[shotIndex] ?? false
          return (
            <Input
              key={shotIndex}
              type="number"
              min="0"
              max={scoringType === "WHOLE" ? "10" : "10.9"}
              step={scoringType === "TENTH" ? "0.1" : "1"}
              placeholder="-"
              value={shotsForSeries[shotIndex] ?? ""}
              onChange={(event) => actions.shotChange(seriesIndex, shotIndex, event.target.value)}
              disabled={pending}
              className={`px-1 text-center text-sm ${
                isInvalid ? "border-destructive focus-visible:ring-destructive" : ""
              }`}
              aria-label={`Serie ${seriesIndex + 1} Schuss ${shotIndex + 1}`}
              aria-invalid={isInvalid}
            />
          )
        })}
      </div>

      {invalidShotCount > 0 && (
        <p className="text-xs text-destructive">
          {scoringType === "TENTH"
            ? `${invalidShotCount} ungültige${invalidShotCount === 1 ? "r" : ""} Wert — erlaubt: 0.0 oder 1.0–10.9`
            : `${invalidShotCount} ungültige${invalidShotCount === 1 ? "r" : ""} Wert — erlaubt: 0–10 (ganzzahlig)`}
        </p>
      )}

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Summe:</span>
        <span className="font-medium">{computedTotal !== null ? computedTotal : "–"}</span>
        <span className="text-sm text-muted-foreground">/ {maxLabel}</span>
        <input
          type="hidden"
          name={`series[${seriesIndex}][scoreTotal]`}
          value={computedTotal !== null ? String(computedTotal) : ""}
        />
      </div>
    </div>
  )
}
