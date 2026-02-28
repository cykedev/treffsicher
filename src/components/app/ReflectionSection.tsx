"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { ReflectionForm } from "@/components/app/ReflectionForm"
import { Button } from "@/components/ui/button"
import type { Reflection } from "@/generated/prisma/client"

interface Props {
  sessionId: string
  initialData: Reflection | null
}

// Section-Wrapper für die Reflexion.
// Zeigt je nach Datenlage: leeren Zustand → "Erfassen", oder Lesemodus → "Bearbeiten".
// Wechsel in den Bearbeitungsmodus öffnet das ReflectionForm inline.
// Nach dem Speichern: router.refresh() synchronisiert den Server-Zustand.
export function ReflectionSection({ sessionId, initialData }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)

  function handleSuccess() {
    setEditing(false)
    router.refresh()
  }

  // Bearbeitungsmodus: Formular inline anzeigen
  if (editing) {
    return (
      <ReflectionForm
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
          Reflexion erfassen
        </Button>
      </div>
    )
  }

  // Lesemodus: nur ausgefüllte Felder anzeigen
  const hasContent =
    initialData.observations ||
    initialData.insight ||
    initialData.learningQuestion ||
    initialData.routineDeviation

  return (
    <div className="space-y-3">
      {/* Ausgefüllte Textfelder darstellen */}
      {initialData.observations && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Beobachtungen
          </p>
          <p className="text-sm whitespace-pre-wrap">{initialData.observations}</p>
        </div>
      )}

      {initialData.insight && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Heute ist mir klargeworden, dass …
          </p>
          <p className="text-sm whitespace-pre-wrap">{initialData.insight}</p>
        </div>
      )}

      {initialData.learningQuestion && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Was kann ich tun, um …?
          </p>
          <p className="text-sm whitespace-pre-wrap">{initialData.learningQuestion}</p>
        </div>
      )}

      {/* Ablauf-Status immer anzeigen wenn Reflexion vorhanden */}
      <div className="flex items-center gap-2 text-sm">
        <span
          className={`inline-block h-2 w-2 rounded-full ${
            initialData.routineFollowed !== false ? "bg-green-500" : "bg-amber-500"
          }`}
        />
        <span className="text-muted-foreground">
          Schuss-Ablauf {initialData.routineFollowed !== false ? "eingehalten" : "nicht eingehalten"}
        </span>
      </div>

      {initialData.routineDeviation && (
        <div className="ml-4 space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Abweichung
          </p>
          <p className="text-sm whitespace-pre-wrap">{initialData.routineDeviation}</p>
        </div>
      )}

      {/* Fallback wenn alles leer (nur routineFollowed gesetzt) */}
      {!hasContent && (
        <p className="text-sm text-muted-foreground">Keine weiteren Angaben.</p>
      )}

      <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
        Bearbeiten
      </Button>
    </div>
  )
}
