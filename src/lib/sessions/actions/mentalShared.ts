import { z } from "zod"
import { db } from "@/lib/db"

export async function hasOwnedSession(sessionId: string, userId: string): Promise<boolean> {
  // Gemeinsame Besitzpruefung fuer alle Mental-Subformulare.
  // Alle Mental-Subformulare teilen dieselbe Besitzpruefung, damit die
  // Sicherheitsregel (nur eigene Einheit) nicht pro Action neu implementiert wird.
  const trainingSession = await db.trainingSession.findFirst({
    where: { id: sessionId, userId },
    select: { id: true },
  })

  return Boolean(trainingSession)
}

export const DimensionSchema = z.number({ message: "Ungültiger Wert" }).int().min(0).max(100)
