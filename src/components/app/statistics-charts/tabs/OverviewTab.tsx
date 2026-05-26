import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TabsContent } from "@/components/ui/tabs"
import type {
  OverviewDisciplineGroup,
  OverviewShotGroup,
} from "@/lib/stats/overview/aggregateOverview"

interface Props {
  model: {
    groups: OverviewDisciplineGroup[]
  }
}

export function OverviewTab({ model }: Props) {
  const { groups } = model

  if (groups.length === 0) {
    return (
      <TabsContent value="uebersicht" className="space-y-4">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Keine Einheiten mit Ergebnis für den gewählten Filter.
          </CardContent>
        </Card>
      </TabsContent>
    )
  }

  return (
    <TabsContent value="uebersicht" className="space-y-4">
      {/* Vertikaler Stapel über die volle Breite: Karten haben je nach Disziplin
          unterschiedlich viele Schussgruppen — nebeneinander würden Höhen springen
          oder müssten künstlich aufgefüllt werden. */}
      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <DisciplineOverviewCard key={group.disciplineId} group={group} />
        ))}
      </div>
    </TabsContent>
  )
}

function DisciplineOverviewCard({ group }: { group: OverviewDisciplineGroup }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-baseline gap-2">
          {group.disciplineName}
          <span className="text-base font-normal text-muted-foreground">
            {group.sessionCount} {group.sessionCount === 1 ? "Einheit" : "Einheiten"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {group.shotGroups.map((shotGroup) => (
          <ShotGroupBlock
            key={shotGroup.totalShots}
            shotGroup={shotGroup}
            scoringType={group.scoringType}
          />
        ))}
      </CardContent>
    </Card>
  )
}

function ShotGroupBlock({
  shotGroup,
  scoringType,
}: {
  shotGroup: OverviewShotGroup
  scoringType: string
}) {
  const unit = "Ringe"
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border/50 pb-1">
        <span className="text-sm font-medium text-foreground">
          {shotGroup.sessionCount} {shotGroup.sessionCount === 1 ? "Einheit" : "Einheiten"}
        </span>
        <span className="text-sm text-muted-foreground">
          {shotGroup.totalShots} Schuss
          {shotGroup.seriesCount > 0 ? ` · ${shotGroup.seriesCount} Serien` : ""}
        </span>
      </div>
      <dl className="grid grid-cols-3 gap-2 text-sm">
        <MetricCell label="Min" value={formatScore(shotGroup.minScore, scoringType)} unit={unit} />
        <MetricCell
          label="Ø"
          value={formatScore(shotGroup.avgScore, scoringType)}
          unit={unit}
          emphasize
        />
        <MetricCell label="Max" value={formatScore(shotGroup.maxScore, scoringType)} unit={unit} />
      </dl>
    </div>
  )
}

function MetricCell({
  label,
  value,
  unit,
  emphasize = false,
}: {
  label: string
  value: string
  unit: string
  emphasize?: boolean
}) {
  return (
    <div className="rounded-md bg-secondary/40 px-3 py-2">
      <dt className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd
        className={`font-mono tabular-nums ${
          emphasize ? "text-lg font-semibold text-foreground" : "text-base text-foreground"
        }`}
      >
        {value} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
      </dd>
    </div>
  )
}

function formatScore(value: number, scoringType: string): string {
  // TENTH-Disziplinen tragen Zehntelringe; ganze Ringe bleiben ohne Nachkomma.
  if (scoringType === "TENTH") return value.toFixed(1)
  // Mittelwert kann Bruchteile haben, Min/Max aber ganzzahlig: ganzzahlige Werte ohne Komma anzeigen.
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}
