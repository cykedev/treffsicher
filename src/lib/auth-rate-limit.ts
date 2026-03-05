import { LOGIN_RATE_LIMIT_CONFIG } from "@/lib/auth-rate-limit/config"
import { createLoginRateLimitService } from "@/lib/auth-rate-limit/limiter"
import { createRateLimitStoreForCurrentEnv } from "@/lib/auth-rate-limit/store"
import type { LoginRateLimitCheck } from "@/lib/auth-rate-limit/types"

const rateLimitStore = createRateLimitStoreForCurrentEnv()
const rateLimitService = createLoginRateLimitService(rateLimitStore, LOGIN_RATE_LIMIT_CONFIG)

export { LOGIN_RATE_LIMIT_CONFIG }

export async function checkLoginAllowed(
  email: string,
  ipHeaderValue?: string | null,
  nowMs: number = Date.now()
): Promise<LoginRateLimitCheck> {
  return rateLimitService.checkLoginAllowed(email, ipHeaderValue, nowMs)
}

export async function registerFailedLoginAttempt(
  normalizedEmail: string,
  normalizedIp: string | null,
  nowMs: number = Date.now()
): Promise<void> {
  return rateLimitService.registerFailedLoginAttempt(normalizedEmail, normalizedIp, nowMs)
}

export async function clearSuccessfulLoginAttempts(normalizedEmail: string): Promise<void> {
  return rateLimitService.clearSuccessfulLoginAttempts(normalizedEmail)
}

// Test-Helfer: nur in Unit-Tests verwenden.
export async function __resetLoginRateLimitForTests(): Promise<void> {
  return rateLimitService.resetForTests()
}

// Test-Helfer: nur in Unit-Tests verwenden.
export async function __getLoginRateLimitBucketCountForTests(): Promise<number> {
  return rateLimitService.getBucketCountForTests()
}
