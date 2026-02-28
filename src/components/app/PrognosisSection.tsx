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
      {/* Selbsteinschätzung: 7 Dimensionen im 2-Spalten-Grid */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Selbsteinschätzung
        </p>
        {/* Kein gap-x: Spalten werden durch border-l visuell getrennt */}
        <div className="grid gap-y-4 sm:grid-cols-2">
          {dimensions.map((dim, i) => {
            const value = initialData[dim.key]
            return (
              <div
                key={dim.key}
                // Rechte Spalte bekommt linken Rand als Trenner, linke Spalte rechts Abstand
                className={`space-y-1.5${i % 2 !== 0 ? " sm:border-l sm:pl-5" : " sm:pr-5"}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm text-muted-foreground">{dim.label}</span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{value}</span>
                </div>
                {/* bg-slate-200: explizite Tailwind-Farbe, da bg-muted (shadcn) fast weiss ist */}
                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${value}%` }}
                  />
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
