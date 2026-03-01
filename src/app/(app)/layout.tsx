import { Navigation } from "@/components/app/Navigation"

// Layout für alle geschützten Seiten (Dashboard, Tagebuch, Disziplinen, etc.)
// Die Middleware stellt sicher dass nur eingeloggte Nutzer dieses Layout erreichen.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}
