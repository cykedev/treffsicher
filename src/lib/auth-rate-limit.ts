type LoginBucket = {
  attempts: number
  windowStartedAt: number
  blockedUntil: number
  lastAttemptAt: number
}

const loginBuckets = new Map<string, LoginBucket>()

export const LOGIN_RATE_LIMIT_CONFIG = {
  windowMs: 15 * 60 * 1000,
  blockMs: 15 * 60 * 1000,
  maxAttemptsPerEmail: 5,
  maxAttemptsPerIp: 30,
  staleEntryMs: 24 * 60 * 60 * 1000,
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
  return email.trim().toLowerCase()
}

function normalizeIpHeaderValue(ipHeaderValue?: string | null): string | null {
  if (!ipHeaderValue) return null
  const firstValue = ipHeaderValue.split(",")[0]
  const normalized = firstValue?.trim()
  return normalized ? normalized : null
}

function cleanupExpiredBuckets(nowMs: number): void {
  for (const [key, bucket] of loginBuckets.entries()) {
    const referenceTimestamp = Math.max(bucket.blockedUntil, bucket.lastAttemptAt)
    if (nowMs - referenceTimestamp > LOGIN_RATE_LIMIT_CONFIG.staleEntryMs) {
      loginBuckets.delete(key)
    }
  }
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
