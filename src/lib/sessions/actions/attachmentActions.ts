import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { getAuthSession } from "@/lib/auth-helpers"
import { saveUpload } from "@/lib/uploads/upload"
import { isScoringSessionType } from "@/lib/sessions/actions/shared"
import type { ActionResult } from "@/lib/sessions/actions/types"

/**
 * Laedt einen Anhang hoch und verknuepft ihn mit einer Einheit.
 * Prueft, dass die Einheit dem angemeldeten Nutzer gehoert.
 */
export async function uploadAttachmentAction(
  sessionId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  // Sicherstellen dass die Session dem Nutzer gehoert
  const trainingSession = await db.trainingSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
  })
  if (!trainingSession) return { error: "Einheit nicht gefunden" }
  if (!isScoringSessionType(trainingSession.type)) {
    // Prüfung serverseitig erzwingen, weil UI-Regeln manipulierte Requests nicht verhindern.
    return { error: "Anhaenge sind nur bei Training und Wettkampf verfuegbar." }
  }

  const file = formData.get("file")
  if (!file || !(file instanceof File)) return { error: "Keine Datei ausgewählt" }
  if (file.size === 0) return { error: "Die Datei ist leer" }

  try {
    const { filePath, fileType, originalName } = await saveUpload(file)

    await db.attachment.create({
      data: {
        sessionId,
        // Attachment hat kein userId-Feld — Eigentuemerschaft ueber die verknuepfte Session
        filePath,
        fileType,
        originalName,
      },
    })

    revalidatePath(`/sessions/${sessionId}`)
    return { success: true }
  } catch (err) {
    console.error("Fehler beim Upload:", err)
    const message = err instanceof Error ? err.message : "Upload fehlgeschlagen"
    return { error: message }
  }
}

/**
 * Loescht einen Anhang — Datei vom Disk und Eintrag aus der DB.
 * Prueft Eigentuemerschaft vor der Loeschung.
 */
export async function deleteAttachmentAction(attachmentId: string): Promise<ActionResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  const attachment = await db.attachment.findFirst({
    where: {
      id: attachmentId,
      // Sicherheit: Eigentuemerschaft ueber verknuepfte Session pruefen (kein direktes userId auf Attachment)
      session: { userId: session.user.id },
    },
  })
  if (!attachment) return { error: "Anhang nicht gefunden" }

  try {
    // Datei vom Disk loeschen
    const { unlink } = await import("fs/promises")
    const uploadDir = process.env.UPLOAD_DIR ?? "/app/uploads"
    await unlink(`${uploadDir}/${attachment.filePath}`)
  } catch (err) {
    // Datei fehlt auf Disk — trotzdem DB-Eintrag loeschen um konsistenten Zustand herzustellen
    console.warn("Datei konnte nicht geloescht werden (evtl. nicht vorhanden):", err)
  }

  await db.attachment.delete({ where: { id: attachmentId } })
  revalidatePath(`/sessions/${attachment.sessionId}`)
  return { success: true }
}
