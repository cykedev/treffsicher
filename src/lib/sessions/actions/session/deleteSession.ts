import { revalidatePath } from "next/cache"
import { getAuthSession } from "@/lib/auth-helpers"
import { db } from "@/lib/db"
import type { ActionResult } from "@/lib/sessions/actions/types"

export async function deleteSessionAction(id: string): Promise<ActionResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  const existing = await db.trainingSession.findFirst({
    where: { id, userId: session.user.id },
    include: { attachments: true },
  })
  if (!existing) return { error: "Einheit nicht gefunden" }

  const { unlink } = await import("fs/promises")
  const uploadDir = process.env.UPLOAD_DIR ?? "/app/uploads"
  for (const attachment of existing.attachments) {
    try {
      await unlink(`${uploadDir}/${attachment.filePath}`)
    } catch {
      // Datei fehlt auf Disk — kein Fehler, DB-Eintrag wird trotzdem geloescht.
    }
  }

  await db.trainingSession.delete({ where: { id } })

  revalidatePath("/sessions")
  return { success: true }
}
