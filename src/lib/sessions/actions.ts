"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { getAuthSession } from "@/lib/auth-helpers"
import { saveUpload } from "@/lib/uploads/upload"
import { assertPublicImportTarget, validatePdfBuffer } from "@/lib/sessions/importGuards"
import { normalizeMeytonPdfUrlInput } from "@/lib/sessions/importUrl"
import {
  extractMeytonDateTime,
  extractMeytonHitLocation,
  extractTextFromPdfBuffer,
  parseMeytonSeriesFromText,
} from "@/lib/sessions/meytonImport"
import type {
  TrainingSession,
  Discipline,
  Series,
  Attachment,
  GoalType,
  Wellbeing,
  Reflection,
  Prognosis,
  Feedback,
  ScoringType,
  HitLocationHorizontalDirection,
  HitLocationVerticalDirection,
  PrismaClient,
} from "@/generated/prisma/client"

// ─────────────────────────────────────────────
// Typen
// ─────────────────────────────────────────────

export type SessionWithDiscipline = TrainingSession & {
  discipline: Discipline | null
  series: Array<{ scoreTotal: unknown; isPractice: boolean; shots: unknown }>
  // Für Tagebuch-Indikatoren: nur Vorhandensein prüfen, kein vollständiges Laden nötig
  wellbeing: { id: string } | null
  reflection: { id: string } | null
  prognosis: { id: string } | null
  feedback: { id: string } | null
}

// Prognosis mit serialisierten Decimal-Feldern — kann über die Server→Client-Grenze übergeben werden
export type SerializedPrognosis = Omit<Prognosis, "expectedScore"> & {
  expectedScore: string | null // Decimal → string serialisiert
}

// SeriesDetail mit serialisierten Decimal-Feldern
export type SerializedSeries = Omit<Series, "scoreTotal"> & {
  shots: unknown // Json-Feld aus Prisma
  scoreTotal: number | null // Decimal → number serialisiert
}

export type SessionGoalSummary = {
  goalId: string
  goal: {
    id: string
    title: string
    type: GoalType
  }
}

export type SessionDetail = TrainingSession & {
  discipline: Discipline | null
  // Decimal-Felder sind zu plain types serialisiert — keine Prisma Decimal-Objekte
  series: SerializedSeries[]
  attachments: Attachment[]
  goals: SessionGoalSummary[]
  // Mentaltraining-Daten — alle optional (Phase 3)
  wellbeing: Wellbeing | null
  reflection: Reflection | null
  prognosis: SerializedPrognosis | null
  feedback: Feedback | null
}

export type ActionResult = {
  error?: string
  success?: boolean
}

export type MeytonImportPreviewSeries = {
  nr: number
  scoreTotal: string
  shots: string[]
}

export type MeytonImportPreviewHitLocation = {
  horizontalMm: number
  horizontalDirection: HitLocationHorizontalDirection
  verticalMm: number
  verticalDirection: HitLocationVerticalDirection
}

export type MeytonImportPreview = {
  date: string | null
  series: MeytonImportPreviewSeries[]
  hitLocation: MeytonImportPreviewHitLocation | null
}

export type MeytonImportPreviewResult = {
  error?: string
  data?: MeytonImportPreview
}

// ─────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────

const CreateSessionSchema = z.object({
  type: z.enum(["TRAINING", "WETTKAMPF", "TROCKENTRAINING", "MENTAL"] as const),
  date: z.string().min(1, "Datum ist erforderlich"),
  location: z.string().optional(),
  disciplineId: z.string().optional(),
  trainingGoal: z.string().optional(),
})

const MeytonImportSchema = z.object({
  disciplineId: z.string().min(1, "Bitte Disziplin waehlen"),
  source: z.enum(["URL", "UPLOAD"] as const, {
    message: "Bitte Quelle waehlen",
  }),
  pdfUrl: z.string().optional(),
})

const MAX_MEYTON_PDF_SIZE_BYTES = 10 * 1024 * 1024
const MAX_SERIES_PER_SESSION = 120
const MAX_SHOTS_PER_SERIES = 120
const MAX_SHOTS_JSON_LENGTH = 16 * 1024
const MAX_GOAL_IDS_PER_REQUEST = 100
const HORIZONTAL_DIRECTION_VALUES = ["LEFT", "RIGHT"] as const
const VERTICAL_DIRECTION_VALUES = ["HIGH", "LOW"] as const

