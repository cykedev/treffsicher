import { Trash2 } from "lucide-react"
import { EXECUTION_QUALITY_LABELS } from "@/lib/sessions/presentation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SelectableRow } from "@/components/ui/selectable-row"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  SeriesEditorCardActions,
  SeriesEditorCardModel,
} from "@/components/app/session-form/types"

interface Props {
  model: SeriesEditorCardModel
  actions: SeriesEditorCardActions
}

export function SeriesEditorCard({ model, actions }: Props) {
  const {
    seriesIndex,
    seriesLabel,
    isPractice,
    totalSeries,
    showShots,
    pending,
    scoringType,
    currentShotCount,
    shotsForSeries,
    computedTotal,
    maxLabel,
    invalidShots,
    totalIsInvalid,
    invalidShotCount,
    seriesTotalValue,
    defaultExecutionQuality,
  } = model

  return (
    <div
      className="relative"
      style={
        isPractice
          ? {
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

          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={`series-${seriesIndex}`} className="leading-none">
              {seriesLabel}
              {isPractice && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  (zählt nicht)
                </span>
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

          <div className="space-y-2">
            {showShots ? (
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
                        onChange={(event) =>
                          actions.shotChange(seriesIndex, shotIndex, event.target.value)
                        }
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
                  <span className="font-medium">
                    {computedTotal !== null ? computedTotal : "–"}
                  </span>
                  <span className="text-sm text-muted-foreground">/ {maxLabel}</span>
                  <input
                    type="hidden"
                    name={`series[${seriesIndex}][scoreTotal]`}
                    value={computedTotal !== null ? String(computedTotal) : ""}
                  />
                </div>
              </div>
            ) : (
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
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor={`quality-${seriesIndex}`} className="text-xs text-muted-foreground">
              Ausführung (optional)
            </Label>
            <Select
              name={`series[${seriesIndex}][executionQuality]`}
              defaultValue={
                defaultExecutionQuality != null ? String(defaultExecutionQuality) : undefined
              }
            >
              <SelectTrigger id={`quality-${seriesIndex}`} className="h-8 text-xs">
                <SelectValue placeholder="Bewertung wählen" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(EXECUTION_QUALITY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value} className="text-xs">
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
