import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { HitLocationTrendChart } from "@/components/app/statistics-charts/tabs/hit-location/HitLocationTrendChart"
import { HitLocationTrendHeader } from "@/components/app/statistics-charts/tabs/hit-location/HitLocationTrendHeader"
import type { HitLocationTrendModel } from "@/components/app/statistics-charts/tabs/types"

interface Props {
  model: HitLocationTrendModel
}

export function HitLocationTrendCard({ model }: Props) {
  const {
    showHitLocationTrendX,
    showHitLocationTrendY,
    onToggleHitLocationTrendX,
    onToggleHitLocationTrendY,
  } = model

  return (
    <Card>
      <CardHeader>
        <HitLocationTrendHeader
          showHitLocationTrendX={showHitLocationTrendX}
          showHitLocationTrendY={showHitLocationTrendY}
          onToggleHitLocationTrendX={onToggleHitLocationTrendX}
          onToggleHitLocationTrendY={onToggleHitLocationTrendY}
        />
      </CardHeader>
      <CardContent>
        <HitLocationTrendChart model={model} />
      </CardContent>
    </Card>
  )
}