function isScoringSessionType(type: TrainingSession["type"]): boolean {
  return type === "TRAINING" || type === "WETTKAMPF"
}

function parseGoalIdsFromFormData(formData: FormData): string[] {
  const deduped = new Set<string>()
  for (const value of formData.getAll("goalIds")) {
    if (typeof value !== "string" || value.length === 0) continue
    deduped.add(value)
    if (deduped.size >= MAX_GOAL_IDS_PER_REQUEST) break
  }
  return [...deduped]
}

type ParsedHitLocationInput = {
  horizontalMm: number
  horizontalDirection: HitLocationHorizontalDirection
  verticalMm: number
  verticalDirection: HitLocationVerticalDirection
}

function parseHitLocationMillimeters(rawValue: FormDataEntryValue | null): number | null {
  if (typeof rawValue !== "string") return null
  const normalized = rawValue.trim().replace(",", ".")
  if (!normalized) return null
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 9999.99) return null
  return Math.round(parsed * 100) / 100
}

function parseHitLocationFromFormData(formData: FormData): ParsedHitLocationInput | null | "INVALID" {
  const horizontalMmRaw = formData.get("hitLocationHorizontalMm")
  const horizontalDirectionRaw = formData.get("hitLocationHorizontalDirection")
  const verticalMmRaw = formData.get("hitLocationVerticalMm")
  const verticalDirectionRaw = formData.get("hitLocationVerticalDirection")

  const hasAnyValue =
    (typeof horizontalMmRaw === "string" && horizontalMmRaw.trim() !== "") ||
    (typeof horizontalDirectionRaw === "string" && horizontalDirectionRaw.trim() !== "") ||
    (typeof verticalMmRaw === "string" && verticalMmRaw.trim() !== "") ||
    (typeof verticalDirectionRaw === "string" && verticalDirectionRaw.trim() !== "")

  if (!hasAnyValue) return null

  const horizontalMm = parseHitLocationMillimeters(horizontalMmRaw)
  const verticalMm = parseHitLocationMillimeters(verticalMmRaw)
  if (horizontalMm === null || verticalMm === null) return "INVALID"

  if (
    typeof horizontalDirectionRaw !== "string" ||
    typeof verticalDirectionRaw !== "string" ||
    !HORIZONTAL_DIRECTION_VALUES.includes(horizontalDirectionRaw as HitLocationHorizontalDirection) ||
    !VERTICAL_DIRECTION_VALUES.includes(verticalDirectionRaw as HitLocationVerticalDirection)
  ) {
    return "INVALID"
  }

  return {
    horizontalMm,
    horizontalDirection: horizontalDirectionRaw as HitLocationHorizontalDirection,
    verticalMm,
    verticalDirection: verticalDirectionRaw as HitLocationVerticalDirection,
  }
}

async function resolveAccessibleDisciplineId(
  disciplineId: string | undefined,
  userId: string
): Promise<string | null> {
  if (!disciplineId) return null

  const discipline = await db.discipline.findFirst({
    where: {
      id: disciplineId,
      isArchived: false,
      OR: [{ isSystem: true }, { ownerId: userId }],
    },
    select: { id: true },
  })

  return discipline?.id ?? null
}

function mapShotToScoringType(value: number, scoringType: ScoringType): string {
  if (scoringType === "WHOLE") {
    return String(Math.floor(value))
  }

  return value.toFixed(1)
}

function calculateSeriesTotal(shots: string[], scoringType: ScoringType): string {
  const sum = shots.reduce((total, shot) => total + Number(shot), 0)

  if (scoringType === "WHOLE") {
    return String(Math.floor(sum))
  }

  return (Math.round(sum * 10) / 10).toFixed(1)
}

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
      // Redirects nicht folgen, damit kein ungeprüftes Ziel nachgeladen wird.
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
          // Ignorieren: wir werfen den Größenfehler weiter unten.
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

