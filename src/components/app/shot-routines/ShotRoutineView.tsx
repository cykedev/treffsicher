import type { RoutineStep } from "@/lib/shot-routines/actions"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"

interface Props {
  steps: RoutineStep[]
  createdAt: Date
  updatedAt: Date
}

// View sortiert Schritte defensiv, damit Alt-/Importdaten ohne stabile Reihenfolge korrekt erscheinen.
function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function ShotRoutineView({ steps, createdAt, updatedAt }: Props) {
  const sortedSteps = [...steps].sort((a, b) => a.order - b.order)
  const stepCountLabel = `${sortedSteps.length} ${sortedSteps.length === 1 ? "Schritt" : "Schritte"}`

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline">{stepCountLabel}</Badge>
        <span>Erstellt: {formatDateTime(createdAt)}</span>
        <span>Zuletzt geändert: {formatDateTime(updatedAt)}</span>
      </div>

      {sortedSteps.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Dieser Ablauf enthält noch keine Schritte.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {sortedSteps.map((step, index) => (
            <Card key={`${step.order}-${index}`}>
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                    {index + 1}
                  </span>
                  <div className="min-w-0 space-y-1">
                    <p className="break-words font-medium">{step.title}</p>
                    {step.description && (
                      <p className="break-words whitespace-pre-wrap text-sm text-muted-foreground">
                        {step.description}
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
