import type { ReactNode } from "react"

interface Props {
  // Seitentitel (deutsch).
  title: string
  // Optionaler Untertitel.
  description?: string
  // Optionale Aktion rechts (z.B. Anlegen-Button).
  action?: ReactNode
}

// Einheitlicher Seitenkopf: Titel + optionaler Untertitel, optionale Aktion rechts.
export function PageHeader({ title, description, action }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}
