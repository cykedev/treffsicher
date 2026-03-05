import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, Gauge, Pencil, Target } from "lucide-react"
import { getAuthSession } from "@/lib/auth-helpers"
import {
  getDisciplineForDetail,
  getDisciplineUsage,
  getFavouriteDisciplineId,
} from "@/lib/disciplines/actions"
import { ArchiveDisciplineButton } from "@/components/app/disciplines/ArchiveDisciplineButton"
import { DeleteDisciplineButton } from "@/components/app/disciplines/DeleteDisciplineButton"
import { FavouriteDisciplineButton } from "@/components/app/disciplines/FavouriteDisciplineButton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

const scoringTypeLabel: Record<string, string> = {
  WHOLE: "Ganzringe",
  TENTH: "Zehntelringe",
}

export default async function DisciplineDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  const { id } = await params
  const [discipline, favouriteDisciplineId] = await Promise.all([
    getDisciplineForDetail(id),
    getFavouriteDisciplineId(),
  ])

  if (!discipline) notFound()

  const canManage = !discipline.isSystem || session.user.role === "ADMIN"
  const usage = canManage ? await getDisciplineUsage(discipline.id) : null
  const canDelete = usage?.canDelete ?? false

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-start justify-end">
          <div className="flex w-full flex-wrap items-center justify-end gap-0.5 sm:w-auto sm:shrink-0 sm:gap-1">
            {!discipline.isArchived && (
              <FavouriteDisciplineButton
                disciplineId={discipline.id}
                initialFavourite={favouriteDisciplineId === discipline.id}
              />
            )}
            {canManage && (
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/disciplines/${discipline.id}/edit`} aria-label="Disziplin bearbeiten">
                  <Pencil className="h-4 w-4" />
                </Link>
              </Button>
            )}
            {canManage && (
              <ArchiveDisciplineButton
                disciplineId={discipline.id}
                isArchived={discipline.isArchived}
                compact
              />
            )}
            {canManage && canDelete && (
              <DeleteDisciplineButton disciplineId={discipline.id} compact />
            )}
            <Button variant="ghost" size="sm" className="px-2 sm:px-3" asChild>
              <Link href="/disciplines" aria-label="Zurück zu Disziplinen">
                <ArrowLeft className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">Zurück</span>
              </Link>
            </Button>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="break-words text-2xl font-bold tracking-tight">{discipline.name}</h1>
            {discipline.isSystem && <Badge variant="secondary">Standard</Badge>}
            {discipline.isArchived && <Badge variant="outline">Archiviert</Badge>}
          </div>
          <p className="text-muted-foreground">
            {discipline.isSystem
              ? "System-Disziplin für alle Nutzer."
              : "Eigene Disziplin für dein Training."}
          </p>
        </div>
      </div>

      <Separator />

      {/* Keine zusätzliche umschließende Card:
          reduziert doppelte Rahmen und macht den Block ruhiger. */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold tracking-tight">Konfiguration</h2>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="border-border/60 bg-card/70">
            <CardContent className="space-y-1.5 p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                Serien
              </div>
              <p className="text-2xl font-semibold tabular-nums">{discipline.seriesCount}</p>
              <p className="text-sm text-muted-foreground">Wertungsserien pro Einheit</p>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/70">
            <CardContent className="space-y-1.5 p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Target className="h-4 w-4" />
                Schuss pro Serie
              </div>
              <p className="text-2xl font-semibold tabular-nums">{discipline.shotsPerSeries}</p>
              <p className="text-sm text-muted-foreground">Standard pro Serie</p>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/70">
            <CardContent className="space-y-1.5 p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4" />
                Probe-Serien
              </div>
              <p className="text-2xl font-semibold tabular-nums">{discipline.practiceSeries}</p>
              <p className="text-sm text-muted-foreground">Vor der Wertung</p>
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/70">
            <CardContent className="space-y-1.5 p-3 sm:p-4">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Gauge className="h-4 w-4" />
                Wertungsart
              </div>
              <p className="text-2xl font-semibold">
                {scoringTypeLabel[discipline.scoringType] ?? discipline.scoringType}
              </p>
              <p className="text-sm text-muted-foreground">
                {discipline.scoringType === "TENTH" ? "0.0 bis 10.9" : "0 bis 10"}
              </p>
            </CardContent>
          </Card>
        </div>

        <p className="rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          {discipline.isSystem
            ? "Diese Standard-Disziplin wird zentral verwaltet und kann von allen Nutzern verwendet werden."
            : "Diese Disziplin gehört deinem Konto und kann unabhängig von System-Disziplinen angepasst werden."}
        </p>
        {canManage && !canDelete && (
          <p className="rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
            Endgültiges Löschen ist erst möglich, wenn die Disziplin nicht mehr in Einheiten oder
            Abläufen verwendet wird.
          </p>
        )}
      </div>
    </div>
  )
}
