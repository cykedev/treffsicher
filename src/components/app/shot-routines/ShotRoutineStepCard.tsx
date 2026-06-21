"use client"

import { Trash2 } from "lucide-react"
import type { RoutineStep } from "@/lib/shot-routines/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"

interface Props {
  step: RoutineStep
  index: number
  total: number
  pending: boolean
  onMove: (index: number, direction: "up" | "down") => void
  onRemove: (index: number) => void
  onFieldChange: (index: number, field: "title" | "description", value: string) => void
}

// Einzelne Schritt-Karte des Schuss-Ablauf-Editors (Umsortieren, Entfernen, Felder bearbeiten).
export function ShotRoutineStepCard({
  step,
  index,
  total,
  pending,
  onMove,
  onRemove,
  onFieldChange,
}: Props) {
  return (
    <Card>
      <CardContent className="space-y-3 pt-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-muted-foreground">Schritt {step.order}</span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onMove(index, "up")}
              disabled={pending || index === 0}
              aria-label="Nach oben"
              className="h-7 w-7 p-0"
            >
              ↑
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onMove(index, "down")}
              disabled={pending || index === total - 1}
              aria-label="Nach unten"
              className="h-7 w-7 p-0"
            >
              ↓
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => onRemove(index)}
              disabled={pending}
              aria-label="Schritt entfernen"
              // Gleiches destruktives Klein-Button-Muster wie beim Serien-Löschen:
              // so ist "Entfernen" in allen Formularen sofort wiedererkennbar.
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Input
            placeholder="Titel des Schritts"
            value={step.title}
            onChange={(e) => onFieldChange(index, "title", e.target.value)}
            disabled={pending}
          />
          <Textarea
            placeholder="Beschreibung (optional)"
            value={step.description ?? ""}
            onChange={(e) => onFieldChange(index, "description", e.target.value)}
            disabled={pending}
            rows={2}
          />
        </div>
      </CardContent>
    </Card>
  )
}