// Schema für eine einzelne Serie inkl. Phase-2-Felder
const SeriesInputSchema = z.object({
  position: z.number().int().min(1),
  isPractice: z.boolean(),
  // Decimal als String für präzise Darstellung, null wenn nicht eingegeben
  scoreTotal: z
    .string()
    .optional()
    .transform((v) => (v && v !== "" ? v : null)),
  // Einzelschüsse als JSON-String-Array, optional
  shots: z
    .string()
    .max(MAX_SHOTS_JSON_LENGTH)
    .optional()
    .transform((v) => {
      if (!v) return null
      try {
        const parsed = JSON.parse(v)
        if (!Array.isArray(parsed)) return null
        // Nur nicht-leere, valide Strings behalten
        const values = parsed
          .filter((s: unknown) => typeof s === "string" && s !== "")
          .slice(0, MAX_SHOTS_PER_SERIES) as string[]
        return values
      } catch {
        return null
      }
    }),
  // Ausführungsqualität 1–5, optional
  executionQuality: z
    .string()
    .optional()
    .transform((v) => {
      if (!v || v === "") return null
      const n = parseInt(v, 10)
      return n >= 1 && n <= 5 ? n : null
    }),
})

function parseSeriesFromFormData(
  formData: FormData
): Array<z.infer<typeof SeriesInputSchema>> | null {
  const seriesData: Array<z.infer<typeof SeriesInputSchema>> = []

  let i = 0
  while (
    i < MAX_SERIES_PER_SESSION &&
    (formData.has(`series[${i}][scoreTotal]`) || formData.has(`series[${i}][isPractice]`))
  ) {
    const scoreTotalRaw = formData.get(`series[${i}][scoreTotal]`) as string | null
    const isPracticeRaw = formData.get(`series[${i}][isPractice]`)
    const shotsRaw = formData.get(`series[${i}][shots]`) as string | null
    const qualityRaw = formData.get(`series[${i}][executionQuality]`) as string | null

    const seriesParsed = SeriesInputSchema.safeParse({
      position: i + 1,
      isPractice: isPracticeRaw === "true",
      scoreTotal: scoreTotalRaw ?? "",
      shots: shotsRaw ?? undefined,
      executionQuality: qualityRaw ?? undefined,
    })

    if (!seriesParsed.success) {
      // Warum harter Abbruch: Teilimporte führen zu schwer nachvollziehbaren Abweichungen
      // zwischen sichtbarer Eingabe und gespeicherten Werten.
      console.warn("Session-Import abgebrochen: ungueltige Serien-Daten", {
        index: i,
        issues: seriesParsed.error.issues,
      })
      return null
    }
    seriesData.push(seriesParsed.data)
    i++
  }

  if (
    i >= MAX_SERIES_PER_SESSION &&
    (formData.has(`series[${i}][scoreTotal]`) || formData.has(`series[${i}][isPractice]`))
  ) {
    console.warn("Session-Import abgebrochen: zu viele Serien im Request", {
      maxAllowed: MAX_SERIES_PER_SESSION,
    })
    return null
  }

  return seriesData
}

// ─────────────────────────────────────────────
// Actions
// ─────────────────────────────────────────────

/**
 * Legt eine neue Einheit mit Serien an.
 * Einheit und Serien werden in einer Transaktion gespeichert —
 * entweder alles oder nichts (keine halbfertigen Einheiten in der DB).
 * Nach Erfolg: Redirect zur Detailansicht der neuen Einheit.
 */
