"use client"

import { useState, useTransition } from "react"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toggleFavourite } from "@/lib/sessions/actions"

interface Props {
  sessionId: string
  initialFavourite: boolean
}

// Optimistischer Toggle: Zustand wird sofort lokal umgeschaltet,
// während die Server Action im Hintergrund läuft.
export function FavouriteButton({ sessionId, initialFavourite }: Props) {
  const [isFavourite, setIsFavourite] = useState(initialFavourite)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    setIsFavourite((prev) => !prev)
    startTransition(async () => {
      await toggleFavourite(sessionId)
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
