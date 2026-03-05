import { describe, expect, it } from "vitest"
import { CLEANUP_INTERVAL_MS } from "@/lib/auth-rate-limit/config"
import { createLoginRateLimitService } from "@/lib/auth-rate-limit/limiter"
import { emailKey, ipKey } from "@/lib/auth-rate-limit/normalization"
import type {
  LoginBucket,
  LoginRateLimitConfig,
  LoginRateLimitStore,
} from "@/lib/auth-rate-limit/types"

function createTestStore() {
  const buckets = new Map<string, LoginBucket>()
  const deleteExpiredCalls: number[] = []
  const deleteManyCalls: string[][] = []

  const store: LoginRateLimitStore = {
    async get(key) {
      return buckets.get(key) ?? null
    },
    async getMany(keys) {
      const result = new Map<string, LoginBucket>()
      for (const key of keys) {
        const bucket = buckets.get(key)
        if (bucket) result.set(key, bucket)
      }
      return result
    },
    async set(key, bucket) {
      buckets.set(key, bucket)
    },
    async delete(key) {
      buckets.delete(key)
    },
    async deleteMany(keys) {
      deleteManyCalls.push([...keys])
      for (const key of keys) buckets.delete(key)
    },
    async count() {
      return buckets.size
    },
    async getOldestKeys(limit) {
      return [...buckets.entries()]
        .sort((a, b) => a[1].lastAttemptAt - b[1].lastAttemptAt)
        .slice(0, limit)
        .map(([key]) => key)
    },
    async deleteExpired(cutoffMs) {
      deleteExpiredCalls.push(cutoffMs)
      for (const [key, bucket] of buckets.entries()) {
        if (Math.max(bucket.blockedUntil, bucket.lastAttemptAt) < cutoffMs) {
          buckets.delete(key)
        }
      }
    },
    async resetForTests() {
      buckets.clear()
    },
  }

  return { store, buckets, deleteExpiredCalls, deleteManyCalls }
}

function createConfig(overrides: Partial<LoginRateLimitConfig> = {}): LoginRateLimitConfig {
  return {
    windowMs: 15_000,
    blockMs: 30_000,
    maxAttemptsPerEmail: 3,
    maxAttemptsPerIp: 4,
    staleEntryMs: 86_400_000,
    maxBuckets: 500,
    ...overrides,
  }
}

describe("createLoginRateLimitService", () => {
  it("normalisiert Eingaben und laesst Login ohne Sperre zu", async () => {
    const harness = createTestStore()
    const service = createLoginRateLimitService(harness.store, createConfig())

    const check = await service.checkLoginAllowed(" User@Example.com ", "203.0.113.7, 10.0.0.4")

    expect(check).toEqual({
      allowed: true,
      normalizedEmail: "user@example.com",
      normalizedIp: "203.0.113.7",
    })
  })

  it("blockiert wenn E-Mail-Bucket aktiv gesperrt ist", async () => {
    const harness = createTestStore()
    const nowMs = 100_000
    harness.buckets.set(emailKey("athlete@example.com"), {
      attempts: 5,
      windowStartedAt: nowMs - 5000,
      blockedUntil: nowMs + 1_000,
      lastAttemptAt: nowMs - 10,
    })
    const service = createLoginRateLimitService(harness.store, createConfig())

    const result = await service.checkLoginAllowed("athlete@example.com", null, nowMs)

    expect(result.allowed).toBe(false)
  })

  it("zaehlt Fehlversuche hoch und setzt Sperrzeit beim Schwellwert", async () => {
    const harness = createTestStore()
    const config = createConfig({ maxAttemptsPerEmail: 3, maxAttemptsPerIp: 3, blockMs: 50 })
    const service = createLoginRateLimitService(harness.store, config)

    await service.registerFailedLoginAttempt("user@example.com", "203.0.113.11", 10)
    await service.registerFailedLoginAttempt("user@example.com", "203.0.113.11", 11)
    await service.registerFailedLoginAttempt("user@example.com", "203.0.113.11", 12)

    const emailBucket = harness.buckets.get(emailKey("user@example.com"))
    const ipBucket = harness.buckets.get(ipKey("203.0.113.11"))

    expect(emailBucket).toEqual({
      attempts: 3,
      windowStartedAt: 10,
      blockedUntil: 62,
      lastAttemptAt: 12,
    })
    expect(ipBucket).toEqual({
      attempts: 3,
      windowStartedAt: 10,
      blockedUntil: 62,
      lastAttemptAt: 12,
    })
  })

  it("setzt das Fenster nach Ablauf von windowMs zurueck", async () => {
    const harness = createTestStore()
    const config = createConfig({ windowMs: 100 })
    const service = createLoginRateLimitService(harness.store, config)

    await service.registerFailedLoginAttempt("window@example.com", null, 1_000)
    await service.registerFailedLoginAttempt("window@example.com", null, 1_101)

    expect(harness.buckets.get(emailKey("window@example.com"))).toEqual({
      attempts: 1,
      windowStartedAt: 1_101,
      blockedUntil: 0,
      lastAttemptAt: 1_101,
    })
  })

  it("loescht bei Erfolg nur den E-Mail-Bucket und behaelt IP-Bucket", async () => {
    const harness = createTestStore()
    const service = createLoginRateLimitService(harness.store, createConfig())

    await service.registerFailedLoginAttempt("keeper@example.com", "198.51.100.9", 5_000)
    await service.clearSuccessfulLoginAttempts("keeper@example.com")

    expect(harness.buckets.has(emailKey("keeper@example.com"))).toBe(false)
    expect(harness.buckets.has(ipKey("198.51.100.9"))).toBe(true)
  })

  it("fuehrt Cleanup nur im konfigurierten Intervall aus", async () => {
    const harness = createTestStore()
    const service = createLoginRateLimitService(harness.store, createConfig())

    await service.checkLoginAllowed("cleanup@example.com", null, 100_000)
    await service.checkLoginAllowed("cleanup@example.com", null, 100_500)
    await service.checkLoginAllowed("cleanup@example.com", null, 100_000 + CLEANUP_INTERVAL_MS + 1)

    expect(harness.deleteExpiredCalls).toHaveLength(2)
  })

  it("schafft Platz fuer neue Buckets wenn maxBuckets erreicht ist", async () => {
    const harness = createTestStore()
    harness.buckets.set(emailKey("old-1@example.com"), {
      attempts: 1,
      windowStartedAt: 10,
      blockedUntil: 0,
      lastAttemptAt: 10,
    })
    harness.buckets.set(emailKey("old-2@example.com"), {
      attempts: 1,
      windowStartedAt: 20,
      blockedUntil: 0,
      lastAttemptAt: 20,
    })
    const service = createLoginRateLimitService(harness.store, createConfig({ maxBuckets: 2 }))

    await service.registerFailedLoginAttempt("new@example.com", null, 30)

    expect(harness.deleteManyCalls).toContainEqual([emailKey("old-1@example.com")])
    expect(harness.buckets.has(emailKey("old-1@example.com"))).toBe(false)
    expect(harness.buckets.has(emailKey("old-2@example.com"))).toBe(true)
    expect(harness.buckets.has(emailKey("new@example.com"))).toBe(true)
    expect(harness.buckets.size).toBe(2)
  })
})
