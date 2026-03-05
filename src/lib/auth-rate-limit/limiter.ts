import { CLEANUP_INTERVAL_MS } from "@/lib/auth-rate-limit/config"
import {
  emailKey,
  ipKey,
  normalizeEmail,
  normalizeIpHeaderValue,
} from "@/lib/auth-rate-limit/normalization"
import type {
  LoginBucket,
  LoginRateLimitCheck,
  LoginRateLimitConfig,
  LoginRateLimitStore,
} from "@/lib/auth-rate-limit/types"

async function registerFailedAttempt(
  store: LoginRateLimitStore,
  key: string,
  maxAttempts: number,
  nowMs: number,
  windowMs: number,
  blockMs: number,
  existing: LoginBucket | null
): Promise<void> {
  if (!existing || nowMs - existing.windowStartedAt > windowMs) {
    await store.set(key, {
      attempts: 1,
      windowStartedAt: nowMs,
      blockedUntil: 0,
      lastAttemptAt: nowMs,
    })
    return
  }

  const nextAttempts = existing.attempts + 1
  const shouldBlock = nextAttempts >= maxAttempts

  await store.set(key, {
    attempts: nextAttempts,
    windowStartedAt: existing.windowStartedAt,
    blockedUntil: shouldBlock ? nowMs + blockMs : existing.blockedUntil,
    lastAttemptAt: nowMs,
  })
}

export function createLoginRateLimitService(
  store: LoginRateLimitStore,
  config: LoginRateLimitConfig
): {
  checkLoginAllowed: (
    email: string,
    ipHeaderValue?: string | null,
    nowMs?: number
  ) => Promise<LoginRateLimitCheck>
  registerFailedLoginAttempt: (
    normalizedEmail: string,
    normalizedIp: string | null,
    nowMs?: number
  ) => Promise<void>
  clearSuccessfulLoginAttempts: (normalizedEmail: string) => Promise<void>
  resetForTests: () => Promise<void>
  getBucketCountForTests: () => Promise<number>
} {
  let lastCleanupAtMs = 0

  async function cleanupExpiredBuckets(nowMs: number): Promise<void> {
    const cutoffMs = nowMs - config.staleEntryMs
    await store.deleteExpired(cutoffMs)
  }

  async function trimBucketsToLimit(limit: number): Promise<void> {
    const bucketCount = await store.count()
    if (bucketCount <= limit) {
      return
    }

    const overflow = bucketCount - limit
    const oldestKeys = await store.getOldestKeys(overflow)
    await store.deleteMany(oldestKeys)
  }

  async function maybeRunCleanup(nowMs: number): Promise<void> {
    if (nowMs - lastCleanupAtMs < CLEANUP_INTERVAL_MS) {
      return
    }

    lastCleanupAtMs = nowMs
    await cleanupExpiredBuckets(nowMs)
    await trimBucketsToLimit(config.maxBuckets)
  }

  async function ensureBucketCapacityForIncomingBuckets(incomingBuckets: number): Promise<void> {
    if (incomingBuckets <= 0) return
    const targetLimit = Math.max(0, config.maxBuckets - incomingBuckets)
    await trimBucketsToLimit(targetLimit)
  }

  async function checkLoginAllowed(
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
    const buckets = await store.getMany(keys)

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

  async function registerFailedLoginAttempt(
    normalizedEmail: string,
    normalizedIp: string | null,
    nowMs: number = Date.now()
  ): Promise<void> {
    const emailBucketKey = emailKey(normalizedEmail)
    const ipBucketKey = normalizedIp ? ipKey(normalizedIp) : null
    const keys = ipBucketKey ? [emailBucketKey, ipBucketKey] : [emailBucketKey]
    const existingBuckets = await store.getMany(keys)

    let missingBuckets = 0
    if (!existingBuckets.has(emailBucketKey)) {
      missingBuckets += 1
    }
    if (ipBucketKey && !existingBuckets.has(ipBucketKey)) {
      missingBuckets += 1
    }
    await ensureBucketCapacityForIncomingBuckets(missingBuckets)

    await registerFailedAttempt(
      store,
      emailBucketKey,
      config.maxAttemptsPerEmail,
      nowMs,
      config.windowMs,
      config.blockMs,
      existingBuckets.get(emailBucketKey) ?? null
    )

    if (normalizedIp) {
      const key = ipKey(normalizedIp)
      await registerFailedAttempt(
        store,
        key,
        config.maxAttemptsPerIp,
        nowMs,
        config.windowMs,
        config.blockMs,
        existingBuckets.get(key) ?? null
      )
    }
  }

  async function clearSuccessfulLoginAttempts(normalizedEmail: string): Promise<void> {
    await store.delete(emailKey(normalizedEmail))
  }

  async function resetForTests(): Promise<void> {
    lastCleanupAtMs = 0
    await store.resetForTests()
  }

  async function getBucketCountForTests(): Promise<number> {
    return store.count()
  }

  return {
    checkLoginAllowed,
    registerFailedLoginAttempt,
    clearSuccessfulLoginAttempts,
    resetForTests,
    getBucketCountForTests,
  }
}
