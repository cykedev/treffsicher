"use client"

import { useState, useTransition } from "react"
import { Heart } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { toggleFavourite } from "@/lib/sessions/actions"

interface Props {
  sessionId: string
  initialFavourite: boolean
}

// Optimistischer Toggle: Zustand wird sofort umgeschaltet. Schlägt die Server Action
// fehl, wird der optimistische Wert zurückgerollt und ein Fehler-Toast angezeigt.
export function FavouriteButton({ sessionId, initialFavourite }: Props) {
  const [isFavourite, setIsFavourite] = useState(initialFavourite)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    const previous = isFavourite
    setIsFavourite(!previous)
    startTransition(async () => {
      const result = await toggleFavourite(sessionId)
      if (result && "error" in result && result.error) {
        setIsFavourite(previous)
        toast.error(
          typeof result.error === "string" ? result.error : "Favorit konnte nicht geändert werden."
        )
      }
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      disabled={isPending}
      aria-label={isFavourite ? "Favorit entfernen" : "Als Favorit markieren"}
    >
      <Heart
        className={`h-4 w-4 transition-colors ${
          isFavourite ? "fill-red-500 text-red-500" : "text-muted-foreground"
        }`}
      />
    </Button>
  )
}
