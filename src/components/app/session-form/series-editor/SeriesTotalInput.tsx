import { Input } from "@/components/ui/input"
import type {
  SeriesEditorCardActions,
  SeriesEditorCardModel,
} from "@/components/app/session-form/types"

interface Props {
  model: SeriesEditorCardModel
  actions: SeriesEditorCardActions
}

export function SeriesTotalInput({ model, actions }: Props) {
  const { seriesIndex, pending, scoringType, maxLabel, totalIsInvalid, seriesTotalValue } = model

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <Input
          id={`series-${seriesIndex}`}
          name={`series[${seriesIndex}][scoreTotal]`}
          type="number"
          min="0"
          max={maxLabel}
          step={scoringType === "TENTH" ? "0.1" : "1"}
          placeholder="Ringe"
          className={`w-28 ${
            totalIsInvalid ? "border-destructive focus-visible:ring-destructive" : ""
          }`}
          value={seriesTotalValue}
          onChange={(event) => actions.totalChange(seriesIndex, event.target.value)}
          disabled={pending}
          aria-invalid={totalIsInvalid}
        />
        <span className="text-sm text-muted-foreground">/ {maxLabel}</span>
      </div>
      {totalIsInvalid && (
        <p className="text-xs text-destructive">
          Maximum: {maxLabel} {scoringType === "TENTH" ? "Zehntel" : "Ringe"}
        </p>
      )}
    </div>
  )
}
