import { Card, CardContent } from "@/components/ui/card"
import { TabsContent } from "@/components/ui/tabs"
import { ResultTrendCard } from "@/components/app/statistics-charts/tabs/trend/ResultTrendCard"
import { SeriesRatingsCard } from "@/components/app/statistics-charts/tabs/trend/SeriesRatingsCard"
import type { TrendTabModel } from "@/components/app/statistics-charts/tabs/types"

interface Props {
  model: TrendTabModel
}

export function TrendTab({ model }: Props) {
  if (!model.hasData) {
    return (
      <TabsContent value="verlauf" className="space-y-4">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Keine Daten für den gewählten Filter.
          </CardContent>
        </Card>
      </TabsContent>
    )
  }

  return (
    <TabsContent value="verlauf" className="space-y-4">
      <ResultTrendCard model={model.resultTrend} />
      <SeriesRatingsCard model={model.seriesRatings} />
    </TabsContent>
  )
}
