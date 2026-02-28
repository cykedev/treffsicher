"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { WellbeingForm } from "@/components/app/WellbeingForm"
import { Button } from "@/components/ui/button"
import type { Wellbeing } from "@/generated/prisma/client"

interface Props {
  sessionId: string
  initialData: Wellbeing | null
}

const fields = [
  { key: "sleep" as const, label: "Schlaf" },
  { key: "energy" as const, label: "Energie" },
  { key: "stress" as const, label: "Stress" },
  { key: "motivation" as const, label: "Motivation" },
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
      <div className="grid gap-2 sm:grid-cols-2">
        {fields.map((field) => {
          const value = initialData[field.key]
          return (
            <div key={field.key} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{field.label}</span>
              <div className="flex items-center gap-2">
                {/* Minimaler Balken als visuelle Orientierung */}
                <div className="h-1.5 w-16 rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full bg-primary"
                    style={{ width: `${(value / 10) * 100}%` }}
                  />
                </div>
                <span className="w-8 text-right font-medium tabular-nums">{value}/10</span>
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
