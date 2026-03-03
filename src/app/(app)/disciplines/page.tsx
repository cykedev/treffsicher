import { getAuthSession } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Star } from "lucide-react"
import { getDisciplinesForManagement, getFavouriteDisciplineId } from "@/lib/disciplines/actions"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { CreateItemLinkButton } from "@/components/app/CreateItemLinkButton"

const scoringTypeLabel: Record<string, string> = {
  WHOLE: "Ganzringe",
  TENTH: "Zehntelringe",
}

export default async function DisciplinesPage() {
  const session = await getAuthSession()
  if (!session) redirect("/login")
  const isAdmin = session.user.role === "ADMIN"

  const [disciplines, favouriteDisciplineId] = await Promise.all([
    getDisciplinesForManagement(),
    getFavouriteDisciplineId(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Disziplinen</h1>
          <p className="text-muted-foreground">
            {isAdmin
              ? "Verwalte System- und eigene Disziplinen, setze Favoriten und archiviere bei Bedarf."
              : "Nutze System-Disziplinen, verwalte eigene Disziplinen und setze deinen Favoriten."}
          </p>
        </div>
        <CreateItemLinkButton
          href="/disciplines/new"
          label={isAdmin ? "Neue (System-)Disziplin" : "Neue Disziplin"}
        />
      </div>

      {disciplines.length === 0 ? (
        <p className="text-muted-foreground">Noch keine Disziplinen vorhanden.</p>
      ) : (
        <div className="space-y-2">
          {disciplines.map((d) => (
            // Übersicht konsistent zu anderen Bereichen:
            // komplette Karte öffnet die Detailansicht mit allen Aktionen.
            <Link key={d.id} href={`/disciplines/${d.id}`} className="block">
              <Card className="transition-colors hover:bg-muted/30">
                <CardContent className="py-4">
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2">
                      {/* Favorit in der Übersicht direkt sichtbar halten —
                          so muss die Detailansicht nicht erst geöffnet werden. */}
                      {favouriteDisciplineId === d.id && (
                        <Star className="h-3.5 w-3.5 shrink-0 text-yellow-500" fill="currentColor" />
                      )}
                      <span className="break-words font-medium">{d.name}</span>
                      {d.isSystem && (
                        <Badge variant="secondary" className="text-xs">
                          Standard
                        </Badge>
                      )}
                      {d.isArchived && (
                        <Badge variant="outline" className="text-xs">
                          Archiviert
                        </Badge>
                      )}
                    </div>
                    <p className="break-words text-sm text-muted-foreground">
                      {d.seriesCount} × {d.shotsPerSeries} Schuss —{" "}
                      {scoringTypeLabel[d.scoringType] ?? d.scoringType}
                      {d.practiceSeries > 0 && ` — ${d.practiceSeries} Probe-Serie(n)`}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
