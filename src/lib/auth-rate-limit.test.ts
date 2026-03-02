import { beforeEach, describe, expect, it } from "vitest"
import {
  __getLoginRateLimitBucketCountForTests,
  __resetLoginRateLimitForTests,
  checkLoginAllowed,
  clearSuccessfulLoginAttempts,
  LOGIN_RATE_LIMIT_CONFIG,
  registerFailedLoginAttempt,
} from "./auth-rate-limit"

describe("auth-rate-limit", () => {
  beforeEach(() => {
    __resetLoginRateLimitForTests()
  })

  it("blockt eine E-Mail nach zu vielen Fehlversuchen", () => {
    const nowMs = 1_000_000
    const header = "203.0.113.8"

    for (let i = 0; i < LOGIN_RATE_LIMIT_CONFIG.maxAttemptsPerEmail; i++) {
      const state = checkLoginAllowed("User@Example.com", header, nowMs + i)
      expect(state.allowed).toBe(true)
      registerFailedLoginAttempt(state.normalizedEmail, state.normalizedIp, nowMs + i)
    }

    const blocked = checkLoginAllowed("user@example.com", header, nowMs + 100)
    expect(blocked.allowed).toBe(false)
  })

  it("entsperrt nach Ablauf der Blockdauer", () => {
    const nowMs = 2_000_000
    const header = "203.0.113.9"

    for (let i = 0; i < LOGIN_RATE_LIMIT_CONFIG.maxAttemptsPerEmail; i++) {
      const state = checkLoginAllowed("athlete@example.com", header, nowMs + i)
      registerFailedLoginAttempt(state.normalizedEmail, state.normalizedIp, nowMs + i)
    }

    const unblocked = checkLoginAllowed(
      "athlete@example.com",
      header,
      nowMs + LOGIN_RATE_LIMIT_CONFIG.blockMs + LOGIN_RATE_LIMIT_CONFIG.maxAttemptsPerEmail + 1
    )
    expect(unblocked.allowed).toBe(true)
  })

  it("normalisiert x-forwarded-for auf die erste IP", () => {
    const state = checkLoginAllowed("coach@example.com", "203.0.113.10, 10.0.0.5", 3_000_000)
    expect(state.normalizedIp).toBe("203.0.113.10")
  })

  it("ignoriert ungueltige IP-Header-Werte", () => {
    const state = checkLoginAllowed("coach@example.com", "not-an-ip, still-not-an-ip", 3_000_500)
    expect(state.normalizedIp).toBeNull()
  })

  it("loescht den E-Mail-Bucket bei erfolgreichem Login", () => {
    const nowMs = 4_000_000
    const header = "203.0.113.11"

    for (let i = 0; i < LOGIN_RATE_LIMIT_CONFIG.maxAttemptsPerEmail; i++) {
      const state = checkLoginAllowed("shooter@example.com", header, nowMs + i)
      registerFailedLoginAttempt(state.normalizedEmail, state.normalizedIp, nowMs + i)
    }

    clearSuccessfulLoginAttempts("shooter@example.com")
    const afterSuccess = checkLoginAllowed("shooter@example.com", header, nowMs + 100)
    expect(afterSuccess.allowed).toBe(true)
  })

  it("blockt ueber die IP-Grenze auch bei wechselnden E-Mails", () => {
    const nowMs = 5_000_000
    const header = "198.51.100.77"

    for (let i = 0; i < LOGIN_RATE_LIMIT_CONFIG.maxAttemptsPerIp; i++) {
      const state = checkLoginAllowed(`user${i}@example.com`, header, nowMs + i)
      expect(state.allowed).toBe(true)
      registerFailedLoginAttempt(state.normalizedEmail, state.normalizedIp, nowMs + i)
    }

    const blocked = checkLoginAllowed("fresh@example.com", header, nowMs + 100)
    expect(blocked.allowed).toBe(false)
  })

  it("begrenzt die Anzahl gespeicherter Buckets", () => {
    const nowMs = 6_000_000
    const attempts = LOGIN_RATE_LIMIT_CONFIG.maxBuckets + 200

    for (let i = 0; i < attempts; i++) {
      const state = checkLoginAllowed(`user-cap-${i}@example.com`, null, nowMs + i)
      registerFailedLoginAttempt(state.normalizedEmail, state.normalizedIp, nowMs + i)
    }

    expect(__getLoginRateLimitBucketCountForTests()).toBeLessThanOrEqual(
      LOGIN_RATE_LIMIT_CONFIG.maxBuckets
    )
  })
})
