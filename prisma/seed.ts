import "dotenv/config"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client"

// Prisma 7: Adapter für PostgreSQL-Verbindung (gleiche Konfiguration wie src/lib/db.ts)
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// Standarddisziplinen laut docs/technical-constraints.md.
// isSystem: true bedeutet sie gehören keinem Nutzer und sind für alle sichtbar.
// Diese Disziplinen werden nur angelegt wenn sie noch nicht existieren (idempotent).
const systemDisciplines = [
  {
    name: "Luftpistole",
    seriesCount: 4,
    shotsPerSeries: 10,
    practiceSeries: 0,
    scoringType: "WHOLE" as const,
  },
  {
    name: "Luftgewehr",
    seriesCount: 4,
    shotsPerSeries: 10,
    practiceSeries: 0,
    scoringType: "WHOLE" as const,
  },
  {
    name: "Luftgewehr (Zehntel)",
    seriesCount: 4,
    shotsPerSeries: 10,
    practiceSeries: 0,
    scoringType: "TENTH" as const,
  },
  {
    name: "Luftpistole Auflage",
    seriesCount: 3,
    shotsPerSeries: 10,
    practiceSeries: 0,
    scoringType: "TENTH" as const,
  },
  {
    name: "Luftgewehr Auflage",
    seriesCount: 3,
    shotsPerSeries: 10,
    practiceSeries: 0,
    scoringType: "TENTH" as const,
  },
]

async function main() {
  console.warn("Starte Seed...")

  for (const discipline of systemDisciplines) {
    // upsert: anlegen wenn nicht vorhanden, nichts tun wenn bereits vorhanden
    await prisma.discipline.upsert({
      where: {
        // Eindeutige Identifikation über Name + isSystem
        // (kein natürlicher Unique Key im Schema — wir nutzen create/skip pattern)
        id: `system-${discipline.name.toLowerCase().replace(/\s+/g, "-").replace(/[()]/g, "")}`,
      },
      update: {},
      create: {
        id: `system-${discipline.name.toLowerCase().replace(/\s+/g, "-").replace(/[()]/g, "")}`,
        ...discipline,
        isSystem: true,
        ownerId: null,
      },
    })
    console.warn(`  Disziplin: ${discipline.name}`)
  }

  console.warn("Seed abgeschlossen.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
