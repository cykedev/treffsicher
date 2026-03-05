import type { SessionDetail } from "@/lib/sessions/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type ComparisonDimensionKey =
  | "fitness"
  | "nutrition"
  | "technique"
  | "tactics"
  | "mentalStrength"
  | "environment"
  | "equipment"

const comparisonDimensions: Array<{ key: ComparisonDimensionKey; label: string }> = [
  { key: "fitness", label: "Kondition" },
  { key: "nutrition", label: "Ernährung" },
  { key: "technique", label: "Technik" },
  { key: "tactics", label: "Taktik" },
  { key: "mentalStrength", label: "Mentale Stärke" },
  { key: "environment", label: "Umfeld" },
  { key: "equipment", label: "Material" },
]

interface Props {
  prognosis: NonNullable<SessionDetail["prognosis"]>
  feedback: NonNullable<SessionDetail["feedback"]>
}

function diffClassName(diff: number): string {
  // Farbsemantik entspricht "besser/schlechter als Prognose" und nicht "hoch/niedrig".
  if (diff > 0) return "text-emerald-400"
  if (diff < 0) return "text-destructive"
  return "text-muted-foreground"
}

export function SessionPrognosisFeedbackComparisonCard({ prognosis, feedback }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Vergleich Prognose vs. Feedback</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 md:hidden">
          {comparisonDimensions.map(({ key, label }) => {
            const prognosisValue = prognosis[key]
            const feedbackValue = feedback[key]
            const diff = feedbackValue - prognosisValue

            return (
              <div key={key} className="space-y-2 rounded-lg border border-border/50 p-3">
                <p className="font-medium">{label}</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Prognose</p>
                    <p className="tabular-nums">{prognosisValue}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Tatsächlich</p>
                    <p className="tabular-nums">{feedbackValue}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Differenz</p>
                    <p className={`font-medium tabular-nums ${diffClassName(diff)}`}>
                      {diff > 0 ? `+${diff}` : diff}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-[640px] w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="pb-2 pr-4 font-medium">Dimension</th>
                <th className="pb-2 pr-4 font-medium">Prognose</th>
                <th className="pb-2 pr-4 font-medium">Tatsächlich</th>
                <th className="pb-2 font-medium">Differenz</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {comparisonDimensions.map(({ key, label }) => {
                const prognosisValue = prognosis[key]
                const feedbackValue = feedback[key]
                const diff = feedbackValue - prognosisValue

                return (
                  <tr key={key}>
                    <td className="py-1.5 pr-4">{label}</td>
                    <td className="py-1.5 pr-4 tabular-nums">{prognosisValue}</td>
                    <td className="py-1.5 pr-4 tabular-nums">{feedbackValue}</td>
                    <td className={`py-1.5 font-medium tabular-nums ${diffClassName(diff)}`}>
                      {diff > 0 ? `+${diff}` : diff}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
