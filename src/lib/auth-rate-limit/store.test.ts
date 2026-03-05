import { describe, expect, it } from "vitest"
import { createRateLimitStoreForCurrentEnv } from "@/lib/auth-rate-limit/store"

describe("createRateLimitStoreForCurrentEnv (test env)", () => {
  it("liefert einen funktionalen In-Memory-Store", async () => {
    const store = createRateLimitStoreForCurrentEnv()
    await store.resetForTests()

    await store.set("email:a@example.com", {
      attempts: 2,
      windowStartedAt: 10,
      blockedUntil: 0,
      lastAttemptAt: 20,
    })

    expect(await store.count()).toBe(1)
    expect(await store.get("email:a@example.com")).toEqual({
      attempts: 2,
      windowStartedAt: 10,
      blockedUntil: 0,
      lastAttemptAt: 20,
    })
    expect(await store.getMany(["email:a@example.com", "email:missing"])).toEqual(
      new Map([
        [
          "email:a@example.com",
          {
            attempts: 2,
            windowStartedAt: 10,
            blockedUntil: 0,
            lastAttemptAt: 20,
          },
        ],
      ])
    )
  })

  it("sortiert oldestKeys ueber die Relevanz (max aus blockedUntil/lastAttemptAt)", async () => {
    const store = createRateLimitStoreForCurrentEnv()
    await store.resetForTests()

    await store.set("k1", {
      attempts: 1,
      windowStartedAt: 0,
      blockedUntil: 100,
      lastAttemptAt: 10,
    })
    await store.set("k2", {
      attempts: 1,
      windowStartedAt: 0,
      blockedUntil: 0,
      lastAttemptAt: 50,
    })
    await store.set("k3", {
      attempts: 1,
      windowStartedAt: 0,
      blockedUntil: 0,
      lastAttemptAt: 80,
    })

    expect(await store.getOldestKeys(2)).toEqual(["k2", "k3"])
  })

  it("loescht nur wirklich abgelaufene Buckets", async () => {
    const store = createRateLimitStoreForCurrentEnv()
    await store.resetForTests()

    await store.set("active", {
      attempts: 1,
      windowStartedAt: 0,
      blockedUntil: 120,
      lastAttemptAt: 20,
    })
    await store.set("stale", {
      attempts: 1,
      windowStartedAt: 0,
      blockedUntil: 0,
      lastAttemptAt: 60,
    })

    await store.deleteExpired(100)

    expect(await store.get("active")).not.toBeNull()
    expect(await store.get("stale")).toBeNull()
  })

  it("unterstuetzt delete/deleteMany/reset", async () => {
    const store = createRateLimitStoreForCurrentEnv()
    await store.resetForTests()

    await store.set("a", { attempts: 1, windowStartedAt: 0, blockedUntil: 0, lastAttemptAt: 1 })
    await store.set("b", { attempts: 1, windowStartedAt: 0, blockedUntil: 0, lastAttemptAt: 2 })
    await store.set("c", { attempts: 1, windowStartedAt: 0, blockedUntil: 0, lastAttemptAt: 3 })

    await store.delete("a")
    await store.deleteMany(["b"])
    expect(await store.count()).toBe(1)

    await store.resetForTests()
    expect(await store.count()).toBe(0)
  })
})
