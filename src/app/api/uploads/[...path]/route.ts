import { NextRequest, NextResponse } from "next/server"
import { readFile } from "fs/promises"
import { join, extname } from "path"
import { getAuthSession } from "@/lib/auth-helpers"

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

/**
 * Stellt hochgeladene Dateien aus dem Upload-Verzeichnis bereit.
 * Auth-Check: Nur eingeloggte Nutzer können Dateien abrufen.
 * UUID-Dateinamen machen Pfade praktisch unratbar — kein Ownership-Check nötig.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await getAuthSession()
  if (!session) {
    return new NextResponse("Nicht angemeldet", { status: 401 })
  }

  const { path } = await params
  const uploadDir = process.env.UPLOAD_DIR ?? "/app/uploads"
  const filePath = join(uploadDir, ...path)

  // Sicherstellen dass der Pfad innerhalb von UPLOAD_DIR liegt (verhindert Path-Traversal)
  if (!filePath.startsWith(uploadDir)) {
    return new NextResponse("Ungültiger Pfad", { status: 400 })
  }

  try {
    const fileBuffer = await readFile(filePath)
    const contentType = getContentType(path[path.length - 1])

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
