import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  StatisticsFiltersCardActions,
  StatisticsFiltersCardModel,
} from "@/components/app/statistics-charts/filterTypes"
import type { TypeFilter } from "@/components/app/statistics-charts/hooks/useStatisticsFilterState"

interface Props {
  model: StatisticsFiltersCardModel
  actions: StatisticsFiltersCardActions
}

// Filterkarte hält alle Eingriffspunkte an einer Stelle, damit URL-/State-Sync konsistent bleibt.
export function StatisticsFiltersCard({ model, actions }: Props) {
  const {
    typeFilter,
    disciplineFilter,
    availableDisciplines,
    from,
    to,
    activeTimePreset,
    selectedDiscipline,
    effectiveDisplayMode,
    totalDisciplineShots,
    filteredCount,
    withScoreCount,
  } = model

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 [&>*]:min-w-0">
          <div className="space-y-2">
            <Label>Einheitentyp</Label>
            <div className="flex gap-1">
              {(["all", "TRAINING", "WETTKAMPF"] as TypeFilter[]).map((t) => (
                <Button
                  key={t}
                  variant={typeFilter === t ? "default" : "outline"}
                  onClick={() => actions.typeFilterChange(t)}
                  className="h-9 flex-1 text-sm"
                >
                  {t === "all" ? "Alle" : t === "TRAINING" ? "Training" : "Wettkampf"}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Disziplin</Label>
            <Select value={disciplineFilter} onValueChange={actions.disciplineFilterChange}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Disziplinen</SelectItem>
                {availableDisciplines.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="from">Von</Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(e) => actions.fromChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="to">Bis</Label>
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(e) => actions.toChange(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Zeitraum</Label>
            <div className="flex flex-wrap gap-1">
              <Button
                variant={activeTimePreset === "all" ? "default" : "outline"}
                className="h-9 text-sm"
                onClick={actions.selectAllTime}
              >
                Alle
              </Button>
              <Button
                variant={activeTimePreset === "6m" ? "default" : "outline"}
                className="h-9 text-sm"
                onClick={actions.select6Months}
              >
                6 Monate
              </Button>
              <Button
                variant={activeTimePreset === "3m" ? "default" : "outline"}
                className="h-9 text-sm"
                onClick={actions.select3Months}
              >
                3 Monate
              </Button>
              <Button
                variant={activeTimePreset === "1m" ? "default" : "outline"}
                className="h-9 text-sm"
                onClick={actions.select1Month}
              >
                1 Monat
              </Button>
            </div>
          </div>

          {selectedDiscipline && (
            <div className="space-y-2">
              <Label>Anzeige</Label>
              <div className="flex flex-wrap gap-1">
                {/* Anzeige-Modus nur mit Disziplin anbieten, weil die Hochrechnung ohne Schusszahl irreführend wäre. */}
                <Button
                  variant={effectiveDisplayMode === "per_shot" ? "default" : "outline"}
                  onClick={() => actions.displayModeChange("per_shot")}
                  className="h-9 text-sm"
                >
                  Ringe/Sch.
                </Button>
                <Button
                  variant={effectiveDisplayMode === "projected" ? "default" : "outline"}
                  onClick={() => actions.displayModeChange("projected")}
                  className="h-9 text-sm"
                >
                  Hochrechnung ({totalDisciplineShots} Sch.)
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">
            {filteredCount} Einheit{filteredCount !== 1 ? "en" : ""} gefunden
            {withScoreCount !== filteredCount && ` · ${withScoreCount} mit Ergebnis`}
            {selectedDiscipline && ` · ${selectedDiscipline.name}`}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
