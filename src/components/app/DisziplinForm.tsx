"use client"

import { useActionState } from "react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { createDiscipline, type ActionResult } from "@/lib/disciplines/actions"
import { Button } from "@/components/ui/button"
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

// Formularer für neue Disziplin.
// useActionState verbindet das Formular mit der Server Action und zeigt Fehler an.
export function DisziplinForm() {
  const router = useRouter()
  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(
    createDiscipline,
    null
  )

  // Nach erfolgreicher Erstellung zur Disziplin-Liste navigieren
  useEffect(() => {
    if (state?.success) {
      router.push("/disziplinen")
    }
  }, [state, router])

  // Fehler für ein bestimmtes Feld extrahieren
  function fieldError(field: string): string | undefined {
    if (!state?.error || typeof state.error === "string") return undefined
    const errors = state.error[field]
    return errors?.[0]
  }

  return (
    <Card className="max-w-lg">
      <CardContent className="pt-6">
        <form action={formAction} className="space-y-4">
          {/* Globaler Fehler */}
          {state?.error && typeof state.error === "string" && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="z.B. Luftpistole 40"
              required
              disabled={pending}
            />
            {fieldError("name") && <p className="text-sm text-destructive">{fieldError("name")}</p>}
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
                defaultValue="4"
                required
                disabled={pending}
              />
              {fieldError("seriesCount") && (
                <p className="text-sm text-destructive">{fieldError("seriesCount")}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="shotsPerSeries">Schuss pro Serie</Label>
              <Input
                id="shotsPerSeries"
                name="shotsPerSeries"
                type="number"
                min="1"
                max="60"
                defaultValue="10"
                required
                disabled={pending}
              />
              {fieldError("shotsPerSeries") && (
                <p className="text-sm text-destructive">{fieldError("shotsPerSeries")}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="practiceSeries">Probeschuss-Serien (optional)</Label>
            <Input
              id="practiceSeries"
              name="practiceSeries"
              type="number"
              min="0"
              max="5"
              defaultValue="0"
              disabled={pending}
            />
            <p className="text-xs text-muted-foreground">
              Serien die vor der Wertung geschossen werden. Fliessen nicht ins Ergebnis.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scoringType">Wertungsart</Label>
            <Select name="scoringType" defaultValue="WHOLE" disabled={pending}>
              <SelectTrigger id="scoringType">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="WHOLE">Ganzringe (0–10)</SelectItem>
                <SelectItem value="TENTH">Zehntelringe (0.0–10.9)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Speichern..." : "Disziplin speichern"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => router.push("/disziplinen")}
            >
              Abbrechen
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