export async function createSession(formData: FormData): Promise<ActionResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  // Basis-Daten der Einheit validieren
  const parsed = CreateSessionSchema.safeParse({
    type: formData.get("type"),
    date: formData.get("date"),
    location: formData.get("location") || undefined,
    disciplineId: formData.get("disciplineId") || undefined,
    trainingGoal: formData.get("trainingGoal") || undefined,
  })

  if (!parsed.success) {
    console.error("Validierungsfehler:", parsed.error.flatten())
    return { error: "Bitte die Pflichtfelder prüfen." }
  }

  const disciplineId = await resolveAccessibleDisciplineId(
    parsed.data.disciplineId,
    session.user.id
  )
  if (parsed.data.disciplineId && !disciplineId) {
    console.warn("createSession: ungueltige oder nicht erlaubte disciplineId", {
      userId: session.user.id,
    })
    return { error: "Die gewählte Disziplin ist nicht verfügbar." }
  }

  // Serien aus dem Formular lesen
  // Format im Formular: series[0][scoreTotal], series[0][isPractice], series[0][shots], ...
  const seriesData = parseSeriesFromFormData(formData)
  if (seriesData === null) {
    return { error: "Seriendaten sind ungültig oder überschreiten die Grenzwerte." }
  }

  const selectedGoalIds = parseGoalIdsFromFormData(formData)
  const hitLocationInput = parseHitLocationFromFormData(formData)
  if (hitLocationInput === "INVALID") {
    return { error: "Trefferlage ist ungültig." }
  }

  // Einheit und Serien in einer Transaktion anlegen.
  // Omit entfernt die nicht-transaktionalen Methoden aus dem Typ — das ist der korrekte
  // Typ für den Prisma-Transaktions-Client
  const created = await db.$transaction(
    async (
      tx: Omit<
        PrismaClient,
        "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
      >
    ) => {
      const trainingSession = await tx.trainingSession.create({
        data: {
          userId: session.user.id,
          type: parsed.data.type,
          // Datum aus dem Formular (ISO-String) in ein Date-Objekt umwandeln
          date: new Date(parsed.data.date),
          location: parsed.data.location,
          disciplineId,
          trainingGoal: parsed.data.trainingGoal || null,
          hitLocationHorizontalMm: hitLocationInput?.horizontalMm ?? null,
          hitLocationHorizontalDirection: hitLocationInput?.horizontalDirection ?? null,
          hitLocationVerticalMm: hitLocationInput?.verticalMm ?? null,
          hitLocationVerticalDirection: hitLocationInput?.verticalDirection ?? null,
        },
      })

      if (seriesData.length > 0) {
        await tx.series.createMany({
          data: seriesData.map((s) => ({
            sessionId: trainingSession.id,
            position: s.position,
            isPractice: s.isPractice,
            scoreTotal: s.scoreTotal ? s.scoreTotal : null,
            // shots als JSON-Wert speichern (Prisma Json-Feld akzeptiert Arrays direkt)
            shots: s.shots ?? undefined,
            executionQuality: s.executionQuality ?? null,
          })),
        })
      }

      if (selectedGoalIds.length > 0) {
        const validGoals = await tx.goal.findMany({
          where: {
            id: { in: selectedGoalIds },
            userId: session.user.id,
          },
          select: { id: true },
        })

        if (validGoals.length > 0) {
          await tx.sessionGoal.createMany({
            data: validGoals.map((goal) => ({
              sessionId: trainingSession.id,
              goalId: goal.id,
            })),
            skipDuplicates: true,
          })
        }
      }

      return trainingSession
    }
  )

  revalidatePath("/sessions")
  revalidatePath("/goals")
  // Nach Erstellung direkt zur Detailansicht — dort können Uploads hinzugefügt werden
  redirect(`/sessions/${created.id}`)
}

/**
 * Liest ein Meyton-PDF (URL oder Upload), extrahiert Serien + Schuesse
 * und liefert eine Vorschau fuer die Serien in der Einheit.
 */
