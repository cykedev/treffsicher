"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { PrognosisForm } from "@/components/app/PrognosisForm"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { SerializedPrognosis } from "@/lib/sessions/actions"

interface Props {
  sessionId: string
  initialData: SerializedPrognosis | null
}

const dimensions = [
  { key: "fitness" as const, label: "Kondition" },
  { key: "nutrition" as const, label: "Ernährung" },
  { key: "technique" as const, label: "Technik" },
  { key: "tactics" as const, label: "Taktik" },
  { key: "mentalStrength" as const, label: "Mentale Stärke" },
  { key: "environment" as const, label: "Umfeld" },
  { key: "equipment" as const, label: "Material" },
]

// Section-Wrapper für die Prognose.
// Zeigt je nach Datenlage: leeren Zustand → "Erfassen", oder Lesemodus → "Bearbeiten".
// Wechsel in den Bearbeitungsmodus öffnet das PrognosisForm inline.
// Nach dem Speichern: router.refresh() synchronisiert den Server-Zustand.
export function PrognosisSection({ sessionId, initialData }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)

  function handleSuccess() {
    setEditing(false)
    router.refresh()
  }

  // Bearbeitungsmodus: Formular inline anzeigen
  if (editing) {
    return (
      <PrognosisForm
        sessionId={sessionId}
        initialData={initialData}
        onSuccess={handleSuccess}
        onCancel={() => setEditing(false)}
      />
    )
  }

  // Leerer Zustand: noch keine Prognose erstellt
  if (!initialData) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Noch nicht erfasst.</p>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          Prognose erfassen
        </Button>
      </div>
    )
  }

  // Optionale Felder prüfen
  const hasScore = initialData.expectedScore != null || initialData.expectedCleanShots != null
  const hasGoal = Boolean(initialData.performanceGoal)

  return (
    <div className="space-y-5">
      {/* Selbsteinschätzung: 7 Dimensionen als kompakte Balkenreihen */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Selbsteinschätzung
        </p>
        <div className="space-y-2">
          {dimensions.map((dim) => {
            const value = initialData[dim.key]
            return (
              // Feste Label-Breite + wachsender Balken analog WellbeingSection
              <div key={dim.key} className="flex items-center gap-3 text-sm">
                <span className="w-32 shrink-0 truncate text-muted-foreground">{dim.label}</span>
                <div className="flex flex-1 items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-primary"
                      style={{ width: `${value}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums">{value}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Ergebnisprognose + Volltreffer */}
      {hasScore && (
        <>
          <Separator />
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            {initialData.expectedScore != null && (
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Erwartetes Ergebnis</p>
                <p className="text-base font-semibold">{initialData.expectedScore} Ringe</p>
              </div>
            )}
            {initialData.expectedCleanShots != null && (
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Erwartete Volltreffer</p>
                <p className="text-base font-semibold">{initialData.expectedCleanShots}</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Leistungsziel */}
      {hasGoal && (
        <>
          <Separator />
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Leistungsziel
            </p>
            <p className="text-sm whitespace-pre-wrap">{initialData.performanceGoal}</p>
          </div>
        </>
      )}

      <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
        Bearbeiten
      </Button>
    </div>
  )
}
