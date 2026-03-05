import { Card, CardContent } from "@/components/ui/card"
import { TabsContent } from "@/components/ui/tabs"
import { HitLocationCloudCard } from "@/components/app/statistics-charts/tabs/hit-location/HitLocationCloudCard"
import { HitLocationTrendCard } from "@/components/app/statistics-charts/tabs/hit-location/HitLocationTrendCard"
import type { HitLocationTabModel } from "@/components/app/statistics-charts/tabs/types"

interface Props {
  model: HitLocationTabModel
}

export function HitLocationTab({ model }: Props) {
  const hasHitLocationData = model.cloud.filteredHitLocations.length > 0

  return (
    <TabsContent value="trefferlage" className="space-y-4">
      {hasHitLocationData ? (
        <>
          <HitLocationCloudCard model={model.cloud} />
          <HitLocationTrendCard model={model.trend} />
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Keine Trefferlagen-Daten für den gewählten Filter.
          </CardContent>
        </Card>
      )}
    </TabsContent>
  )
}
