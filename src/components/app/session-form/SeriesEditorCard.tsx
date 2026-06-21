import { Card, CardContent } from "@/components/ui/card"
import { SeriesEditorHeader } from "@/components/app/session-form/series-editor/SeriesEditorHeader"
import { SeriesShotsGrid } from "@/components/app/session-form/series-editor/SeriesShotsGrid"
import { SeriesTotalInput } from "@/components/app/session-form/series-editor/SeriesTotalInput"
import { SeriesQualitySelect } from "@/components/app/session-form/series-editor/SeriesQualitySelect"
import type {
  SeriesEditorCardActions,
  SeriesEditorCardModel,
} from "@/components/app/session-form/types"

interface Props {
  model: SeriesEditorCardModel
  actions: SeriesEditorCardActions
}

export function SeriesEditorCard({ model, actions }: Props) {
  const { seriesIndex, isPractice, showShots, defaultExecutionQuality } = model

  return (
    <div
      className="relative"
      style={
        isPractice
          ? {
              // Probe-Serien werden bewusst visuell anders markiert,
              // damit "zaehlt nicht" auch beim schnellen Ueberfliegen klar bleibt.
              backgroundImage: "linear-gradient(225deg, #374151 50%, transparent 50%)",
              backgroundSize: "50px 50px",
              backgroundPosition: "top right",
              backgroundRepeat: "no-repeat",
            }
          : undefined
      }
    >
      <Card
        className={isPractice ? "bg-muted/30" : ""}
        style={
          isPractice
            ? {
                clipPath: "polygon(0 0, calc(100% - 50px) 0, 100% 50px, 100% 100%, 0 100%)",
              }
            : undefined
        }
      >
        <CardContent className="space-y-3 pt-4">
          <input
            type="hidden"
            name={`series[${seriesIndex}][isPractice]`}
            value={isPractice ? "true" : "false"}
          />

          <SeriesEditorHeader model={model} actions={actions} />

          <div className="space-y-2">
            {showShots ? (
              <SeriesShotsGrid model={model} actions={actions} />
            ) : (
              <SeriesTotalInput model={model} actions={actions} />
            )}
          </div>

          <SeriesQualitySelect
            seriesIndex={seriesIndex}
            defaultExecutionQuality={defaultExecutionQuality}
          />
        </CardContent>
      </Card>
    </div>
  )
}
