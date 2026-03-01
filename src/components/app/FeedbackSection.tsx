"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { FeedbackForm } from "@/components/app/FeedbackForm"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import type { Feedback } from "@/generated/prisma/client"

interface Props {
  sessionId: string
  initialData: Feedback | null
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

// Section-Wrapper für das Feedback.
// Zeigt je nach Datenlage: leeren Zustand → "Erfassen", oder Lesemodus → "Bearbeiten".
// Wechsel in den Bearbeitungsmodus öffnet das FeedbackForm inline.
// Nach dem Speichern: router.refresh() synchronisiert den Server-Zustand.
export function FeedbackSection({ sessionId, initialData }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)

  function handleSuccess() {
    setEditing(false)
    router.refresh()
  }

  // Bearbeitungsmodus: Formular inline anzeigen
  if (editing) {
    return (
      <FeedbackForm
        sessionId={sessionId}
        initialData={initialData}
        onSuccess={handleSuccess}
        onCancel={() => setEditing(false)}
      />
    )
  }

  // Leerer Zustand: noch kein Feedback erstellt
  if (!initialData) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Noch nicht erfasst.</p>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          Feedback erfassen
        </Button>
      </div>
    )
  }

  // Ausgefüllte optionale Textfelder sammeln (Reihenfolge: inhaltlich sinnvoll)
  const textFields = [
    { label: "Erklärung / Abweichungen", value: initialData.explanation },
    { label: "Was lief besonders gut?", value: initialData.wentWell },
    { label: "Five Best Shots", value: initialData.fiveBestShots },
    { label: "Fortschritte", value: initialData.progress },
    { label: "Aha-Erlebnisse", value: initialData.insights },
  ].filter((f) => Boolean(f.value))

  return (
    <div className="space-y-5">
      {/* Tatsächlicher Stand: 7 Dimensionen als kompakte Balkenreihen */}
      <div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Tatsächlicher Stand
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

      {/* Leistungsziel-Status */}
      {initialData.goalAchieved != null && (
        <>
          <Separator />
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2.5 w-2.5 rounded-full ${
                  initialData.goalAchieved ? "bg-green-500" : "bg-amber-500"
                }`}
              />
              <span className="text-sm font-medium">
                Leistungsziel {initialData.goalAchieved ? "erreicht" : "nicht erreicht"}
              </span>
            </div>
            {initialData.goalAchievedNote && (
              <p className="ml-4.5 text-sm text-muted-foreground">{initialData.goalAchievedNote}</p>
            )}
          </div>
        </>
      )}

      {/* Ausgefüllte Textfelder */}
      {textFields.length > 0 && (
        <>
          <Separator />
          <div className="space-y-4">
            {textFields.map((field) => (
              <div key={field.label} className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {field.label}
                </p>
                <p className="text-sm whitespace-pre-wrap">{field.value}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
        Bearbeiten
      </Button>
    </div>
  )
}
