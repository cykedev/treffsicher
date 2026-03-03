import { getAuthSession } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Pencil } from "lucide-react"
import { getDisciplinesForManagement, getFavouriteDisciplineId } from "@/lib/disciplines/actions"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ArchiveDisciplineButton } from "@/components/app/ArchiveDisciplineButton"
import { CreateItemLinkButton } from "@/components/app/CreateItemLinkButton"
import { FavouriteDisciplineButton } from "@/components/app/FavouriteDisciplineButton"

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
            <Card key={d.id}>
              <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
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
                    {d.practiceSeries > 0 && ` — ${d.practiceSeries} Probeschuss-Serie(n)`}
                  </p>
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">
                  {!d.isArchived && (
                    <FavouriteDisciplineButton
                      disciplineId={d.id}
                      initialFavourite={favouriteDisciplineId === d.id}
                    />
                  )}
                  {/* Eigene Disziplinen sind bearbeitbar; System-Disziplinen nur für Admins. */}
                  {(!d.isSystem || isAdmin) && (
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/disciplines/${d.id}/edit`}>
                        <Pencil className="mr-1.5 h-3.5 w-3.5" />
                        Bearbeiten
                      </Link>
                    </Button>
                  )}
                  {(!d.isSystem || isAdmin) && (
                    <ArchiveDisciplineButton disciplineId={d.id} isArchived={d.isArchived} />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
