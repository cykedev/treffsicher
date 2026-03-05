import { db } from "@/lib/db"
import { getAuthSession } from "@/lib/auth-helpers"
import { assertPublicImportTarget, validatePdfBuffer } from "@/lib/sessions/importGuards"
import { normalizeMeytonPdfUrlInput } from "@/lib/sessions/importUrl"
import {
  extractMeytonDateTime,
  extractMeytonHitLocation,
  extractTextFromPdfBuffer,
  parseMeytonSeriesFromText,
} from "@/lib/sessions/meytonImport"
import {
  calculateSeriesTotal,
  mapShotToScoringType,
  MAX_MEYTON_PDF_SIZE_BYTES,
  MeytonImportSchema,
} from "@/lib/sessions/actions/shared"
import type {
  MeytonImportPreviewResult,
  MeytonImportPreviewSeries,
} from "@/lib/sessions/actions/types"

async function loadPdfFromUrl(urlValue: string): Promise<Buffer> {
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

async function loadPdfFromUpload(file: File): Promise<Buffer> {
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
  return Buffer.from(arrayBuffer)
}

/**
 * Liest ein Meyton-PDF (URL oder Upload), extrahiert Serien + Schuesse
 * und liefert eine Vorschau fuer die Serien in der Einheit.
 */
export async function previewMeytonImportAction(
  formData: FormData
): Promise<MeytonImportPreviewResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  const parsed = MeytonImportSchema.safeParse({
    disciplineId: formData.get("disciplineId"),
    source: formData.get("source"),
    pdfUrl: formData.get("pdfUrl") || undefined,
  })

  if (!parsed.success) {
    return { error: "Bitte Disziplin und Quelle korrekt auswaehlen." }
  }

  const discipline = await db.discipline.findFirst({
    where: {
      id: parsed.data.disciplineId,
      isArchived: false,
      OR: [{ isSystem: true }, { ownerId: session.user.id }],
    },
    select: {
      id: true,
      scoringType: true,
    },
  })

  if (!discipline) {
    return { error: "Disziplin nicht gefunden oder keine Berechtigung." }
  }

  let pdfBuffer: Buffer
  try {
    if (parsed.data.source === "URL") {
      const pdfUrl = (parsed.data.pdfUrl ?? "").trim()
      if (!pdfUrl) return { error: "Bitte eine PDF-URL angeben." }
      pdfBuffer = await loadPdfFromUrl(pdfUrl)
    } else {
      const uploaded = formData.get("file")
      if (!(uploaded instanceof File)) {
        return { error: "Bitte eine PDF-Datei hochladen." }
      }
      pdfBuffer = await loadPdfFromUpload(uploaded)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "PDF konnte nicht geladen werden."
    return { error: message }
  }

  let extractedText: string
  try {
    extractedText = await extractTextFromPdfBuffer(pdfBuffer)
  } catch (error) {
    console.error("Meyton-Import: PDF-Text konnte nicht extrahiert werden:", error)
    return {
      error:
        "Die PDF konnte nicht gelesen werden (kein textbasiertes Meyton-PDF oder defekte Datei).",
    }
  }

  const parsedSeries = parseMeytonSeriesFromText(extractedText)
  if (parsedSeries.serien.length === 0) {
    return { error: "Keine Meyton-Serien im PDF gefunden." }
  }

  const importedSeries: MeytonImportPreviewSeries[] = parsedSeries.serien.map((serie) => {
    const convertedShots = serie.shots.map((value) =>
      mapShotToScoringType(value, discipline.scoringType)
    )
    return {
      nr: serie.nr,
      scoreTotal: calculateSeriesTotal(convertedShots, discipline.scoringType),
      shots: convertedShots,
    }
  })

  const hasAnyShots = importedSeries.some((serie) => serie.shots.length > 0)
  if (!hasAnyShots) {
    return { error: "Es wurden Serien erkannt, aber keine gueltigen Schusswerte gefunden." }
  }

  const hitLocation = extractMeytonHitLocation(extractedText)

  return {
    data: {
      date: extractMeytonDateTime(extractedText),
      series: importedSeries,
      hitLocation,
    },
  }
}
