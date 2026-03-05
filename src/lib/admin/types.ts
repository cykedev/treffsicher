import type { ScoringType, UserRole } from "@/generated/prisma/client"

export type AdminActionResult = {
  error?: string
  success?: boolean
}

export type AdminUserSummary = {
  id: string
  name: string | null
  email: string
  role: UserRole
  isActive: boolean
  createdAt: Date
}

export type AdminUserListItem = AdminUserSummary & {
  sessionsCount: number
  goalsCount: number
  shotRoutinesCount: number
  lastSessionEditAt: Date | null
}

export type AdminSystemDisciplineSummary = {
  id: string
  name: string
  seriesCount: number
  shotsPerSeries: number
  practiceSeries: number
  scoringType: ScoringType
  isArchived: boolean
  createdAt: Date
  updatedAt: Date
}

export type AdminLoginRateLimitBucket = {
  key: string
  type: "EMAIL" | "IP"
  identifier: string
  attempts: number
  windowStartedAt: Date
  blockedUntil: Date | null
  lastAttemptAt: Date
}

export type AdminLoginRateLimitInsights = {
  totalBucketCount: number
  activeBlockedCount: number
  activeBlockedBuckets: AdminLoginRateLimitBucket[]
  topNoisyBuckets: AdminLoginRateLimitBucket[]
}
