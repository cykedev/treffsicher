import { formatDirectionalMillimeters } from "@/components/app/statistics-charts/utils"

interface Props {
  meanX: number | null
  meanY: number | null
}

export function HitLocationCloudMetrics({ meanX, meanY }: Props) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Mittelwert X (→/←)</p>
        <p className="text-lg font-semibold tabular-nums">
          {formatDirectionalMillimeters(meanX, "x")}
        </p>
      </div>
      <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Mittelwert Y (↑/↓)</p>
        <p className="text-lg font-semibold tabular-nums">
          {formatDirectionalMillimeters(meanY, "y")}
        </p>
      </div>
    </div>
  )
}
