import type { LoginRateLimitConfig } from "@/lib/auth-rate-limit/types"

const DEFAULT_MAX_RATE_LIMIT_BUCKETS = 10_000
export const CLEANUP_INTERVAL_MS = 60_000

function readMaxBucketsFromEnv(): number {
  const raw = process.env.AUTH_RATE_LIMIT_MAX_BUCKETS
  if (!raw) return DEFAULT_MAX_RATE_LIMIT_BUCKETS

  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed < 1000) {
    return DEFAULT_MAX_RATE_LIMIT_BUCKETS
  }

  return parsed
}

export const LOGIN_RATE_LIMIT_CONFIG: LoginRateLimitConfig = {
  windowMs: 15 * 60 * 1000,
  blockMs: 15 * 60 * 1000,
  maxAttemptsPerEmail: 5,
  maxAttemptsPerIp: 30,
  staleEntryMs: 24 * 60 * 60 * 1000,
  maxBuckets: readMaxBucketsFromEnv(),
}
