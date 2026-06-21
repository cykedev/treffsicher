import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { HitLocationCloudChart } from "@/components/app/statistics-charts/tabs/hit-location/HitLocationCloudChart"
import { HitLocationCloudMetrics } from "@/components/app/statistics-charts/tabs/hit-location/HitLocationCloudMetrics"
import type { HitLocationCloudModel } from "@/components/app/statistics-charts/tabs/types"

interface Props {
  model: HitLocationCloudModel
}

export function HitLocationCloudCard({ model }: Props) {
  const { filteredHitLocations, showCloudTrail, onToggleCloudTrail, hitLocationMetrics } = model

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="flex flex-wrap items-baseline gap-2">
            Trefferlagen-Cloud
            <span className="text-base font-normal text-muted-foreground">
              {filteredHitLocations.length} Einheit
              {filteredHitLocations.length !== 1 ? "en" : ""}
            </span>
          </CardTitle>
          <Button
            type="button"
            size="sm"
            variant={showCloudTrail ? "default" : "outline"}
            className="h-8 px-3 text-xs"
            onClick={onToggleCloudTrail}
          >
            Verlauf {showCloudTrail ? "an" : "aus"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <HitLocationCloudChart model={model} />
        <HitLocationCloudMetrics
          meanX={hitLocationMetrics.meanX}
          meanY={hitLocationMetrics.meanY}
        />
      </CardContent>
    </Card>
  )
}
