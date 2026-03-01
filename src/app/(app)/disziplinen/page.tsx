import { getAuthSession } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus, Pencil } from "lucide-react"
import { getDisciplines } from "@/lib/disciplines/actions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
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
          <Link href="/disziplinen/neu">
            <Plus className="mr-1.5 h-4 w-4" />
            Neue Disziplin
          </Link>
        </Button>
      </div>

      {disciplines.length === 0 ? (
        <p className="text-muted-foreground">Noch keine Disziplinen vorhanden.</p>
      ) : (
        <div className="space-y-2">
          {disciplines.map((d) => (
            <Card key={d.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{d.name}</span>
                    {d.isSystem && (
                      <Badge variant="secondary" className="text-xs">Standard</Badge>
                    )}
                  </div>
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
                      <Link href={`/disziplinen/${d.id}/bearbeiten`}>
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                        Bearbeiten
                      </Link>
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