export async function previewMeytonImport(formData: FormData): Promise<MeytonImportPreviewResult> {
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

/**
 * Gibt eine einzelne Einheit mit allen verknüpften Daten zurück.
 * Stellt sicher dass nur der Eigentümer die Einheit sehen kann.
 *
 * Decimal-Felder (Series.scoreTotal, Prognosis.expectedScore) werden zu plain types
 * serialisiert, damit das Ergebnis über die Server→Client-Grenze übergeben werden kann.
 */
export async function getSessionById(id: string): Promise<SessionDetail | null> {
  const session = await getAuthSession()
  if (!session) return null

  const result = await db.trainingSession.findFirst({
    where: {
      id,
      // Sicherheit: Nur eigene Einheiten zurückgeben
      userId: session.user.id,
    },
    include: {
      discipline: true,
      series: {
        orderBy: { position: "asc" },
      },
      attachments: {
        orderBy: { createdAt: "asc" },
      },
      // Mentaltraining-Daten (Phase 3)
      wellbeing: true,
      reflection: true,
      prognosis: true,
      feedback: true,
      goals: {
        include: {
          goal: {
            select: {
              id: true,
              title: true,
              type: true,
            },
          },
        },
      },
    },
  })

  if (!result) return null

  // Decimal-Objekte serialisieren: Prisma gibt scoreTotal und expectedScore als Decimal zurück.
  // Diese können nicht über die Server→Client-Grenze (Next.js serialisiert nur plain objects).
  return {
    ...result,
    series: result.series.map((serie) => ({
      ...serie,
      scoreTotal: serie.scoreTotal !== null ? parseFloat(String(serie.scoreTotal)) : null,
    })),
    prognosis: result.prognosis
      ? {
          ...result.prognosis,
          expectedScore:
            result.prognosis.expectedScore !== null ? String(result.prognosis.expectedScore) : null,
        }
      : null,
  }
}

/**
 * Gibt alle Einheiten des eingeloggten Nutzers zurück, neueste zuerst.
 * Enthält die verknüpfte Disziplin und die Serien für die Gesamtberechnung.
 */
export async function getSessions(): Promise<SessionWithDiscipline[]> {
  const session = await getAuthSession()
  if (!session) return []

  return db.trainingSession.findMany({
    where: {
      // Sicherheit: Nur eigene Einheiten zurückgeben
      userId: session.user.id,
    },
    include: {
      discipline: true,
      series: {
        select: {
          scoreTotal: true,
          isPractice: true,
          shots: true,
        },
      },
      // Minimale Selects — nur id für Tagebuch-Indikatoren (Vorhandensein der mentalen Felder)
      wellbeing: { select: { id: true } },
      reflection: { select: { id: true } },
      prognosis: { select: { id: true } },
      feedback: { select: { id: true } },
    },
    orderBy: { date: "desc" },
  })
}

/**
 * Lädt einen Anhang hoch und verknüpft ihn mit einer Einheit.
 * Prüft, dass die Einheit dem angemeldeten Nutzer gehört.
 */
export async function uploadAttachment(
  sessionId: string,
  formData: FormData
): Promise<ActionResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  // Sicherstellen dass die Session dem Nutzer gehört
  const trainingSession = await db.trainingSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
  })
  if (!trainingSession) return { error: "Einheit nicht gefunden" }
  if (!isScoringSessionType(trainingSession.type)) {
    // Warum serverseitig: UI-Regeln sind kein Schutz gegen manipulierte Requests.
    return { error: "Anhänge sind nur bei Training und Wettkampf verfügbar." }
  }

  const file = formData.get("file")
  if (!file || !(file instanceof File)) return { error: "Keine Datei ausgewählt" }
  if (file.size === 0) return { error: "Die Datei ist leer" }

  try {
    const { filePath, fileType, originalName } = await saveUpload(file)

    await db.attachment.create({
      data: {
        sessionId,
        // Attachment hat kein userId-Feld — Eigentümerschaft über die verknüpfte Session
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
 * Löscht einen Anhang — Datei vom Disk und Eintrag aus der DB.
 * Prüft Eigentümerschaft vor der Löschung.
 */
export async function deleteAttachment(attachmentId: string): Promise<ActionResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  const attachment = await db.attachment.findFirst({
    where: {
      id: attachmentId,
      // Sicherheit: Eigentümerschaft über verknüpfte Session prüfen (kein direktes userId auf Attachment)
      session: { userId: session.user.id },
    },
  })
  if (!attachment) return { error: "Anhang nicht gefunden" }

  try {
    // Datei vom Disk löschen
    const { unlink } = await import("fs/promises")
    const uploadDir = process.env.UPLOAD_DIR ?? "/app/uploads"
    await unlink(`${uploadDir}/${attachment.filePath}`)
  } catch (err) {
    // Datei fehlt auf Disk — trotzdem DB-Eintrag löschen um konsistenten Zustand herzustellen
    console.warn("Datei konnte nicht gelöscht werden (evtl. nicht vorhanden):", err)
  }

  await db.attachment.delete({ where: { id: attachmentId } })
  revalidatePath(`/sessions/${attachment.sessionId}`)
  return { success: true }
}

/**
 * Aktualisiert eine bestehende Einheit inkl. Serien.
 * Alle alten Serien werden gelöscht und durch die neuen ersetzt (einfacher als Diff).
 * Nach Erfolg: Redirect zur Detailansicht.
 */
export async function updateSession(id: string, formData: FormData): Promise<ActionResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  // Sicherstellen dass die Einheit dem Nutzer gehört
  const existing = await db.trainingSession.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!existing) return { error: "Einheit nicht gefunden" }

  const parsed = CreateSessionSchema.safeParse({
    type: formData.get("type"),
    date: formData.get("date"),
    location: formData.get("location") || undefined,
    disciplineId: formData.get("disciplineId") || undefined,
    trainingGoal: formData.get("trainingGoal") || undefined,
  })

  if (!parsed.success) {
    console.error("Validierungsfehler beim Update:", parsed.error.flatten())
    return { error: "Bitte die Pflichtfelder prüfen." }
  }

  const disciplineId = await resolveAccessibleDisciplineId(
    parsed.data.disciplineId,
    session.user.id
  )
  if (parsed.data.disciplineId && !disciplineId) {
    console.warn("updateSession: ungueltige oder nicht erlaubte disciplineId", {
      userId: session.user.id,
      sessionId: id,
    })
    return { error: "Die gewählte Disziplin ist nicht verfügbar." }
  }

  // Serien aus dem Formular lesen (gleiche Logik wie createSession)
  const seriesData = parseSeriesFromFormData(formData)
  if (seriesData === null) {
    return { error: "Seriendaten sind ungültig oder überschreiten die Grenzwerte." }
  }

  const selectedGoalIds = parseGoalIdsFromFormData(formData)
  const hitLocationInput = parseHitLocationFromFormData(formData)
  if (hitLocationInput === "INVALID") {
    return { error: "Trefferlage ist ungültig." }
  }

  // Einheit und Serien atomar aktualisieren: alte Serien löschen, neue anlegen
  await db.$transaction(
    async (
      tx: Omit<
        PrismaClient,
        "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
      >
    ) => {
      await tx.trainingSession.update({
        where: { id },
        data: {
          type: parsed.data.type,
          date: new Date(parsed.data.date),
          location: parsed.data.location ?? null,
          disciplineId,
          trainingGoal: parsed.data.trainingGoal || null,
          hitLocationHorizontalMm: hitLocationInput?.horizontalMm ?? null,
          hitLocationHorizontalDirection: hitLocationInput?.horizontalDirection ?? null,
          hitLocationVerticalMm: hitLocationInput?.verticalMm ?? null,
          hitLocationVerticalDirection: hitLocationInput?.verticalDirection ?? null,
        },
      })

      // Alle alten Serien löschen und durch neue ersetzen
      await tx.series.deleteMany({ where: { sessionId: id } })

      if (seriesData.length > 0) {
        await tx.series.createMany({
          data: seriesData.map((s) => ({
            sessionId: id,
            position: s.position,
            isPractice: s.isPractice,
            scoreTotal: s.scoreTotal ? s.scoreTotal : null,
            shots: s.shots ?? undefined,
            executionQuality: s.executionQuality ?? null,
          })),
        })
      }

      await tx.sessionGoal.deleteMany({ where: { sessionId: id } })

      if (selectedGoalIds.length > 0) {
        const validGoals = await tx.goal.findMany({
          where: {
            id: { in: selectedGoalIds },
            userId: session.user.id,
          },
          select: { id: true },
        })

        if (validGoals.length > 0) {
          await tx.sessionGoal.createMany({
            data: validGoals.map((goal) => ({
              sessionId: id,
              goalId: goal.id,
            })),
            skipDuplicates: true,
          })
        }
      }
    }
  )

  revalidatePath("/sessions")
  revalidatePath(`/sessions/${id}`)
  revalidatePath("/goals")
  redirect(`/sessions/${id}`)
}

/**
 * Setzt isFavourite einer Einheit auf den gegenteiligen Wert.
 * Nur der Eigentümer kann den Favorit-Status seiner eigenen Einheiten ändern.
 */
export async function toggleFavourite(sessionId: string): Promise<void> {
  const session = await getAuthSession()
  if (!session) return

  const existing = await db.trainingSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
    select: { isFavourite: true },
  })
  if (!existing) return

  await db.trainingSession.update({
    where: { id: sessionId },
    data: { isFavourite: !existing.isFavourite },
  })

  revalidatePath("/sessions")
  revalidatePath(`/sessions/${sessionId}`)
}

