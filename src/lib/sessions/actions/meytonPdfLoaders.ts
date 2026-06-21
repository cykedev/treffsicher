import { assertPublicImportTarget, validatePdfBuffer } from "@/lib/sessions/importGuards"
import { normalizeMeytonPdfUrlInput } from "@/lib/sessions/importUrl"
import { MAX_MEYTON_PDF_SIZE_BYTES } from "@/lib/sessions/actions/shared"

export async function loadPdfFromUrl(urlValue: string): Promise<Buffer> {
  const normalizedUrl = normalizeMeytonPdfUrlInput(urlValue)

  let parsedUrl: URL
  try {
    parsedUrl = new URL(normalizedUrl)
  } catch {
    throw new Error("Die URL ist ungueltig.")
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    throw new Error("Nur http(s)-URLs sind erlaubt.")
  }

  // Vorab-SSRF-Schutz vor dem eigentlichen Download.
  // verhindert SSRF gegen interne Netze, selbst wenn die URL formal gueltig ist.
  await assertPublicImportTarget(parsedUrl.hostname)

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)

  try {
    const response = await fetch(parsedUrl, {
      signal: controller.signal,
      // Redirects nicht folgen, damit kein ungeprueftes Ziel nachgeladen wird.
      redirect: "manual",
    })

    if (response.status >= 300 && response.status < 400) {
      throw new Error("Weiterleitungen sind nicht erlaubt.")
    }

    if (!response.ok) {
      throw new Error(`PDF konnte nicht geladen werden (HTTP ${response.status}).`)
    }

    const contentType = (response.headers.get("content-type") ?? "").toLowerCase()
    if (contentType && !contentType.includes("application/pdf")) {
      throw new Error("Die URL liefert kein PDF (Content-Type ungueltig).")
    }

    const contentLength = response.headers.get("content-length")
    if (contentLength) {
      const parsedLength = Number.parseInt(contentLength, 10)
      if (Number.isFinite(parsedLength) && parsedLength > MAX_MEYTON_PDF_SIZE_BYTES) {
        throw new Error("Die PDF-Datei ist groesser als 10 MB.")
      }
    }

    const body = response.body
    if (!body) {
      throw new Error("Die PDF konnte nicht gelesen werden (leerer Response-Body).")
    }

    const reader = body.getReader()
    const chunks: Uint8Array[] = []
    let totalSize = 0

    // Streaming mit Hard-Cap statt Vollpufferung.
    // so koennen wir die 10-MB-Grenze waehrend des Downloads erzwingen
    // und grosse Antworten fruehzeitig abbrechen.
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value || value.length === 0) continue

      totalSize += value.length
      if (totalSize > MAX_MEYTON_PDF_SIZE_BYTES) {
        try {
          await reader.cancel()
        } catch {
          // Ignorieren: wir werfen den Groessenfehler weiter unten.
        }
        throw new Error("Die PDF-Datei ist groesser als 10 MB.")
      }

      chunks.push(value)
    }

    const buffer = Buffer.concat(
      chunks.map((chunk) => Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength)),
      totalSize
    )

    if (buffer.length === 0) {
      throw new Error("Die PDF-Datei ist leer.")
    }
    if (buffer.length > MAX_MEYTON_PDF_SIZE_BYTES) {
      throw new Error("Die PDF-Datei ist groesser als 10 MB.")
    }

    validatePdfBuffer(buffer)

    return buffer
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Timeout beim Laden der PDF-URL.")
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

export async function loadPdfFromUpload(file: File): Promise<Buffer> {
  const fileName = file.name.toLowerCase()

  if (file.size === 0) {
    throw new Error("Die hochgeladene PDF-Datei ist leer.")
  }
  if (file.size > MAX_MEYTON_PDF_SIZE_BYTES) {
    throw new Error("Die hochgeladene PDF-Datei ist groesser als 10 MB.")
  }
  if (file.type !== "application/pdf" && !fileName.endsWith(".pdf")) {
    throw new Error("Bitte eine gueltige PDF-Datei hochladen.")
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  validatePdfBuffer(buffer)
  return buffer
}
