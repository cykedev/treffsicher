import { isIP } from "node:net"

type LoginBucket = {
  attempts: number
  windowStartedAt: number
  blockedUntil: number
  lastAttemptAt: number
}

const loginBuckets = new Map<string, LoginBucket>()

const DEFAULT_MAX_RATE_LIMIT_BUCKETS = 10_000
const MAX_NORMALIZED_EMAIL_LENGTH = 320
const MAX_NORMALIZED_IP_LENGTH = 64

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

function cleanupExpiredBuckets(nowMs: number): void {
  for (const [key, bucket] of loginBuckets.entries()) {
    const referenceTimestamp = Math.max(bucket.blockedUntil, bucket.lastAttemptAt)
    if (nowMs - referenceTimestamp > LOGIN_RATE_LIMIT_CONFIG.staleEntryMs) {
      loginBuckets.delete(key)
    }
  }
}

function evictOldestBucket(): void {
  let oldestKey: string | null = null
  let oldestReference = Number.POSITIVE_INFINITY

  for (const [key, bucket] of loginBuckets.entries()) {
    const referenceTimestamp = Math.max(bucket.blockedUntil, bucket.lastAttemptAt)
    if (referenceTimestamp < oldestReference) {
      oldestReference = referenceTimestamp
      oldestKey = key
    }
  }

  if (oldestKey) {
    loginBuckets.delete(oldestKey)
  }
}

function ensureBucketCapacity(nowMs: number): void {
  cleanupExpiredBuckets(nowMs)

  if (loginBuckets.size < LOGIN_RATE_LIMIT_CONFIG.maxBuckets) {
    return
  }

  evictOldestBucket()
}

function isBlocked(key: string, nowMs: number): boolean {
  const bucket = loginBuckets.get(key)
  if (!bucket) return false
  return bucket.blockedUntil > nowMs
}

function registerFailedAttempt(
  key: string,
  maxAttempts: number,
  nowMs: number,
  windowMs: number,
  blockMs: number
): void {
  const existing = loginBuckets.get(key)
  if (!existing || nowMs - existing.windowStartedAt > windowMs) {
    if (!existing) {
      ensureBucketCapacity(nowMs)
    }

    loginBuckets.set(key, {
      attempts: 1,
      windowStartedAt: nowMs,
      blockedUntil: 0,
      lastAttemptAt: nowMs,
    })
    return
  }

  const nextAttempts = existing.attempts + 1
  const shouldBlock = nextAttempts >= maxAttempts

  loginBuckets.set(key, {
    attempts: nextAttempts,
    windowStartedAt: existing.windowStartedAt,
    blockedUntil: shouldBlock ? nowMs + blockMs : existing.blockedUntil,
    lastAttemptAt: nowMs,
  })
}

export function checkLoginAllowed(
  email: string,
  ipHeaderValue?: string | null,
  nowMs: number = Date.now()
): LoginRateLimitCheck {
  cleanupExpiredBuckets(nowMs)

  const normalizedEmail = normalizeEmail(email)
  const normalizedIp = normalizeIpHeaderValue(ipHeaderValue)

  const blockedByEmail = isBlocked(emailKey(normalizedEmail), nowMs)
  const blockedByIp = normalizedIp ? isBlocked(ipKey(normalizedIp), nowMs) : false

  return {
    allowed: !blockedByEmail && !blockedByIp,
    normalizedEmail,
    normalizedIp,
  }
}

export function registerFailedLoginAttempt(
  normalizedEmail: string,
  normalizedIp: string | null,
  nowMs: number = Date.now()
): void {
  cleanupExpiredBuckets(nowMs)

  registerFailedAttempt(
    emailKey(normalizedEmail),
    LOGIN_RATE_LIMIT_CONFIG.maxAttemptsPerEmail,
    nowMs,
    LOGIN_RATE_LIMIT_CONFIG.windowMs,
    LOGIN_RATE_LIMIT_CONFIG.blockMs
  )

  if (normalizedIp) {
    registerFailedAttempt(
      ipKey(normalizedIp),
      LOGIN_RATE_LIMIT_CONFIG.maxAttemptsPerIp,
      nowMs,
      LOGIN_RATE_LIMIT_CONFIG.windowMs,
      LOGIN_RATE_LIMIT_CONFIG.blockMs
    )
  }
}

export function clearSuccessfulLoginAttempts(normalizedEmail: string): void {
  loginBuckets.delete(emailKey(normalizedEmail))
}

// Test-Helfer: nur in Unit-Tests verwenden.
export function __resetLoginRateLimitForTests(): void {
  loginBuckets.clear()
}

// Test-Helfer: nur in Unit-Tests verwenden.
export function __getLoginRateLimitBucketCountForTests(): number {
  return loginBuckets.size
}
