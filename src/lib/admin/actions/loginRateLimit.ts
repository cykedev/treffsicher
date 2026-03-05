import { db } from "@/lib/db"
import {
  LoginRateLimitBucketKeySchema,
  mapLoginRateLimitRowToAdminBucket,
  revalidateAdminPaths,
  requireAdminSession,
  TOP_NOISY_LIMIT,
  TOP_NOISY_WINDOW_HOURS,
} from "@/lib/admin/actions/shared"
import type { AdminActionResult, AdminLoginRateLimitBucket, AdminLoginRateLimitInsights } from "@/lib/admin/types"

const LOGIN_BUCKET_SELECT = {
  key: true,
  attempts: true,
  windowStartedAt: true,
  blockedUntil: true,
  lastAttemptAt: true,
} as const

const EMPTY_INSIGHTS: AdminLoginRateLimitInsights = {
  totalBucketCount: 0,
  activeBlockedCount: 0,
  activeBlockedBuckets: [],
  topNoisyBuckets: [],
}

export async function getAdminBlockedLoginRateLimitBucketsAction(): Promise<
  AdminLoginRateLimitBucket[]
> {
  const admin = await requireAdminSession()
  if (!admin) return []

  const now = new Date()
  const rows = await db.loginRateLimitBucket.findMany({
    where: {
      blockedUntil: {
        gt: now,
      },
    },
    select: LOGIN_BUCKET_SELECT,
    orderBy: [{ blockedUntil: "asc" }, { lastAttemptAt: "desc" }],
    take: 200,
  })

  return rows.flatMap((row) => {
    const mapped = mapLoginRateLimitRowToAdminBucket(row)
    return mapped ? [mapped] : []
  })
}

export async function getAdminLoginRateLimitInsightsAction(): Promise<AdminLoginRateLimitInsights> {
  const admin = await requireAdminSession()
  if (!admin) return EMPTY_INSIGHTS

  const now = new Date()
  const noisyWindowStart = new Date(now.getTime() - TOP_NOISY_WINDOW_HOURS * 60 * 60 * 1000)

  const [totalBucketCount, activeBlockedCount, activeRows, noisyRows] = await Promise.all([
    db.loginRateLimitBucket.count(),
    db.loginRateLimitBucket.count({
      where: {
        blockedUntil: {
          gt: now,
        },
      },
    }),
    db.loginRateLimitBucket.findMany({
      where: {
        blockedUntil: {
          gt: now,
        },
      },
      select: LOGIN_BUCKET_SELECT,
      orderBy: [{ blockedUntil: "asc" }, { lastAttemptAt: "desc" }],
      take: 200,
    }),
    db.loginRateLimitBucket.findMany({
      where: {
        lastAttemptAt: {
          gte: noisyWindowStart,
        },
      },
      select: LOGIN_BUCKET_SELECT,
      orderBy: [{ attempts: "desc" }, { lastAttemptAt: "desc" }, { key: "asc" }],
      take: TOP_NOISY_LIMIT,
    }),
  ])

  const activeBlockedBuckets = activeRows.flatMap((row) => {
    const mapped = mapLoginRateLimitRowToAdminBucket(row)
    return mapped ? [mapped] : []
  })
  const topNoisyBuckets = noisyRows.flatMap((row) => {
    const mapped = mapLoginRateLimitRowToAdminBucket(row)
    return mapped ? [mapped] : []
  })

  return {
    totalBucketCount,
    activeBlockedCount,
    activeBlockedBuckets,
    topNoisyBuckets,
  }
}

export async function clearLoginRateLimitBucketAction(
  bucketKey: string
): Promise<AdminActionResult> {
  const admin = await requireAdminSession()
  if (!admin) return { error: "Keine Berechtigung." }

  const parsed = LoginRateLimitBucketKeySchema.safeParse(bucketKey)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültiger Rate-Limit-Schlüssel." }
  }

  await db.loginRateLimitBucket.deleteMany({
    where: { key: parsed.data },
  })

  revalidateAdminPaths()
  return { success: true }
}
