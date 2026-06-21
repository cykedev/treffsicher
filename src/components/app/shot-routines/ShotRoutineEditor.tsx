"use client"

import { useActionState, useState } from "react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { toast } from "sonner"
import {
  createShotRoutine,
  updateShotRoutine,
  type ActionResult,
  type RoutineStep,
} from "@/lib/shot-routines/actions"
import { getGeneralError } from "@/lib/forms/fieldErrors"
import { useUnsavedChangesGuard } from "@/lib/hooks/useUnsavedChangesGuard"
import { useNavigationConfirm } from "@/lib/hooks/useNavigationConfirm"
import { Button } from "@/components/ui/button"
import { DiscardChangesDialog } from "@/components/app/shell/DiscardChangesDialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ShotRoutineStepCard } from "@/components/app/shot-routines/ShotRoutineStepCard"

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
  const action = routineId ? updateShotRoutine.bind(null, routineId) : createShotRoutine

  const [state, formAction, pending] = useActionState<ActionResult | null, FormData>(action, null)

  const [steps, setSteps] = useState<RoutineStep[]>(initialSteps ?? [])
  // Einfaches Dirty-Flag: jede Bearbeitung markiert das Formular als ungespeichert.
  const [dirty, setDirty] = useState(false)
  const generalError = getGeneralError(state)

  // Während des Speicherns/nach Erfolg darf der Guard den Redirect nicht blockieren.
  const guardActive = dirty && !pending
  useUnsavedChangesGuard({ enabled: guardActive })
  const nav = useNavigationConfirm({ isDirty: guardActive })

  // Nach erfolgreichem Update Toast zeigen und zur Liste weiterleiten
  useEffect(() => {
    if (state?.success) {
      toast.success(routineId ? "Ablauf gespeichert." : "Ablauf erstellt.")
      router.push("/shot-routines")
    } else if (generalError) {
      toast.error(generalError)
    }
  }, [state, generalError, routineId, router])

  function addStep() {
    setDirty(true)
    setSteps((prev) => [...prev, { order: prev.length + 1, title: "", description: undefined }])
  }

  function removeStep(index: number) {
    setDirty(true)
    setSteps((prev) => {
      const next = prev.filter((_, i) => i !== index)
      // Reihenfolge neu nummerieren
      return next.map((s, i) => ({ ...s, order: i + 1 }))
    })
  }

  function moveStep(index: number, direction: "up" | "down") {
    setDirty(true)
    setSteps((prev) => {
      const next = [...prev]
      const targetIndex = direction === "up" ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= next.length) return prev
      ;[next[index], next[targetIndex]] = [next[targetIndex], next[index]]
      // Reihenfolge nach jedem Move neu nummerieren, damit Server und UI dieselbe Ordnung persistieren.
      return next.map((s, i) => ({ ...s, order: i + 1 }))
    })
  }

  function updateStepField(index: number, field: "title" | "description", value: string) {
    setDirty(true)
    setSteps((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s
        if (field === "title") {
          return { ...s, title: value }
        }
        return { ...s, description: value || undefined }
      })
    )
  }

  return (
    <form action={formAction} className="space-y-6">
      {generalError && <p className="text-sm text-destructive">{generalError}</p>}

      <div className="space-y-2">
        <Label htmlFor="name">Name des Ablaufs</Label>
        <Input
          id="name"
          name="name"
          placeholder="z.B. Luftpistole Standardablauf"
          defaultValue={initialName ?? ""}
          onChange={() => setDirty(true)}
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
          <ShotRoutineStepCard
            key={i}
            step={step}
            index={i}
            total={steps.length}
            pending={pending}
            onMove={moveStep}
            onRemove={removeStep}
            onFieldChange={updateStepField}
          />
        ))}

        <Button type="button" variant="outline" size="sm" onClick={addStep} disabled={pending}>
          + Schritt hinzufügen
        </Button>
      </div>

      {/* Schritte als JSON-String für den Server — nicht sichtbar */}
      <input type="hidden" name="steps" value={JSON.stringify(steps)} />

      <div className="flex gap-3">
        <Button type="submit" disabled={pending || steps.length === 0}>
          {pending ? "Speichern…" : routineId ? "Änderungen speichern" : "Ablauf erstellen"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() => nav.requestNavigation(() => router.push("/shot-routines"))}
        >
          Abbrechen
        </Button>
      </div>

      <DiscardChangesDialog
        open={nav.isConfirmOpen}
        onCancel={nav.cancel}
        onConfirm={nav.confirm}
      />
    </form>
  )
}
