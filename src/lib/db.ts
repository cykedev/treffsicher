import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@/generated/prisma/client"

// Prisma 7 verwendet einen Datenbank-Adapter statt der URL im Schema.
// Der Pool verwaltet Verbindungen zur PostgreSQL-Datenbank.
function createPrismaClient(): PrismaClient {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

// Singleton-Pattern: In der Entwicklung hält Next.js Hot-Reload den Modul-Cache
// nicht vollständig zurück. Ohne den Global-Singleton würden bei jedem Hot-Reload
// neue Datenbankverbindungspools aufgebaut, was zu Verbindungslecks führt.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db
}
