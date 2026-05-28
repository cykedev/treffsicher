import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { OverviewTableGroup } from "@/lib/stats/overview/aggregateOverview"
import { SeriesGroupTable } from "./SeriesGroupTable"

interface Props {
  group: OverviewTableGroup
}

export function DisciplineOverviewTable({ group }: Props) {
  const { disciplineName, scoringType, typicalSeriesCount, sessionCount, seriesGroups } = group
  const showGroupLabels = seriesGroups.length > 1

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-baseline gap-2">
          {disciplineName}
          <span className="text-base font-normal text-muted-foreground">
            {sessionCount} {sessionCount === 1 ? "Einheit" : "Einheiten"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0 pb-2">
        {seriesGroups.map((sg) => (
          <div key={sg.seriesCount}>
            {showGroupLabels && (
              <p className="px-6 pt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {sg.seriesCount} {sg.seriesCount === 1 ? "Serie" : "Serien"}
              </p>
            )}
            <SeriesGroupTable
              group={sg}
              typicalSeriesCount={typicalSeriesCount}
              scoringType={scoringType}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
