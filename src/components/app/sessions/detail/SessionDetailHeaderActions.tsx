import Link from "next/link"
import { ArrowLeft, Download, Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DeleteSessionButton } from "@/components/app/sessions/DeleteSessionButton"
import { FavouriteButton } from "@/components/app/sessions/FavouriteButton"

interface Props {
  sessionId: string
  isFavourite: boolean
}

// Header-Aktionen bleiben icon-first, damit auf kleinen Breiten alle Kernaktionen sichtbar bleiben.
export function SessionDetailHeaderActions({ sessionId, isFavourite }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-0.5 sm:gap-1">
      <FavouriteButton sessionId={sessionId} initialFavourite={isFavourite} />
      <Button variant="ghost" size="sm" className="px-2 sm:px-3" asChild>
        <Link
          href={`/sessions/${sessionId}/export/pdf`}
          target="_blank"
          aria-label="Als PDF exportieren"
        >
          <Download className="h-4 w-4 sm:mr-1.5" />
          <span className="hidden sm:inline">PDF</span>
        </Link>
      </Button>
      <Button variant="ghost" size="icon" asChild>
        <Link href={`/sessions/${sessionId}/edit`} aria-label="Bearbeiten">
          <Pencil className="h-4 w-4" />
        </Link>
      </Button>
      <DeleteSessionButton sessionId={sessionId} />
      <Button variant="ghost" size="sm" className="px-2 sm:px-3" asChild>
        <Link href="/sessions" aria-label="Zurück zu Einheiten">
          <ArrowLeft className="h-4 w-4 sm:mr-1.5" />
          <span className="hidden sm:inline">Zurück</span>
        </Link>
      </Button>
    </div>
  )
}
