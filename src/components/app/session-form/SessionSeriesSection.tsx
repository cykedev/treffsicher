import { calculateSumFromShots } from "@/lib/sessions/calculateScore"
import { formatSeriesMax } from "@/lib/sessions/validation"
import { Button } from "@/components/ui/button"
import { SelectableRow } from "@/components/ui/selectable-row"
import { SeriesEditorCard } from "@/components/app/session-form/SeriesEditorCard"
import type { SessionHitLocation } from "@/components/app/session-form/types"
import type { SerializedSeries } from "@/lib/sessions/actions"
import type { Discipline } from "@/generated/prisma/client"

interface Model {
  selectedDiscipline: Discipline
  sortedInitialSeries: SerializedSeries[]
  totalSeries: number
  showShots: boolean
  pending: boolean
  isImportPending: boolean
  hitLocation: SessionHitLocation | null
  isHitLocationComplete: boolean
  seriesIsPractice: boolean[]
  seriesKeys: string[]
  shotCounts: number[]
  shots: string[][]
  invalidShots: boolean[][]
  invalidTotals: boolean[]
  seriesTotals: string[]
}

interface Actions {
  openImportDialog: () => void
  toggleShowShots: (enabled: boolean) => void
  togglePractice: (index: number) => void
  removeSeries: (index: number) => void
  shotCountChange: (seriesIndex: number, newCount: number) => void
  shotChange: (seriesIndex: number, shotIndex: number, value: string) => void
  totalChange: (seriesIndex: number, value: string) => void
  addSeries: () => void
  addPracticeSeries: () => void
}

interface Props {
  model: Model
  actions: Actions
}

export function SessionSeriesSection({ model, actions }: Props) {
  const {
    selectedDiscipline,
    sortedInitialSeries,
    totalSeries,
    showShots,
    pending,
    isImportPending,
    hitLocation,
    isHitLocationComplete,
    seriesIsPractice,
    seriesKeys,
    shotCounts,
    shots,
    invalidShots,
    invalidTotals,
    seriesTotals,
  } = model

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Serien</h2>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={actions.openImportDialog}
            disabled={pending || isImportPending}
          >
            Meyton importieren
          </Button>
          <SelectableRow
            selected={showShots}
            onToggle={() => actions.toggleShowShots(!showShots)}
            disabled={pending}
            className="w-auto rounded-md px-2 py-1.5 text-xs"
            indicatorClassName="h-4 w-4"
          >
            Einzelschüsse erfassen
          </SelectableRow>
        </div>
      </div>

      {hitLocation && isHitLocationComplete && (
        <p className="text-xs text-muted-foreground">
          Trefferlage: {hitLocation.horizontalMm} mm{" "}
          {hitLocation.horizontalDirection === "RIGHT" ? "rechts" : "links"},{" "}
          {hitLocation.verticalMm} mm {hitLocation.verticalDirection === "HIGH" ? "hoch" : "tief"}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: totalSeries }, (_, index) => {
          const isPractice = seriesIsPractice[index] ?? false
          const practicesBefore = seriesIsPractice.slice(0, index).filter(Boolean).length
          const regularsBefore = index - practicesBefore
          const seriesLabel = isPractice
            ? `Probe-Serie ${practicesBefore + 1}`
            : `Serie ${regularsBefore + 1}`

          const currentShotCount = shotCounts[index] ?? selectedDiscipline.shotsPerSeries
          const shotsForSeries = shots[index] ?? []
          const computedTotal = showShots ? calculateSumFromShots(shotsForSeries) : null
          const maxLabel = formatSeriesMax(selectedDiscipline.scoringType, currentShotCount)

          const invalidShotCount = (invalidShots[index] ?? []).filter(Boolean).length
          const totalIsInvalid = invalidTotals[index] ?? false

          return (
            <SeriesEditorCard
              key={seriesKeys[index] ?? index}
              model={{
                seriesIndex: index,
                seriesLabel,
                isPractice,
                totalSeries,
                showShots,
                pending,
                scoringType: selectedDiscipline.scoringType,
                currentShotCount,
                shotsForSeries,
                computedTotal,
                maxLabel,
                invalidShots: invalidShots[index] ?? [],
                totalIsInvalid,
                invalidShotCount,
                seriesTotalValue: seriesTotals[index] ?? "",
                defaultExecutionQuality: sortedInitialSeries[index]?.executionQuality,
              }}
              actions={{
                togglePractice: actions.togglePractice,
                removeSeries: actions.removeSeries,
                shotCountChange: actions.shotCountChange,
                shotChange: actions.shotChange,
                totalChange: actions.totalChange,
              }}
            />
          )
        })}
      </div>

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={actions.addSeries}
          disabled={pending}
        >
          + Wertungsserie
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={actions.addPracticeSeries}
          disabled={pending}
        >
          + Probe-Serie
        </Button>
      </div>
    </div>
  )
}
