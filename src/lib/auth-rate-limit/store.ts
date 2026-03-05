import { db } from "@/lib/db"
import type { LoginBucket, LoginRateLimitStore } from "@/lib/auth-rate-limit/types"

function toDate(ms: number): Date {
  return new Date(ms)
}

function fromDate(value: Date): number {
  return value.getTime()
}

function createInMemoryStore(): LoginRateLimitStore {
  const loginBuckets = new Map<string, LoginBucket>()
  // In Tests bewusst ohne DB:
  // Tests bleiben deterministisch und schnell, ohne DB-Setup pro Testlauf.

  return {
    async get(key: string): Promise<LoginBucket | null> {
      return loginBuckets.get(key) ?? null
    },
    async set(key: string, bucket: LoginBucket): Promise<void> {
      loginBuckets.set(key, bucket)
    },
    async getMany(keys: string[]): Promise<Map<string, LoginBucket>> {
      const result = new Map<string, LoginBucket>()
      for (const key of keys) {
        const bucket = loginBuckets.get(key)
        if (bucket) {
          result.set(key, bucket)
        }
      }
      return result
    },
    async delete(key: string): Promise<void> {
      loginBuckets.delete(key)
    },
    async deleteMany(keys: string[]): Promise<void> {
      for (const key of keys) {
        loginBuckets.delete(key)
      }
    },
    async count(): Promise<number> {
      return loginBuckets.size
    },
    async getOldestKeys(limit: number): Promise<string[]> {
      if (limit <= 0) return []
      return [...loginBuckets.entries()]
        .sort((a, b) => {
          // Referenz auf "letzte Relevanz" statt nur Erstellzeit:
          // wir entfernen zuerst Bucket-Eintraege mit der aeltesten Relevanz,
          // unabhaengig davon ob sie nur alt oder bereits blockiert waren.
          const aRef = Math.max(a[1].blockedUntil, a[1].lastAttemptAt)
          const bRef = Math.max(b[1].blockedUntil, b[1].lastAttemptAt)
          return aRef - bRef
        })
        .slice(0, limit)
        .map(([key]) => key)
    },
    async deleteExpired(cutoffMs: number): Promise<void> {
      for (const [key, bucket] of loginBuckets.entries()) {
        const referenceTimestamp = Math.max(bucket.blockedUntil, bucket.lastAttemptAt)
        if (referenceTimestamp < cutoffMs) {
          loginBuckets.delete(key)
        }
      }
    },
    async resetForTests(): Promise<void> {
      loginBuckets.clear()
    },
  }
}

function createDbStore(): LoginRateLimitStore {
  return {
    async get(key: string): Promise<LoginBucket | null> {
      const row = await db.loginRateLimitBucket.findUnique({
        where: { key },
        select: {
          attempts: true,
          windowStartedAt: true,
          blockedUntil: true,
          lastAttemptAt: true,
        },
      })
      if (!row) return null

      return {
        attempts: row.attempts,
        windowStartedAt: fromDate(row.windowStartedAt),
        blockedUntil: row.blockedUntil ? fromDate(row.blockedUntil) : 0,
        lastAttemptAt: fromDate(row.lastAttemptAt),
      }
    },
    async set(key: string, bucket: LoginBucket): Promise<void> {
      await db.loginRateLimitBucket.upsert({
        where: { key },
        create: {
          key,
          attempts: bucket.attempts,
          windowStartedAt: toDate(bucket.windowStartedAt),
          blockedUntil: bucket.blockedUntil > 0 ? toDate(bucket.blockedUntil) : null,
          lastAttemptAt: toDate(bucket.lastAttemptAt),
        },
        update: {
          attempts: bucket.attempts,
          windowStartedAt: toDate(bucket.windowStartedAt),
          blockedUntil: bucket.blockedUntil > 0 ? toDate(bucket.blockedUntil) : null,
          lastAttemptAt: toDate(bucket.lastAttemptAt),
        },
      })
    },
    async getMany(keys: string[]): Promise<Map<string, LoginBucket>> {
      if (keys.length === 0) {
        return new Map()
      }

      const rows = await db.loginRateLimitBucket.findMany({
        where: {
          key: {
            in: keys,
          },
        },
        select: {
          key: true,
          attempts: true,
          windowStartedAt: true,
          blockedUntil: true,
          lastAttemptAt: true,
        },
      })

      const result = new Map<string, LoginBucket>()
      for (const row of rows) {
        result.set(row.key, {
          attempts: row.attempts,
          windowStartedAt: fromDate(row.windowStartedAt),
          blockedUntil: row.blockedUntil ? fromDate(row.blockedUntil) : 0,
          lastAttemptAt: fromDate(row.lastAttemptAt),
        })
      }

      return result
    },
    async delete(key: string): Promise<void> {
      await db.loginRateLimitBucket.deleteMany({
        where: { key },
      })
    },
    async deleteMany(keys: string[]): Promise<void> {
      if (keys.length === 0) return
      await db.loginRateLimitBucket.deleteMany({
        where: {
          key: {
            in: keys,
          },
        },
      })
    },
    async count(): Promise<number> {
      return db.loginRateLimitBucket.count()
    },
    async getOldestKeys(limit: number): Promise<string[]> {
      if (limit <= 0) return []

      const rows = await db.loginRateLimitBucket.findMany({
        select: { key: true },
        orderBy: [{ lastAttemptAt: "asc" }, { key: "asc" }],
        take: limit,
      })
      return rows.map((row) => row.key)
    },
    async deleteExpired(cutoffMs: number): Promise<void> {
      const cutoff = toDate(cutoffMs)
      await db.loginRateLimitBucket.deleteMany({
        where: {
          lastAttemptAt: {
            lt: cutoff,
          },
          // Aktive Sperren nicht vorzeitig wegraeumen:
          // aktive Sperren muessen erhalten bleiben, auch wenn der letzte Versuch
          // bereits laenger zurueckliegt.
          OR: [
            { blockedUntil: null },
            {
              blockedUntil: {
                lt: cutoff,
              },
            },
          ],
        },
      })
    },
    async resetForTests(): Promise<void> {
      await db.loginRateLimitBucket.deleteMany({})
    },
  }
}

export function createRateLimitStoreForCurrentEnv(): LoginRateLimitStore {
  // Umgebungsabhaengiger Store:
  // Produktion braucht persistente Buckets (mehrere Requests/Instanzen),
  // Tests brauchen isolierte und schnell resetbare Buckets.
  return process.env.NODE_ENV === "test" ? createInMemoryStore() : createDbStore()
}
