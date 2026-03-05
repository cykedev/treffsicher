import type { Discipline } from "@/generated/prisma/client"
import { db } from "@/lib/db"
import { canManageDiscipline, requireAuthSession } from "@/lib/disciplines/actions/shared"
import type { DisciplineUsage } from "@/lib/disciplines/types"

export async function getDisciplinesAction(): Promise<Discipline[]> {
  const session = await requireAuthSession()
  if (!session) return []

  return db.discipline.findMany({
    where: {
      isArchived: false,
      OR: [{ isSystem: true }, { ownerId: session.user.id }],
    },
    orderBy: [{ isSystem: "desc" }, { name: "asc" }],
  })
}

export async function getDisciplinesForManagementAction(): Promise<Discipline[]> {
  const session = await requireAuthSession()
  if (!session) return []

  if (session.user.role === "ADMIN") {
    return db.discipline.findMany({
      where: {
        OR: [{ isSystem: true }, { ownerId: session.user.id, isSystem: false }],
      },
      orderBy: [{ isSystem: "desc" }, { isArchived: "asc" }, { name: "asc" }],
    })
  }

  return db.discipline.findMany({
    where: {
      OR: [
        { isSystem: true, isArchived: false },
        { ownerId: session.user.id, isSystem: false },
      ],
    },
    orderBy: [{ isSystem: "desc" }, { isArchived: "asc" }, { name: "asc" }],
  })
}

export async function getDisciplineForDetailAction(id: string): Promise<Discipline | null> {
  const session = await requireAuthSession()
  if (!session) return null

  if (session.user.role === "ADMIN") {
    return db.discipline.findFirst({
      where: {
        id,
        OR: [{ isSystem: true }, { ownerId: session.user.id }],
      },
    })
  }

  return db.discipline.findFirst({
    where: {
      id,
      OR: [
        { isSystem: true, isArchived: false },
        { ownerId: session.user.id, isSystem: false },
      ],
    },
  })
}

export async function getFavouriteDisciplineIdAction(): Promise<string | null> {
  const session = await requireAuthSession()
  if (!session) return null

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { favouriteDisciplineId: true },
  })

  const favouriteDisciplineId = user?.favouriteDisciplineId ?? null
  if (!favouriteDisciplineId) return null

  const favouriteDiscipline = await db.discipline.findFirst({
    where: {
      id: favouriteDisciplineId,
      isArchived: false,
      OR: [{ isSystem: true }, { ownerId: session.user.id }],
    },
    select: { id: true },
  })

  if (favouriteDiscipline) return favouriteDiscipline.id

  // Verwaisten Favoriten direkt bereinigen, damit Folgeabfragen keinen toten Verweis mitschleppen.
  await db.user.update({
    where: { id: session.user.id },
    data: { favouriteDisciplineId: null },
  })
  return null
}

export async function getDisciplineByIdAction(id: string): Promise<Discipline | null> {
  const session = await requireAuthSession()
  if (!session) return null

  if (session.user.role === "ADMIN") {
    return db.discipline.findFirst({
      where: {
        id,
        OR: [{ isSystem: true }, { ownerId: session.user.id }],
      },
    })
  }

  return db.discipline.findFirst({
    where: {
      id,
      ownerId: session.user.id,
      isSystem: false,
    },
  })
}

export async function getDisciplineUsageAction(id: string): Promise<DisciplineUsage | null> {
  const session = await requireAuthSession()
  if (!session) return null

  const discipline = await db.discipline.findUnique({
    where: { id },
    select: { id: true, ownerId: true, isSystem: true },
  })
  if (!discipline || !canManageDiscipline(session, discipline)) return null

  const [sessionCount, shotRoutineCount] = await Promise.all([
    db.trainingSession.count({ where: { disciplineId: id } }),
    db.shotRoutine.count({ where: { disciplineId: id } }),
  ])

  return {
    sessionCount,
    shotRoutineCount,
    canDelete: sessionCount === 0 && shotRoutineCount === 0,
  }
}
