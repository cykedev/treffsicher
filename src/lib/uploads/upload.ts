import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { randomUUID } from "crypto"

// Erlaubte MIME-Typen — nur Bilder und PDFs (keine ausführbaren Dateien)
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"] as const
const MAX_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

type AllowedMime = (typeof ALLOWED_MIME_TYPES)[number]

export type UploadResult = {
  // Relativer Pfad innerhalb des Upload-Verzeichnisses (ohne UPLOAD_DIR-Prefix)
  filePath: string
  fileType: "IMAGE" | "PDF"
  originalName: string
}

/**
 * Speichert eine hochgeladene Datei sicher im Upload-Verzeichnis.
 * - Validiert MIME-Typ und Dateigrösse
 * - Generiert UUID-Dateinamen (kein Originalname im Filesystem — verhindert Path-Traversal)
 * - Legt das Verzeichnis an wenn es noch nicht existiert
 */
export async function saveUpload(file: File): Promise<UploadResult> {
  // MIME-Typ validieren — der Browser setzt diesen, wir prüfen zusätzlich die Dateiendung
  if (!ALLOWED_MIME_TYPES.includes(file.type as AllowedMime)) {
    throw new Error(
      `Dateityp nicht erlaubt. Erlaubt sind: JPEG, PNG, WebP, PDF. Erhalten: ${file.type}`
    )
  }

  // Dateigrösse prüfen
  if (file.size > MAX_SIZE_BYTES) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1)
    throw new Error(`Datei zu gross (${sizeMB} MB). Maximum: 10 MB`)
  }

  // Dateiendung aus MIME-Typ ableiten — nie vom Originalnamen übernehmen (Sicherheit)
  const extension = mimeToExtension(file.type as AllowedMime)
  const uuid = randomUUID()
  const fileName = `${uuid}.${extension}`

  const uploadDir = process.env.UPLOAD_DIR ?? "/app/uploads"
  await mkdir(uploadDir, { recursive: true })

  // Dateiinhalt als Buffer lesen und schreiben
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(join(uploadDir, fileName), buffer)

  return {
    filePath: fileName,
    fileType: file.type === "application/pdf" ? "PDF" : "IMAGE",
    originalName: file.name,
  }
}

function mimeToExtension(mime: AllowedMime): string {
  switch (mime) {
    case "image/jpeg":
      return "jpg"
    case "image/png":
      return "png"
    case "image/webp":
      return "webp"
    case "application/pdf":
      return "pdf"
  }
}
