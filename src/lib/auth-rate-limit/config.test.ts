import { afterEach, describe, expect, it, vi } from "vitest"

const originalMaxBuckets = process.env.AUTH_RATE_LIMIT_MAX_BUCKETS

afterEach(() => {
  vi.resetModules()
  if (originalMaxBuckets === undefined) {
    delete process.env.AUTH_RATE_LIMIT_MAX_BUCKETS
  } else {
    process.env.AUTH_RATE_LIMIT_MAX_BUCKETS = originalMaxBuckets
  }
})

async function loadConfig() {
  return import("@/lib/auth-rate-limit/config")
}

describe("LOGIN_RATE_LIMIT_CONFIG.maxBuckets", () => {
  it("verwendet Standardwert ohne env", async () => {
    delete process.env.AUTH_RATE_LIMIT_MAX_BUCKETS

    const { LOGIN_RATE_LIMIT_CONFIG } = await loadConfig()

    expect(LOGIN_RATE_LIMIT_CONFIG.maxBuckets).toBe(10_000)
  })

  it("uebernimmt gueltige env-Werte ab 1000", async () => {
    process.env.AUTH_RATE_LIMIT_MAX_BUCKETS = "2500"

    const { LOGIN_RATE_LIMIT_CONFIG } = await loadConfig()

    expect(LOGIN_RATE_LIMIT_CONFIG.maxBuckets).toBe(2500)
  })

  it("faellt bei ungueltigen oder zu kleinen env-Werten auf Standard zurueck", async () => {
    process.env.AUTH_RATE_LIMIT_MAX_BUCKETS = "999"
    let loadedConfig = await loadConfig()
    expect(loadedConfig.LOGIN_RATE_LIMIT_CONFIG.maxBuckets).toBe(10_000)

    vi.resetModules()
    process.env.AUTH_RATE_LIMIT_MAX_BUCKETS = "foo"
    loadedConfig = await loadConfig()
    expect(loadedConfig.LOGIN_RATE_LIMIT_CONFIG.maxBuckets).toBe(10_000)
  })
})
