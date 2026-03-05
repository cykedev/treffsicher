"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { setFavouriteDiscipline } from "@/lib/disciplines/actions"

interface Props {
  disciplineId: string
  initialFavourite: boolean
}

// Optimistischer Toggle hält die Interaktion direkt responsiv; Fehlerfall rollt auf den alten Zustand zurück.
export function FavouriteDisciplineButton({ disciplineId, initialFavourite }: Props) {
  const [isFavourite, setIsFavourite] = useState(initialFavourite)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleToggle() {
    const previous = isFavourite
    setIsFavourite(!previous)

    startTransition(async () => {
      const result = await setFavouriteDiscipline(disciplineId)
      if (result.error) {
        setIsFavourite(previous)
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
      aria-label={isFavourite ? "Favorit entfernen" : "Als Favorit markieren"}
      title={isFavourite ? "Favorit" : "Als Favorit markieren"}
      className="size-9"
    >
      <Star
        className={`h-4 w-4 transition-colors ${
          isFavourite ? "text-yellow-500" : "text-muted-foreground"
        }`}
        fill={isFavourite ? "currentColor" : "none"}
      />
    </Button>
  )
}
