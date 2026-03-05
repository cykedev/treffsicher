import { Navigation } from "@/components/app/shell/Navigation"
import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth-helpers"

// Layout für alle geschützten Seiten (Dashboard, Tagebuch, Disziplinen, etc.)
// Die Middleware stellt sicher dass nur eingeloggte Nutzer dieses Layout erreichen.
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}
