import { db } from "@/lib/db"
import { requireAdminSession } from "@/lib/admin/actions/shared"
import type { AdminUserListItem, AdminUserSummary } from "@/lib/admin/types"

export async function getAdminUsersAction(): Promise<AdminUserListItem[]> {
  const admin = await requireAdminSession()
  if (!admin) return []

  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      _count: {
        select: {
          sessions: true,
          goals: true,
          shotRoutines: true,
        },
      },
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  })

  const lastSessionUpdates = await db.trainingSession.groupBy({
    by: ["userId"],
    _max: {
      updatedAt: true,
    },
  })
  const lastSessionByUserId = new Map(
    lastSessionUpdates.map((row) => [row.userId, row._max.updatedAt ?? null])
  )

  // Last-Edit separat per groupBy laden, damit die Haupt-User-Query schlank bleibt.
  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    sessionsCount: user._count.sessions,
    goalsCount: user._count.goals,
    shotRoutinesCount: user._count.shotRoutines,
    lastSessionEditAt: lastSessionByUserId.get(user.id) ?? null,
  }))
}

export async function getAdminUserByIdAction(userId: string): Promise<AdminUserSummary | null> {
  const admin = await requireAdminSession()
  if (!admin) return null

  return db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  })
}
