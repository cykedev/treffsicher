import { getAuthSession } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import { getSessions } from "@/lib/sessions/actions"
import { getDisplayTimeZone } from "@/lib/dateTime"
import { SESSION_TYPE_LABELS } from "@/lib/sessions/presentation"
import { Card, CardContent } from "@/components/ui/card"
import { SessionsFilters } from "@/components/app/sessions/SessionsFilters"
import { CreateItemLinkButton } from "@/components/app/sessions/CreateItemLinkButton"
import { SessionsList } from "@/components/app/sessions/list/SessionsList"

type SessionsSearchParams = Promise<{
  type?: string | string[]
  discipline?: string | string[]
}>

function readSearchParam(value: string | string[] | undefined): string {
  if (typeof value === "string") return value
  if (Array.isArray(value)) return value[0] ?? ""
  return ""
}

function formatSessionCount(count: number): string {
  return `${count} Einheit${count !== 1 ? "en" : ""}`
}

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: SessionsSearchParams
}) {
  const displayTimeZone = getDisplayTimeZone()
  const session = await getAuthSession()
  if (!session) redirect("/login")

  const resolvedSearchParams = await searchParams
  const sessions = await getSessions()
  const typeOptions = Object.entries(SESSION_TYPE_LABELS).map(([value, label]) => ({
    value,
    label,
  }))
  const availableTypes = typeOptions.map((option) => option.value)

  const disciplineMap = new Map<string, string>()
  for (const s of sessions) {
    if (s.discipline) {
      disciplineMap.set(s.discipline.id, s.discipline.name)
    }
  }
  const availableDisciplines = Array.from(disciplineMap.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "de"))

  const rawTypeFilter = readSearchParam(resolvedSearchParams.type)
  const rawDisciplineFilter = readSearchParam(resolvedSearchParams.discipline)
  const selectedType = availableTypes.includes(rawTypeFilter) ? rawTypeFilter : "all"
  const selectedDiscipline = availableDisciplines.some((d) => d.id === rawDisciplineFilter)
    ? rawDisciplineFilter
    : "all"
  const hasActiveFilters = selectedType !== "all" || selectedDiscipline !== "all"

  const filteredSessions = sessions.filter((s) => {
    if (selectedType !== "all" && s.type !== selectedType) return false
    if (selectedDiscipline !== "all" && s.disciplineId !== selectedDiscipline) return false
    return true
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tagebuch</h1>
          <p className="text-muted-foreground">
            {sessions.length === 0
              ? "Noch keine Einheiten erfasst."
              : hasActiveFilters
                ? `${formatSessionCount(filteredSessions.length)} von ${formatSessionCount(sessions.length)}`
                : formatSessionCount(sessions.length)}
          </p>
        </div>
        <CreateItemLinkButton href="/sessions/new" label="Neue Einheit" />
      </div>

      {sessions.length > 0 && (
        <SessionsFilters
          typeOptions={typeOptions}
          disciplineOptions={availableDisciplines}
          selectedType={selectedType}
          selectedDiscipline={selectedDiscipline}
        />
      )}

      {filteredSessions.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            {sessions.length === 0
              ? "Noch keine Einheiten vorhanden. Starte mit der ersten Einheit."
              : "Keine Einheiten für die gewählten Filter."}
          </CardContent>
        </Card>
      ) : (
        <SessionsList sessions={filteredSessions} displayTimeZone={displayTimeZone} />
      )}
    </div>
  )
}
