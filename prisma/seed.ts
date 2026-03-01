import "dotenv/config"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client"
import { ensureSystemDisciplines } from "../src/lib/disciplines/systemDisciplines"

// Prisma 7: Adapter für PostgreSQL-Verbindung (gleiche Konfiguration wie src/lib/db.ts)
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  console.warn("Starte Seed...")

  const createdCount = await ensureSystemDisciplines(prisma)

  if (createdCount > 0) {
    console.warn(`Seed abgeschlossen. Neu angelegte Standarddisziplinen: ${createdCount}`)
  } else {
    console.warn("Seed abgeschlossen. Standarddisziplinen waren bereits vorhanden.")
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
