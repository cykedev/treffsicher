import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import type { Session } from "next-auth"

// Hilfsfunktion für Server Actions und Server Components.
// Gibt die aktuelle Session zurück oder null wenn nicht eingeloggt.
//
// Verwendung in Server Actions:
//   const session = await getAuthSession()
//   if (!session) return { error: "Nicht angemeldet" }
export async function getAuthSession(): Promise<Session | null> {
  return getServerSession(authOptions)
}
