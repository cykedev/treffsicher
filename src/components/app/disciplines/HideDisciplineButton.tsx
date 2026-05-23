"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toggleHiddenDiscipline } from "@/lib/disciplines/actions"

interface Props {
  disciplineId: string
  initialHidden: boolean
}

// Optimistischer Toggle: Zustand wird sofort gespiegelt, Fehler rollt zurück.
export function HideDisciplineButton({ disciplineId, initialHidden }: Props) {
  const [isHidden, setIsHidden] = useState(initialHidden)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleToggle() {
    const previous = isHidden
    setIsHidden(!previous)

    startTransition(async () => {
      const result = await toggleHiddenDiscipline(disciplineId)
      if (result.error) {
        setIsHidden(previous)
        return
      }

      router.refresh()
    })
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      disabled={isPending}
      aria-label={isHidden ? "Disziplin einblenden" : "Disziplin ausblenden"}
      title={isHidden ? "Einblenden" : "Ausblenden"}
      className="size-9"
    >
      {isHidden ? (
        <Eye className="h-4 w-4 text-muted-foreground" />
      ) : (
        <EyeOff className="h-4 w-4 text-muted-foreground" />
      )}
    </Button>
  )
}