/**
 * Löscht eine Einheit inkl. aller verknüpften Dateien auf Disk.
 * Cascade-Delete in der DB entfernt Series, Wellbeing, Reflection etc. automatisch.
 */
export async function deleteSession(id: string): Promise<ActionResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  // Sicherstellen dass die Einheit dem Nutzer gehört
  const existing = await db.trainingSession.findFirst({
    where: { id, userId: session.user.id },
    include: { attachments: true },
  })
  if (!existing) return { error: "Einheit nicht gefunden" }

  // Anhang-Dateien vom Disk löschen bevor DB-Eintrag entfernt wird
  const { unlink } = await import("fs/promises")
  const uploadDir = process.env.UPLOAD_DIR ?? "/app/uploads"
  for (const attachment of existing.attachments) {
    try {
      await unlink(`${uploadDir}/${attachment.filePath}`)
    } catch {
      // Datei fehlt auf Disk — kein Fehler, DB-Eintrag wird trotzdem gelöscht
    }
  }

  // Cascade-Delete: löscht Series, Wellbeing, Reflection, Prognosis, Feedback, Attachments, SessionGoals
  await db.trainingSession.delete({ where: { id } })

  revalidatePath("/sessions")
  return { success: true }
}

/**
 * Speichert oder aktualisiert das Befinden vor einer Einheit (Upsert).
 * Werte 0–100 für Schlaf, Energie, Stress und Motivation.
 */
