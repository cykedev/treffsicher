import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface Props {
  // Überschrift/Hauptaussage (deutsch).
  title: string
  // Optionaler erklärender Untertext.
  description?: string
  // Optionales Icon oberhalb des Texts.
  icon?: LucideIcon
  // Optionaler Call-to-Action-Button (interner Link).
  actionLabel?: string
  actionHref?: string
}

// Einheitlicher Leerzustand: zentrierte Karte mit Text und optionalem CTA.
export function EmptyState({ title, description, icon: Icon, actionLabel, actionHref }: Props) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        {Icon && <Icon className="h-8 w-8 text-muted-foreground/60" />}
        <div className="space-y-1">
          <p className="font-medium">{title}</p>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actionLabel && actionHref && (
          <Button asChild size="sm" className="mt-1">
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
