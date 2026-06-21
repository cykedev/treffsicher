import { db } from "@/lib/db"
import { getAuthSession } from "@/lib/auth-helpers"
import {
  extractMeytonDateTime,
  extractMeytonHitLocation,
  extractTextFromPdfBuffer,
  parseMeytonSeriesFromText,
} from "@/lib/sessions/meytonImport"
import {
  calculateSeriesTotal,
  mapShotToScoringType,
  MeytonImportSchema,
} from "@/lib/sessions/actions/shared"
import { loadPdfFromUpload, loadPdfFromUrl } from "@/lib/sessions/actions/meytonPdfLoaders"
import type {
  MeytonImportPreviewResult,
  MeytonImportPreviewSeries,
} from "@/lib/sessions/actions/types"

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

  // Vorschau zeigt bereits disziplinspezifisch konvertierte Werte.
  // Nutzer sollen vor dem Speichern exakt die Werte sehen, die spaeter auch
  // in dieser Disziplin persistiert werden.
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
