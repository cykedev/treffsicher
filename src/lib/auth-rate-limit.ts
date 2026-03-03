import { isIP } from "node:net"
import { db } from "@/lib/db"

type LoginBucket = {
  attempts: number
  windowStartedAt: number
  blockedUntil: number
  lastAttemptAt: number
}

type LoginRateLimitStore = {
  get: (key: string) => Promise<LoginBucket | null>
  getMany: (keys: string[]) => Promise<Map<string, LoginBucket>>
  set: (key: string, bucket: LoginBucket) => Promise<void>
  delete: (key: string) => Promise<void>
  deleteMany: (keys: string[]) => Promise<void>
  count: () => Promise<number>
  getOldestKeys: (limit: number) => Promise<string[]>
  deleteExpired: (cutoffMs: number) => Promise<void>
  resetForTests: () => Promise<void>
}

const DEFAULT_MAX_RATE_LIMIT_BUCKETS = 10_000
const MAX_NORMALIZED_EMAIL_LENGTH = 320
const MAX_NORMALIZED_IP_LENGTH = 64
const CLEANUP_INTERVAL_MS = 60_000

let lastCleanupAtMs = 0

function toDate(ms: number): Date {
  return new Date(ms)
}

function fromDate(value: Date): number {
  return value.getTime()
}

function readMaxBucketsFromEnv(): number {
  const raw = process.env.AUTH_RATE_LIMIT_MAX_BUCKETS
  if (!raw) return DEFAULT_MAX_RATE_LIMIT_BUCKETS

  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed < 1000) {
    return DEFAULT_MAX_RATE_LIMIT_BUCKETS
  }

  return parsed
}

export const LOGIN_RATE_LIMIT_CONFIG = {
  windowMs: 15 * 60 * 1000,
  blockMs: 15 * 60 * 1000,
  maxAttemptsPerEmail: 5,
  maxAttemptsPerIp: 30,
  staleEntryMs: 24 * 60 * 60 * 1000,
  maxBuckets: readMaxBucketsFromEnv(),
} as const

export type LoginRateLimitCheck = {
  allowed: boolean
  normalizedEmail: string
  normalizedIp: string | null
}

function emailKey(email: string): string {
  return `email:${email}`
}

function ipKey(ip: string): string {
  return `ip:${ip}`
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase().slice(0, MAX_NORMALIZED_EMAIL_LENGTH)
}

function normalizeIpHeaderValue(ipHeaderValue?: string | null): string | null {
  if (!ipHeaderValue) return null
  const firstValue = ipHeaderValue.split(",")[0]
  const normalized = firstValue?.trim()
  if (!normalized || normalized.length > MAX_NORMALIZED_IP_LENGTH) return null
  return isIP(normalized) ? normalized : null
}

