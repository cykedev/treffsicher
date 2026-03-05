import type { AdminLoginRateLimitBucket, AdminLoginRateLimitInsights } from "@/lib/admin/actions"
import { Badge } from "@/components/ui/badge"

interface Props {
  insights: AdminLoginRateLimitInsights
}

function formatDate(date: Date | null): string {
  if (!date) return "—"
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(date))
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("de-CH").format(value)
}

function getTypeBadgeClass(type: AdminLoginRateLimitBucket["type"]): string {
  if (type === "IP") {
    return "border-amber-800 bg-amber-950 text-amber-300"
  }
  return "border-sky-800 bg-sky-950 text-sky-300"
}

function BucketTable({
  buckets,
  emptyText,
}: {
  buckets: AdminLoginRateLimitBucket[]
  emptyText: string
}) {
  if (buckets.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyText}</p>
  }

  return (
    <div className="overflow-x-auto">
      {/* Eine gemeinsame Tabellenkomponente hält "blocked" und "noisy" Darstellung deckungsgleich. */}
      <table className="min-w-[880px] w-full text-sm">
        <thead>
          <tr className="border-b text-left text-muted-foreground">
            <th className="pb-2 pr-4 font-medium">Typ</th>
            <th className="pb-2 pr-4 font-medium">Identifikator</th>
            <th className="pb-2 pr-4 font-medium">Fehlversuche</th>
            <th className="pb-2 pr-4 font-medium">Fenster seit</th>
            <th className="pb-2 pr-4 font-medium">Letzter Versuch</th>
            <th className="pb-2 font-medium">Blockiert bis</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {buckets.map((bucket) => (
            <tr key={bucket.key}>
              <td className="py-2 pr-4">
                <Badge variant="outline" className={getTypeBadgeClass(bucket.type)}>
                  {bucket.type}
                </Badge>
              </td>
              <td className="max-w-[320px] py-2 pr-4">
                <p className="break-all">{bucket.identifier}</p>
              </td>
              <td className="py-2 pr-4">
                <span className="tabular-nums">{formatCount(bucket.attempts)}</span>
              </td>
              <td className="py-2 pr-4 text-muted-foreground">
                {formatDate(bucket.windowStartedAt)}
              </td>
              <td className="py-2 pr-4 text-muted-foreground">
                {formatDate(bucket.lastAttemptAt)}
              </td>
              <td className="py-2 text-muted-foreground">{formatDate(bucket.blockedUntil)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Insights-Panel priorisiert Verlaufstransparenz ("noisy"), nicht nur den aktuellen Sperrzustand.
export function AdminLoginRateLimitInsightsPanel({ insights }: Props) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">Gesamt: {formatCount(insights.totalBucketCount)}</Badge>
        <Badge variant="outline">Aktiv geblockt: {formatCount(insights.activeBlockedCount)}</Badge>
        <Badge variant="outline">Top noisy: letzte 24h / max. 10</Badge>
      </div>

      <div className="space-y-2">
        <h3 className="text-sm font-medium">Top noisy (letzte 24 Stunden)</h3>
        <BucketTable
          buckets={insights.topNoisyBuckets}
          emptyText="Keine Rate-Limit-Daten in den letzten 24 Stunden."
        />
      </div>
    </div>
  )
}
