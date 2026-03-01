import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import type { Session } from "next-auth"

// Hilfsfunktion für Server Actions und Server Components.
// Gibt die aktuelle Session zurück oder null wenn nicht eingeloggt.
//
// Verwendung in Server Actions:
//   const session = await getAuthSession()
//   if (!session) return { error: "Nicht angemeldet" }
export async function getAuthSession(): Promise<Session | null> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return null
  }

  // Wichtig nach DB-Reset (z.B. docker compose down -v):
  // Ein alter JWT kann noch eine user.id enthalten, die in der DB nicht mehr existiert.
  // Dann würden FK-Fehler in Schreib-Operationen entstehen.
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, isActive: true },
  })

  if (!user || !user.isActive) {
    return null
  }

  // Rolle aus DB priorisieren (JWT kann veraltet sein).
  session.user.role = user.role
  return session
}
