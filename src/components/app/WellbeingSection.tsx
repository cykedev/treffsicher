"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Moon, Zap, Brain, Flame } from "lucide-react"
import { WellbeingForm } from "@/components/app/WellbeingForm"
import { Button } from "@/components/ui/button"
import type { Wellbeing } from "@/generated/prisma/client"

interface Props {
  sessionId: string
  initialData: Wellbeing | null
}

const fields = [
  { key: "sleep"      as const, label: "Schlaf",     icon: Moon  },
  { key: "energy"     as const, label: "Energie",    icon: Zap   },
  { key: "stress"     as const, label: "Stress",     icon: Brain },
  { key: "motivation" as const, label: "Motivation", icon: Flame },
]

// Section-Wrapper für das Befinden-Tracking.
// Zeigt je nach Datenlage: leeren Zustand → "Erfassen", oder Lesemodus → "Bearbeiten".
// Wechsel in den Bearbeitungsmodus öffnet das WellbeingForm inline.
// Nach dem Speichern: router.refresh() synchronisiert den Server-Zustand.
export function WellbeingSection({ sessionId, initialData }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)

  function handleSuccess() {
    setEditing(false)
    router.refresh()
  }

  // Bearbeitungsmodus: Formular inline anzeigen
  if (editing) {
    return (
      <WellbeingForm
        sessionId={sessionId}
        initialData={initialData}
        onSuccess={handleSuccess}
        onCancel={() => setEditing(false)}
      />
    )
  }

  // Leerer Zustand: noch keine Daten erfasst
  if (!initialData) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Noch nicht erfasst.</p>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          Befinden erfassen
        </Button>
      </div>
    )
  }

  // Lesemodus: Werte übersichtlich anzeigen
  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {fields.map((field) => {
          const value = initialData[field.key]
          const Icon = field.icon
          return (
            // Feste Label-Breite + wachsender Balken: auf allen Screenbreiten kompakt
            <div key={field.key} className="flex items-center gap-3 text-sm">
              <div className="flex w-28 shrink-0 items-center gap-1.5 text-muted-foreground">
                <Icon className="h-3.5 w-3.5 shrink-0" />
                <span>{field.label}</span>
              </div>
              {/* Balken wächst auf verfügbare Breite — bleibt immer nahe beim Label */}
              <div className="flex flex-1 items-center gap-2">
                <div className="h-1.5 flex-1 rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full bg-primary"
                    style={{ width: `${(value / 10) * 100}%` }}
                  />
                </div>
                <span className="w-8 shrink-0 text-right font-medium tabular-nums">{value}/10</span>
              </div>
            </div>
          )
        })}
      </div>
      <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
        Bearbeiten
      </Button>
    </div>
  )
}