export async function saveWellbeing(
  sessionId: string,
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  const trainingSession = await db.trainingSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
  })
  if (!trainingSession) return { error: "Einheit nicht gefunden" }

  const WellbeingSchema = z.object({
    sleep: z.number({ message: "Ungültiger Wert" }).int().min(0).max(100),
    energy: z.number({ message: "Ungültiger Wert" }).int().min(0).max(100),
    stress: z.number({ message: "Ungültiger Wert" }).int().min(0).max(100),
    motivation: z.number({ message: "Ungültiger Wert" }).int().min(0).max(100),
  })

  const parsed = WellbeingSchema.safeParse({
    sleep: Number(formData.get("sleep")),
    energy: Number(formData.get("energy")),
    stress: Number(formData.get("stress")),
    motivation: Number(formData.get("motivation")),
  })

  if (!parsed.success) return { error: "Ungültige Werte" }

  await db.wellbeing.upsert({
    where: { sessionId },
    create: { sessionId, ...parsed.data },
    update: parsed.data,
  })

  revalidatePath(`/sessions/${sessionId}`)
  return { success: true }
}

/**
 * Speichert oder aktualisiert die Reflexion nach einer Einheit (Upsert).
 */
export async function saveReflection(
  sessionId: string,
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  const trainingSession = await db.trainingSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
  })
  if (!trainingSession) return { error: "Einheit nicht gefunden" }

  const routineFollowed = formData.get("routineFollowed") === "on"

  const data = {
    observations: (formData.get("observations") as string) || null,
    insight: (formData.get("insight") as string) || null,
    learningQuestion: (formData.get("learningQuestion") as string) || null,
    routineFollowed,
    // Abweichung nur speichern wenn Ablauf nicht eingehalten wurde
    routineDeviation: routineFollowed ? null : (formData.get("routineDeviation") as string) || null,
  }

  await db.reflection.upsert({
    where: { sessionId },
    create: { sessionId, ...data },
    update: data,
  })

  revalidatePath(`/sessions/${sessionId}`)
  return { success: true }
}

/**
 * Speichert oder aktualisiert die Prognose vor einer Einheit (Upsert).
 * Die 7 Dimensionen werden als Werte 0–100 erfasst.
 */
