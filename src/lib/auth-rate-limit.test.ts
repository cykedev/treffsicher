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
  beforeEach(async () => {
    await __resetLoginRateLimitForTests()
  })

  it("blockt eine E-Mail nach zu vielen Fehlversuchen", async () => {
    const nowMs = 1_000_000
    const header = "203.0.113.8"

    for (let i = 0; i < LOGIN_RATE_LIMIT_CONFIG.maxAttemptsPerEmail; i++) {
      const state = await checkLoginAllowed("User@Example.com", header, nowMs + i)
      expect(state.allowed).toBe(true)
      await registerFailedLoginAttempt(state.normalizedEmail, state.normalizedIp, nowMs + i)
    }

    const blocked = await checkLoginAllowed("user@example.com", header, nowMs + 100)
    expect(blocked.allowed).toBe(false)
  })

  it("entsperrt nach Ablauf der Blockdauer", async () => {
    const nowMs = 2_000_000
    const header = "203.0.113.9"

    for (let i = 0; i < LOGIN_RATE_LIMIT_CONFIG.maxAttemptsPerEmail; i++) {
      const state = await checkLoginAllowed("athlete@example.com", header, nowMs + i)
      await registerFailedLoginAttempt(state.normalizedEmail, state.normalizedIp, nowMs + i)
    }

    const unblocked = await checkLoginAllowed(
      "athlete@example.com",
      header,
      nowMs + LOGIN_RATE_LIMIT_CONFIG.blockMs + LOGIN_RATE_LIMIT_CONFIG.maxAttemptsPerEmail + 1
    )
    expect(unblocked.allowed).toBe(true)
  })

  it("normalisiert x-forwarded-for auf die erste IP", async () => {
    const state = await checkLoginAllowed("coach@example.com", "203.0.113.10, 10.0.0.5", 3_000_000)
    expect(state.normalizedIp).toBe("203.0.113.10")
  })

  it("ignoriert ungueltige IP-Header-Werte", async () => {
    const state = await checkLoginAllowed(
      "coach@example.com",
      "not-an-ip, still-not-an-ip",
      3_000_500
    )
    expect(state.normalizedIp).toBeNull()
  })

  it("loescht den E-Mail-Bucket bei erfolgreichem Login", async () => {
    const nowMs = 4_000_000
    const header = "203.0.113.11"

    for (let i = 0; i < LOGIN_RATE_LIMIT_CONFIG.maxAttemptsPerEmail; i++) {
      const state = await checkLoginAllowed("shooter@example.com", header, nowMs + i)
      await registerFailedLoginAttempt(state.normalizedEmail, state.normalizedIp, nowMs + i)
    }

    await clearSuccessfulLoginAttempts("shooter@example.com")
    const afterSuccess = await checkLoginAllowed("shooter@example.com", header, nowMs + 100)
    expect(afterSuccess.allowed).toBe(true)
  })

  it("blockt ueber die IP-Grenze auch bei wechselnden E-Mails", async () => {
    const nowMs = 5_000_000
    const header = "198.51.100.77"

    for (let i = 0; i < LOGIN_RATE_LIMIT_CONFIG.maxAttemptsPerIp; i++) {
      const state = await checkLoginAllowed(`user${i}@example.com`, header, nowMs + i)
      expect(state.allowed).toBe(true)
      await registerFailedLoginAttempt(state.normalizedEmail, state.normalizedIp, nowMs + i)
    }

    const blocked = await checkLoginAllowed("fresh@example.com", header, nowMs + 100)
    expect(blocked.allowed).toBe(false)
  })

  it("begrenzt die Anzahl gespeicherter Buckets", async () => {
    const nowMs = 6_000_000
    const attempts = LOGIN_RATE_LIMIT_CONFIG.maxBuckets + 200

    for (let i = 0; i < attempts; i++) {
      const state = await checkLoginAllowed(`user-cap-${i}@example.com`, null, nowMs + i)
      await registerFailedLoginAttempt(state.normalizedEmail, state.normalizedIp, nowMs + i)
    }

    expect(await __getLoginRateLimitBucketCountForTests()).toBeLessThanOrEqual(
      LOGIN_RATE_LIMIT_CONFIG.maxBuckets
    )
  })
})
