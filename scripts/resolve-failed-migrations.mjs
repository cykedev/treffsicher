import { spawnSync } from "node:child_process"
import process from "node:process"
import pg from "pg"

const { Client } = pg

function runPrismaResolve(mode, migrationName) {
  const result = spawnSync("npx", ["prisma", "migrate", "resolve", mode, migrationName], {
    stdio: "inherit",
  })

  if (result.status !== 0) {
    throw new Error(`prisma migrate resolve failed for ${migrationName} (${mode}).`)
  }
}

async function resolveAddUserNameMigration(client, migrationName) {
  const columnExistsResult = await client.query(
    `SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'User'
        AND column_name = 'name'
    ) AS "exists"`
  )

  const columnExists = Boolean(columnExistsResult.rows[0]?.exists)

  if (columnExists) {
    console.warn(
      `[migrate-recovery] Column User.name already exists. Marking migration ${migrationName} as applied.`
    )
    runPrismaResolve("--applied", migrationName)
    return
  }

  console.warn(
    `[migrate-recovery] Column User.name does not exist yet. Marking migration ${migrationName} as rolled back.`
  )
  runPrismaResolve("--rolled-back", migrationName)
}

const KNOWN_RECOVERY_HANDLERS = {
  "20260302101000_add_user_name": resolveAddUserNameMigration,
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for migration recovery.")
  }

  const autoResolveUnknown =
    process.env.PRISMA_AUTO_RESOLVE_UNKNOWN_FAILED_MIGRATIONS === "true"

  const client = new Client({ connectionString: databaseUrl })
  await client.connect()

  try {
    const failedResult = await client.query(
      `SELECT migration_name, logs
       FROM "_prisma_migrations"
       WHERE finished_at IS NULL
         AND rolled_back_at IS NULL
       ORDER BY started_at ASC`
    )

    if (failedResult.rowCount === 0) {
      console.warn("[migrate-recovery] No failed migrations detected.")
      return
    }

    let unresolvedCount = 0

    for (const row of failedResult.rows) {
      const migrationName = String(row.migration_name)
      const logs = row.logs ? String(row.logs) : ""
      const handler = KNOWN_RECOVERY_HANDLERS[migrationName]

      if (handler) {
        await handler(client, migrationName)
        continue
      }

      if (autoResolveUnknown) {
        console.warn(
          `[migrate-recovery] No specific handler for ${migrationName}. Marking as rolled back because PRISMA_AUTO_RESOLVE_UNKNOWN_FAILED_MIGRATIONS=true.`
        )
        runPrismaResolve("--rolled-back", migrationName)
        continue
      }

      unresolvedCount += 1
      console.error(
        `[migrate-recovery] No automatic recovery configured for ${migrationName}. Manual intervention required.`
      )
      if (logs) {
        console.error(`[migrate-recovery] Last migration logs for ${migrationName}:`)
        console.error(logs)
      }
    }

    if (unresolvedCount > 0) {
      throw new Error(`${unresolvedCount} failed migration(s) could not be auto-resolved.`)
    }
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error("[migrate-recovery] Migration recovery failed.")
  console.error(error)
  process.exit(1)
})