function createInMemoryStore(): LoginRateLimitStore {
  const loginBuckets = new Map<string, LoginBucket>()

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

const rateLimitStore: LoginRateLimitStore =
  process.env.NODE_ENV === "test" ? createInMemoryStore() : createDbStore()

async function cleanupExpiredBuckets(nowMs: number): Promise<void> {
  const cutoffMs = nowMs - LOGIN_RATE_LIMIT_CONFIG.staleEntryMs
  await rateLimitStore.deleteExpired(cutoffMs)
}

async function trimBucketsToLimit(limit: number): Promise<void> {
  const bucketCount = await rateLimitStore.count()
  if (bucketCount <= limit) {
    return
  }

  const overflow = bucketCount - limit
  const oldestKeys = await rateLimitStore.getOldestKeys(overflow)
  await rateLimitStore.deleteMany(oldestKeys)
}

async function maybeRunCleanup(nowMs: number): Promise<void> {
  if (nowMs - lastCleanupAtMs < CLEANUP_INTERVAL_MS) {
    return
  }

  lastCleanupAtMs = nowMs
  await cleanupExpiredBuckets(nowMs)
  await trimBucketsToLimit(LOGIN_RATE_LIMIT_CONFIG.maxBuckets)
}

async function ensureBucketCapacityForIncomingBuckets(incomingBuckets: number): Promise<void> {
  if (incomingBuckets <= 0) return
  const targetLimit = Math.max(0, LOGIN_RATE_LIMIT_CONFIG.maxBuckets - incomingBuckets)
  await trimBucketsToLimit(targetLimit)
}

async function registerFailedAttempt(
  key: string,
  maxAttempts: number,
  nowMs: number,
  windowMs: number,
  blockMs: number,
  existing: LoginBucket | null
): Promise<void> {
  if (!existing || nowMs - existing.windowStartedAt > windowMs) {
    await rateLimitStore.set(key, {
      attempts: 1,
      windowStartedAt: nowMs,
      blockedUntil: 0,
      lastAttemptAt: nowMs,
    })
    return
  }

  const nextAttempts = existing.attempts + 1
  const shouldBlock = nextAttempts >= maxAttempts

  await rateLimitStore.set(key, {
    attempts: nextAttempts,
    windowStartedAt: existing.windowStartedAt,
    blockedUntil: shouldBlock ? nowMs + blockMs : existing.blockedUntil,
    lastAttemptAt: nowMs,
  })
}

export async function checkLoginAllowed(
  email: string,
  ipHeaderValue?: string | null,
  nowMs: number = Date.now()
): Promise<LoginRateLimitCheck> {
  await maybeRunCleanup(nowMs)

  const normalizedEmail = normalizeEmail(email)
  const normalizedIp = normalizeIpHeaderValue(ipHeaderValue)
  const keys = [emailKey(normalizedEmail)]
  if (normalizedIp) {
    keys.push(ipKey(normalizedIp))
  }
  const buckets = await rateLimitStore.getMany(keys)

  const emailBucket = buckets.get(emailKey(normalizedEmail))
  const ipBucket = normalizedIp ? buckets.get(ipKey(normalizedIp)) : null
  const blockedByEmail = (emailBucket?.blockedUntil ?? 0) > nowMs
  const blockedByIp = (ipBucket?.blockedUntil ?? 0) > nowMs

  return {
    allowed: !blockedByEmail && !blockedByIp,
    normalizedEmail,
    normalizedIp,
  }
}

export async function registerFailedLoginAttempt(
  normalizedEmail: string,
  normalizedIp: string | null,
  nowMs: number = Date.now()
): Promise<void> {
  const emailBucketKey = emailKey(normalizedEmail)
  const ipBucketKey = normalizedIp ? ipKey(normalizedIp) : null
  const keys = ipBucketKey ? [emailBucketKey, ipBucketKey] : [emailBucketKey]
  const existingBuckets = await rateLimitStore.getMany(keys)

  let missingBuckets = 0
  if (!existingBuckets.has(emailBucketKey)) {
    missingBuckets += 1
  }
  if (ipBucketKey && !existingBuckets.has(ipBucketKey)) {
    missingBuckets += 1
  }
  await ensureBucketCapacityForIncomingBuckets(missingBuckets)

  await registerFailedAttempt(
    emailBucketKey,
    LOGIN_RATE_LIMIT_CONFIG.maxAttemptsPerEmail,
    nowMs,
    LOGIN_RATE_LIMIT_CONFIG.windowMs,
    LOGIN_RATE_LIMIT_CONFIG.blockMs,
    existingBuckets.get(emailBucketKey) ?? null
  )

  if (normalizedIp) {
    const key = ipKey(normalizedIp)
    await registerFailedAttempt(
      key,
      LOGIN_RATE_LIMIT_CONFIG.maxAttemptsPerIp,
      nowMs,
      LOGIN_RATE_LIMIT_CONFIG.windowMs,
      LOGIN_RATE_LIMIT_CONFIG.blockMs,
      existingBuckets.get(key) ?? null
    )
  }
}

export async function clearSuccessfulLoginAttempts(normalizedEmail: string): Promise<void> {
  await rateLimitStore.delete(emailKey(normalizedEmail))
}

// Test-Helfer: nur in Unit-Tests verwenden.
export async function __resetLoginRateLimitForTests(): Promise<void> {
  lastCleanupAtMs = 0
  await rateLimitStore.resetForTests()
}

// Test-Helfer: nur in Unit-Tests verwenden.
export async function __getLoginRateLimitBucketCountForTests(): Promise<number> {
  return rateLimitStore.count()
}
