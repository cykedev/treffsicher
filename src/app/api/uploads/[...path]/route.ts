import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { extname, isAbsolute, relative, resolve } from "path"
import { getAuthSession } from "@/lib/auth-helpers"
import { db } from "@/lib/db"

// Content-Type aus Dateiendung ableiten
function getContentType(filename: string): string {
  const ext = extname(filename).toLowerCase()
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg"
    case ".png":
      return "image/png"
    case ".webp":
      return "image/webp"
    case ".pdf":
      return "application/pdf"
    default:
      return "application/octet-stream"
  }
}

function isValidRelativeUploadPath(path: string): boolean {
  // Wir speichern Uploads als einzelne UUID-Dateien ohne Unterordner.
  if (!path || path.includes("/") || path.includes("\\") || path.includes("..")) {
    return false
  }
  return true
}

/**
 * Stellt hochgeladene Dateien aus dem Upload-Verzeichnis bereit.
 * Sicherheit:
 * - Ownership-Check über Attachment -> Session.userId
 * - Traversal-Schutz via resolve/relative (kein startsWith-Vergleich)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await getAuthSession()
  if (!session) {
    return new NextResponse("Nicht angemeldet", { status: 401 })
  }

  const { path } = await params
  if (path.length !== 1) {
    return new NextResponse("Ungültiger Pfad", { status: 400 })
  }

  const requestedFilePath = path[0]
  if (!isValidRelativeUploadPath(requestedFilePath)) {
    return new NextResponse("Ungültiger Pfad", { status: 400 })
  }

  // Zugriff nur auf eigene Anhänge erlauben (Cross-Tenant-Schutz).
  const attachment = await db.attachment.findFirst({
    where: {
      filePath: requestedFilePath,
      session: {
        userId: session.user.id,
      },
    },
    select: {
      filePath: true,
      fileType: true,
    },
  })

  if (!attachment) {
    // Keine Unterscheidung zwischen "existiert nicht" und "gehört anderem Nutzer".
    return new NextResponse("Datei nicht gefunden", { status: 404 })
  }

  const uploadDir = process.env.UPLOAD_DIR ?? "/app/uploads"
  const resolvedUploadDir = resolve(uploadDir)
  const resolvedFilePath = resolve(resolvedUploadDir, attachment.filePath)
  const relativeFilePath = relative(resolvedUploadDir, resolvedFilePath)

  // Verhindert Path-Traversal, auch bei Prefix-Fallen wie "/app/uploads-secret".
  if (relativeFilePath.startsWith("..") || isAbsolute(relativeFilePath)) {
    return new NextResponse("Ungültiger Pfad", { status: 400 })
  }

  try {
    const fileBuffer = await readFile(resolvedFilePath)
    const contentType =
      attachment.fileType === "PDF" ? "application/pdf" : getContentType(attachment.filePath)

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        // Browser darf die Datei cachen — UUID-Dateinamen sind stabil
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch {
    return new NextResponse("Datei nicht gefunden", { status: 404 })
  }
}
