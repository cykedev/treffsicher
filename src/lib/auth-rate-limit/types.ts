export type LoginBucket = {
  attempts: number
  windowStartedAt: number
  blockedUntil: number
  lastAttemptAt: number
}

export type LoginRateLimitStore = {
  get: (key: string) => Promise<LoginBucket | null>
  getMany: (keys: string[]) => Promise<Map<string, LoginBucket>>
  set: (key: string, bucket: LoginBucket) => Promise<void>
  delete: (key: string) => Promise<void>
  deleteMany: (keys: string[]) => Promise<void>
  count: () => Promise<number>
  getOldestKeys: (limit: number) => Promise<string[]>
  deleteExpired: (cutoffMs: number) => Promise<void>
  resetForTests: () => Promise<void>
}

export type LoginRateLimitConfig = {
  windowMs: number
  blockMs: number
  maxAttemptsPerEmail: number
  maxAttemptsPerIp: number
  staleEntryMs: number
  maxBuckets: number
}

export type LoginRateLimitCheck = {
  allowed: boolean
  normalizedEmail: string
  normalizedIp: string | null
}
