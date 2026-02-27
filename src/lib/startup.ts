import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

// Wird beim App-Start einmalig aufgerufen (aus root layout.tsx).
// Legt den ersten Admin-Account an, wenn noch kein Admin in der Datenbank existiert.
// Zugangsdaten kommen aus den Umgebungsvariablen ADMIN_EMAIL und ADMIN_PASSWORD.
//
// Warum beim Start und nicht als separates Script?
// So funktioniert die Initialisierung automatisch beim ersten Docker-Start,
// ohne dass ein manueller Schritt nötig ist.
let hasRun = false

export async function runStartup(): Promise<void> {
  // Verhindert mehrfache Ausführung im gleichen Prozess (z.B. bei Hot-Reload)
  if (hasRun) return
  hasRun = true

  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminEmail || !adminPassword) {
    console.warn(
      "ADMIN_EMAIL oder ADMIN_PASSWORD nicht gesetzt — kein Admin-Account wird angelegt."
    )
    return
  }

  // Prüfen ob bereits ein Admin existiert
  const existingAdmin = await db.user.findFirst({
    where: { role: "ADMIN" },
  })

  if (existingAdmin) {
    // Normaler Fall nach dem ersten Start — nichts tun
    return
  }

  // Erster Start: Admin anlegen
  const passwordHash = await bcrypt.hash(adminPassword, 12)

  await db.user.create({
    data: {
      email: adminEmail,
      passwordHash,
      role: "ADMIN",
    },
  })

  console.warn(`Admin-Account angelegt für: ${adminEmail}`)
}
