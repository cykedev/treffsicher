import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth-helpers"

// Einstiegspunkt: eingeloggte Nutzer kommen zum Dashboard,
// nicht eingeloggte zur Login-Seite.
// Die eigentliche Schutzlogik liegt in der Middleware — dies ist nur der Redirect
// von der Root-URL.
export default async function HomePage() {
  const session = await getAuthSession()

  if (session) {
    redirect("/dashboard")
  } else {
    redirect("/login")
  }
}
