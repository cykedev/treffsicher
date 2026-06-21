import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-lg font-semibold">Seite nicht gefunden</h2>
      <p className="text-sm text-muted-foreground">
        Die angeforderte Seite existiert nicht oder wurde verschoben.
      </p>
      <Button asChild variant="outline">
        <Link href="/">Zur Startseite</Link>
      </Button>
    </div>
  )
}
