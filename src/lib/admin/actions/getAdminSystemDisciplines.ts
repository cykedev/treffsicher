import { db } from "@/lib/db"
import { requireAdminSession } from "@/lib/admin/actions/shared"
import type { AdminSystemDisciplineSummary } from "@/lib/admin/types"

export async function getAdminSystemDisciplinesAction(): Promise<AdminSystemDisciplineSummary[]> {
  const admin = await requireAdminSession()
  if (!admin) return []

  return db.discipline.findMany({
    where: { isSystem: true },
    select: {
      id: true,
      name: true,
      seriesCount: true,
      shotsPerSeries: true,
      practiceSeries: true,
      scoringType: true,
      isArchived: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ isArchived: "asc" }, { name: "asc" }],
  })
}
