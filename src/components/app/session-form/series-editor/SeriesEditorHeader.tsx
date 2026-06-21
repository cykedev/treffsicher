import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { SelectableRow } from "@/components/ui/selectable-row"
import type {
  SeriesEditorCardActions,
  SeriesEditorCardModel,
} from "@/components/app/session-form/types"

interface Props {
  model: SeriesEditorCardModel
  actions: SeriesEditorCardActions
}

export function SeriesEditorHeader({ model, actions }: Props) {
  const { seriesIndex, seriesLabel, isPractice, totalSeries, pending } = model

  return (
    <div className="flex items-center justify-between gap-2">
      <Label htmlFor={`series-${seriesIndex}`} className="leading-none">
        {seriesLabel}
        {isPractice && (
          <span className="ml-2 text-xs font-normal text-muted-foreground">(zählt nicht)</span>
        )}
      </Label>
      <div className="flex items-center gap-1">
        <SelectableRow
          selected={isPractice}
          onToggle={() => actions.togglePractice(seriesIndex)}
          disabled={pending}
          className="w-auto rounded-md px-2 py-1 text-xs"
          indicatorClassName="h-4 w-4"
        >
          Probe
        </SelectableRow>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => actions.removeSeries(seriesIndex)}
          disabled={pending || totalSeries <= 1}
          aria-label={`${seriesLabel} entfernen`}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </div>
  )
}
