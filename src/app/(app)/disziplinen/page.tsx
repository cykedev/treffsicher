import { getAuthSession } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { getDisciplines } from "@/lib/disciplines/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArchiveDisciplineButton } from "@/components/app/ArchiveDisciplineButton"

const scoringTypeLabel: Record<string, string> = {
  WHOLE: "Ganzringe",
  TENTH: "Zehntelringe",
}

export default async function DisziplinenPage() {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  const disciplines = await getDisciplines()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Disziplinen</h1>
          <p className="text-muted-foreground">System-Disziplinen und eigene Konfigurationen.</p>
        </div>
        <Button asChild>
          <Link href="/disziplinen/neu">Neue Disziplin</Link>
        </Button>
      </div>

      {disciplines.length === 0 ? (
        <p className="text-muted-foreground">Noch keine Disziplinen vorhanden.</p>
      ) : (
        <div className="space-y-2">
          {disciplines.map((d) => (
            <Card key={d.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <span className="font-medium">{d.name}</span>
                  {d.isSystem && (
                    <span className="ml-2 rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      Standard
                    </span>
                  )}
                  <p className="text-sm text-muted-foreground">
                    {d.seriesCount} × {d.shotsPerSeries} Schuss —{" "}
                    {scoringTypeLabel[d.scoringType] ?? d.scoringType}
                    {d.practiceSeries > 0 && ` — ${d.practiceSeries} Probeschuss-Serie(n)`}
                  </p>
                </div>
                {/* Aktionen nur bei eigenen Disziplinen */}
                {!d.isSystem && (
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/disziplinen/${d.id}/bearbeiten`}>Bearbeiten</Link>
                    </Button>
                    <ArchiveDisciplineButton disciplineId={d.id} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