export async function savePrognosis(
  sessionId: string,
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  const trainingSession = await db.trainingSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
  })
  if (!trainingSession) return { error: "Einheit nicht gefunden" }
  if (!isScoringSessionType(trainingSession.type)) {
    return { error: "Prognose ist nur bei Training und Wettkampf verfügbar." }
  }

  const DimensionSchema = z.number({ message: "Ungültiger Wert" }).int().min(0).max(100)
  const PrognosisSchema = z.object({
    fitness: DimensionSchema,
    nutrition: DimensionSchema,
    technique: DimensionSchema,
    tactics: DimensionSchema,
    mentalStrength: DimensionSchema,
    environment: DimensionSchema,
    equipment: DimensionSchema,
    expectedScore: z
      .string()
      .optional()
      .transform((v) => (v && v !== "" ? v : null)),
    expectedCleanShots: z
      .string()
      .optional()
      .transform((v) => {
        if (!v || v === "") return null
        const n = parseInt(v, 10)
        return isNaN(n) ? null : n
      }),
    performanceGoal: z
      .string()
      .optional()
      .transform((v) => v || null),
  })

  const parsed = PrognosisSchema.safeParse({
    fitness: Number(formData.get("fitness")),
    nutrition: Number(formData.get("nutrition")),
    technique: Number(formData.get("technique")),
    tactics: Number(formData.get("tactics")),
    mentalStrength: Number(formData.get("mentalStrength")),
    environment: Number(formData.get("environment")),
    equipment: Number(formData.get("equipment")),
    expectedScore: formData.get("expectedScore") as string,
    expectedCleanShots: formData.get("expectedCleanShots") as string,
    performanceGoal: formData.get("performanceGoal") as string,
  })

  if (!parsed.success) return { error: "Ungültige Werte" }

  await db.prognosis.upsert({
    where: { sessionId },
    create: { sessionId, ...parsed.data },
    update: parsed.data,
  })

  revalidatePath(`/sessions/${sessionId}`)
  return { success: true }
}

/**
 * Speichert oder aktualisiert das Feedback nach einer Einheit (Upsert).
 */
export async function saveFeedback(
  sessionId: string,
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet" }

  const trainingSession = await db.trainingSession.findFirst({
    where: { id: sessionId, userId: session.user.id },
  })
  if (!trainingSession) return { error: "Einheit nicht gefunden" }
  if (!isScoringSessionType(trainingSession.type)) {
    return { error: "Feedback ist nur bei Training und Wettkampf verfügbar." }
  }

  const DimensionSchema = z.number({ message: "Ungültiger Wert" }).int().min(0).max(100)
  const FeedbackSchema = z.object({
    fitness: DimensionSchema,
    nutrition: DimensionSchema,
    technique: DimensionSchema,
    tactics: DimensionSchema,
    mentalStrength: DimensionSchema,
    environment: DimensionSchema,
    equipment: DimensionSchema,
    explanation: z
      .string()
      .optional()
      .transform((v) => v || null),
    goalAchieved: z.boolean(),
    goalAchievedNote: z
      .string()
      .optional()
      .transform((v) => v || null),
    progress: z
      .string()
      .optional()
      .transform((v) => v || null),
    fiveBestShots: z
      .string()
      .optional()
      .transform((v) => v || null),
    wentWell: z
      .string()
      .optional()
      .transform((v) => v || null),
    insights: z
      .string()
      .optional()
      .transform((v) => v || null),
  })

  const parsed = FeedbackSchema.safeParse({
    fitness: Number(formData.get("fitness")),
    nutrition: Number(formData.get("nutrition")),
    technique: Number(formData.get("technique")),
    tactics: Number(formData.get("tactics")),
    mentalStrength: Number(formData.get("mentalStrength")),
    environment: Number(formData.get("environment")),
    equipment: Number(formData.get("equipment")),
    explanation: formData.get("explanation") as string,
    goalAchieved: formData.get("goalAchieved") === "on",
    // goalAchievedNote ist nur im DOM wenn goalAchieved gesetzt — null → undefined damit z.string().optional() passt
    goalAchievedNote: formData.get("goalAchievedNote") ?? undefined,
    progress: formData.get("progress") as string,
    fiveBestShots: formData.get("fiveBestShots") as string,
    wentWell: formData.get("wentWell") as string,
    insights: formData.get("insights") as string,
  })

  if (!parsed.success) return { error: "Ungültige Werte" }

  await db.feedback.upsert({
    where: { sessionId },
    create: { sessionId, ...parsed.data },
    update: parsed.data,
  })

  revalidatePath(`/sessions/${sessionId}`)
  return { success: true }
}
