"use client"

import { useActionState } from "react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { toast } from "sonner"
import { createDiscipline, updateDiscipline, type ActionResult } from "@/lib/disciplines/actions"
import { getFieldError, getGeneralError } from "@/lib/forms/fieldErrors"
import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field-error"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import type { Discipline } from "@/generated/prisma/client"

interface Props {
  // Wenn gesetzt: Bearbeiten-Modus
  initialData?: Discipline
  disciplineId?: string
  canCreateSystem?: boolean
}

// Formular für neue oder bestehende Disziplin.
// Im Bearbeiten-Modus (disciplineId gesetzt) wird updateDiscipline mit bind verwendet.
export function DisciplineForm({ initialData, disciplineId, canCreateSystem = false }: Props) {
  const router = useRouter()

  // Im Bearbeiten-Modus die action via bind an die ID binden
  const action = disciplineId ? updateDiscipline.bind(null, disciplineId) : createDiscipline

  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(action, null)

  // Feld- und Globalfehler defensiv aus dem ActionResult lesen.
  const nameError = getFieldError(state, "name")
  const seriesCountError = getFieldError(state, "seriesCount")
  const shotsPerSeriesError = getFieldError(state, "shotsPerSeries")
  const generalError = getGeneralError(state)

  // Nach erfolgreicher Erstellung Toast zeigen und zur Disziplin-Liste navigieren.
  useEffect(() => {
    if (state?.success) {
      toast.success(disciplineId ? "Disziplin gespeichert." : "Disziplin angelegt.")
      router.push("/disciplines")
    } else if (generalError) {
      toast.error(generalError)
    }
  }, [state, generalError, disciplineId, router])

  return (
    <Card className="max-w-lg">
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-4">
          {/* Globaler Fehler */}
          {generalError && <p className="text-sm text-destructive">{generalError}</p>}

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="z.B. Luftpistole 40"
              required
              disabled={pending}
              defaultValue={initialData?.name ?? ""}
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? "name-error" : undefined}
            />
            <FieldError id="name-error" message={nameError} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="seriesCount">Anzahl Serien</Label>
              <Input
                id="seriesCount"
                name="seriesCount"
                type="number"
                min="1"
                max="20"
                defaultValue={initialData?.seriesCount ?? 4}
                required
                disabled={pending}
                aria-invalid={seriesCountError ? true : undefined}
                aria-describedby={seriesCountError ? "seriesCount-error" : undefined}
              />
              <FieldError id="seriesCount-error" message={seriesCountError} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="shotsPerSeries">Schuss pro Serie</Label>
              <Input
                id="shotsPerSeries"
                name="shotsPerSeries"
                type="number"
                min="1"
                max="60"
                defaultValue={initialData?.shotsPerSeries ?? 10}
                required
                disabled={pending}
                aria-invalid={shotsPerSeriesError ? true : undefined}
                aria-describedby={shotsPerSeriesError ? "shotsPerSeries-error" : undefined}
              />
              <FieldError id="shotsPerSeries-error" message={shotsPerSeriesError} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="practiceSeries">Probe-Serien (optional)</Label>
            <Input
              id="practiceSeries"
              name="practiceSeries"
              type="number"
              min="0"
              max="5"
              defaultValue={initialData?.practiceSeries ?? 0}
              disabled={pending}
            />
            <p className="text-xs text-muted-foreground">
              Serien die vor der Wertung geschossen werden. Fliessen nicht ins Ergebnis.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scoringType">Wertungsart</Label>
            <Select
              name="scoringType"
              defaultValue={initialData?.scoringType ?? "WHOLE"}
              disabled={pending}
            >
              <SelectTrigger id="scoringType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WHOLE">Ganzringe (0–10)</SelectItem>
                <SelectItem value="TENTH">Zehntelringe (0.0–10.9)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {disciplineId ? (
            // Beim Bearbeiten bleibt der Disziplin-Typ unveraendert.
            <input type="hidden" name="isSystem" value={initialData?.isSystem ? "true" : "false"} />
          ) : canCreateSystem ? (
            <div className="space-y-2">
              <Label htmlFor="isSystem">Sichtbarkeit</Label>
              <Select name="isSystem" defaultValue="true" disabled={pending}>
                {/* Default auf System spart Admins bei Standarddisziplinen einen zusätzlichen Klick. */}
                <SelectTrigger id="isSystem">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">System-Disziplin (für alle)</SelectItem>
                  <SelectItem value="false">Eigene Disziplin (nur für mich)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : (
            <input type="hidden" name="isSystem" value="false" />
          )}

          <div className="flex gap-3">
            <Button type="submit" disabled={pending}>
              {pending
                ? "Speichern…"
                : disciplineId
                  ? "Änderungen speichern"
                  : "Disziplin speichern"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => router.push("/disciplines")}
            >
              Abbrechen
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
