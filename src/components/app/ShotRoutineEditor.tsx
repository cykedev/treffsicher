"use client"

import { useActionState, useState } from "react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import {
  createShotRoutine,
  updateShotRoutine,
  type ActionResult,
  type RoutineStep,
} from "@/lib/shot-routines/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"

interface Props {
  // Wenn gesetzt: Bearbeiten-Modus
  initialName?: string
  initialSteps?: RoutineStep[]
  routineId?: string
}

// Editor für einen Schuss-Ablauf.
// Schritte können hinzugefügt, entfernt und per Up/Down-Buttons umsortiert werden.
// Beim Submit werden die Schritte als JSON-String übertragen.
export function ShotRoutineEditor({ initialName, initialSteps, routineId }: Props) {
  const router = useRouter()
  const action = routineId
    ? updateShotRoutine.bind(null, routineId)
    : createShotRoutine

  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(action, null)

  const [steps, setSteps] = useState<RoutineStep[]>(
    initialSteps ?? []
  )

  // Nach erfolgreichem Update zur Liste weiterleiten
  useEffect(() => {
    if (state?.success) {
      router.push("/schuss-ablauf")
    }
  }, [state, router])

  function addStep() {
    setSteps((prev) => [
      ...prev,
      { order: prev.length + 1, title: "", description: undefined },
    ])
  }

  function removeStep(index: number) {
    setSteps((prev) => {
      const next = prev.filter((_, i) => i !== index)
      // Reihenfolge neu nummerieren
      return next.map((s, i) => ({ ...s, order: i + 1 }))
    })
  }

  function moveStep(index: number, direction: "up" | "down") {
    setSteps((prev) => {
      const next = [...prev]
      const targetIndex = direction === "up" ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= next.length) return prev
      ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
      return next.map((s, i) => ({ ...s, order: i + 1 }))
    })
  }

  function updateStepField(index: number, field: "title" | "description", value: string) {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value || undefined } : s))
    )
  }

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="space-y-2">
        <Label htmlFor="name">Name des Ablaufs</Label>
        <Input
          id="name"
          name="name"
          placeholder="z.B. Luftpistole Standardablauf"
          defaultValue={initialName ?? ""}
          required
          disabled={pending}
          className="max-w-sm"
        />
      </div>

      {/* Schritte */}
      <div className="space-y-3">
        <p className="text-sm font-medium">Schritte</p>

        {steps.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Noch keine Schritte. Füge den ersten Schritt hinzu.
          </p>
        )}

        {steps.map((step, i) => (
          <Card key={i}>
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Schritt {step.order}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveStep(i, "up")}
                    disabled={pending || i === 0}
                    aria-label="Nach oben"
                    className="h-7 w-7 p-0"
                  >
                    ↑
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveStep(i, "down")}
                    disabled={pending || i === steps.length - 1}
                    aria-label="Nach unten"
                    className="h-7 w-7 p-0"
                  >
                    ↓
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeStep(i)}
                    disabled={pending}
                    aria-label="Schritt entfernen"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  >
                    ×
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Input
                  placeholder="Titel des Schritts"
                  value={step.title}
                  onChange={(e) => updateStepField(i, "title", e.target.value)}
                  disabled={pending}
                />
                <Textarea
                  placeholder="Beschreibung (optional)"
                  value={step.description ?? ""}
                  onChange={(e) => updateStepField(i, "description", e.target.value)}
                  disabled={pending}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        ))}

        <Button type="button" variant="outline" size="sm" onClick={addStep} disabled={pending}>
          + Schritt hinzufügen
        </Button>
      </div>

      {/* Schritte als JSON-String für den Server — nicht sichtbar */}
      <input type="hidden" name="steps" value={JSON.stringify(steps)} />

      <div className="flex gap-3">
        <Button type="submit" disabled={pending || steps.length === 0}>
          {pending
            ? "Speichern..."
            : routineId
              ? "Änderungen speichern"
              : "Ablauf erstellen"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => router.push("/schuss-ablauf")}
        >
          Abbrechen
        </Button>
      </div>
    </form>
  )
}
