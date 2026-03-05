import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const {
  getAuthSessionMock,
  findFirstMock,
  assertPublicImportTargetMock,
  validatePdfBufferMock,
  normalizeMeytonPdfUrlInputMock,
  extractMeytonDateTimeMock,
  extractMeytonHitLocationMock,
  extractTextFromPdfBufferMock,
  parseMeytonSeriesFromTextMock,
} = vi.hoisted(() => ({
  getAuthSessionMock: vi.fn(),
  findFirstMock: vi.fn(),
  assertPublicImportTargetMock: vi.fn(),
  validatePdfBufferMock: vi.fn(),
  normalizeMeytonPdfUrlInputMock: vi.fn(),
  extractMeytonDateTimeMock: vi.fn(),
  extractMeytonHitLocationMock: vi.fn(),
  extractTextFromPdfBufferMock: vi.fn(),
  parseMeytonSeriesFromTextMock: vi.fn(),
}))

vi.mock("@/lib/auth-helpers", () => ({
  getAuthSession: getAuthSessionMock,
}))

vi.mock("@/lib/db", () => ({
  db: {
    discipline: {
      findFirst: findFirstMock,
    },
  },
}))

vi.mock("@/lib/sessions/importGuards", () => ({
  assertPublicImportTarget: assertPublicImportTargetMock,
  validatePdfBuffer: validatePdfBufferMock,
}))

vi.mock("@/lib/sessions/importUrl", () => ({
  normalizeMeytonPdfUrlInput: normalizeMeytonPdfUrlInputMock,
}))

vi.mock("@/lib/sessions/meytonImport", () => ({
  extractMeytonDateTime: extractMeytonDateTimeMock,
  extractMeytonHitLocation: extractMeytonHitLocationMock,
  extractTextFromPdfBuffer: extractTextFromPdfBufferMock,
  parseMeytonSeriesFromText: parseMeytonSeriesFromTextMock,
}))

import { previewMeytonImportAction } from "@/lib/sessions/actions/meytonActions"

function buildBaseFormData(source: "URL" | "UPLOAD", disciplineId = "disc-1"): FormData {
  const formData = new FormData()
  formData.set("disciplineId", disciplineId)
  formData.set("source", source)
  return formData
}

describe("previewMeytonImportAction", () => {
  beforeEach(() => {
    getAuthSessionMock.mockReset()
    findFirstMock.mockReset()
    assertPublicImportTargetMock.mockReset()
    validatePdfBufferMock.mockReset()
    normalizeMeytonPdfUrlInputMock.mockReset()
    extractMeytonDateTimeMock.mockReset()
    extractMeytonHitLocationMock.mockReset()
    extractTextFromPdfBufferMock.mockReset()
    parseMeytonSeriesFromTextMock.mockReset()
    normalizeMeytonPdfUrlInputMock.mockImplementation((v: string) => v)
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("liefert Fehler ohne Login", async () => {
    getAuthSessionMock.mockResolvedValue(null)

    const result = await previewMeytonImportAction(new FormData())

    expect(result).toEqual({ error: "Nicht angemeldet" })
  })

  it("liefert Validierungsfehler bei ungueltigen Eingaben", async () => {
    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } })

    const result = await previewMeytonImportAction(new FormData())

    expect(result).toEqual({ error: "Bitte Disziplin und Quelle korrekt auswaehlen." })
  })

  it("liefert Fehler wenn Disziplin nicht erreichbar ist", async () => {
    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } })
    findFirstMock.mockResolvedValue(null)

    const result = await previewMeytonImportAction(buildBaseFormData("URL"))

    expect(result).toEqual({ error: "Disziplin nicht gefunden oder keine Berechtigung." })
  })

  it("verlangt bei URL-Quelle eine URL", async () => {
    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } })
    findFirstMock.mockResolvedValue({ id: "disc-1", scoringType: "TENTH" })

    const result = await previewMeytonImportAction(buildBaseFormData("URL"))

    expect(result).toEqual({ error: "Bitte eine PDF-URL angeben." })
  })

  it("verlangt bei Upload-Quelle eine Datei", async () => {
    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } })
    findFirstMock.mockResolvedValue({ id: "disc-1", scoringType: "TENTH" })

    const result = await previewMeytonImportAction(buildBaseFormData("UPLOAD"))

    expect(result).toEqual({ error: "Bitte eine PDF-Datei hochladen." })
  })

  it("liefert URL-Ladefehler bei Redirect-Antwort", async () => {
    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } })
    findFirstMock.mockResolvedValue({ id: "disc-1", scoringType: "TENTH" })
    assertPublicImportTargetMock.mockResolvedValue(undefined)
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(null, {
          status: 302,
          headers: { location: "https://example.com/other.pdf" },
        })
      )
    )

    const formData = buildBaseFormData("URL")
    formData.set("pdfUrl", "https://example.com/file.pdf")
    const result = await previewMeytonImportAction(formData)

    expect(result).toEqual({ error: "Weiterleitungen sind nicht erlaubt." })
  })

  it("liefert Fehler wenn Text-Extraktion fehlschlaegt", async () => {
    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } })
    findFirstMock.mockResolvedValue({ id: "disc-1", scoringType: "TENTH" })
    assertPublicImportTargetMock.mockResolvedValue(undefined)
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(Uint8Array.from([0x25, 0x50, 0x44, 0x46]), {
          status: 200,
          headers: { "content-type": "application/pdf", "content-length": "4" },
        })
      )
    )
    extractTextFromPdfBufferMock.mockRejectedValue(new Error("parse failed"))

    const formData = buildBaseFormData("URL")
    formData.set("pdfUrl", "https://example.com/file.pdf")
    const result = await previewMeytonImportAction(formData)

    expect(result.error).toBe(
      "Die PDF konnte nicht gelesen werden (kein textbasiertes Meyton-PDF oder defekte Datei)."
    )
  })

  it("liefert Fehler wenn keine Serien gefunden werden", async () => {
    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } })
    findFirstMock.mockResolvedValue({ id: "disc-1", scoringType: "TENTH" })
    assertPublicImportTargetMock.mockResolvedValue(undefined)
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(Uint8Array.from([0x25, 0x50, 0x44, 0x46]), {
          status: 200,
          headers: { "content-type": "application/pdf", "content-length": "4" },
        })
      )
    )
    extractTextFromPdfBufferMock.mockResolvedValue("raw")
    parseMeytonSeriesFromTextMock.mockReturnValue({ serien: [] })

    const formData = buildBaseFormData("URL")
    formData.set("pdfUrl", "https://example.com/file.pdf")
    const result = await previewMeytonImportAction(formData)

    expect(result).toEqual({ error: "Keine Meyton-Serien im PDF gefunden." })
  })

  it("konvertiert Schuesse disziplinspezifisch und liefert Vorschau", async () => {
    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } })
    findFirstMock.mockResolvedValue({ id: "disc-1", scoringType: "WHOLE" })
    assertPublicImportTargetMock.mockResolvedValue(undefined)
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(Uint8Array.from([0x25, 0x50, 0x44, 0x46]), {
          status: 200,
          headers: { "content-type": "application/pdf", "content-length": "4" },
        })
      )
    )
    extractTextFromPdfBufferMock.mockResolvedValue("raw")
    parseMeytonSeriesFromTextMock.mockReturnValue({
      serien: [{ nr: 1, shots: [9.9, 10.1] }],
    })
    extractMeytonDateTimeMock.mockReturnValue("2026-03-05T19:20")
    extractMeytonHitLocationMock.mockReturnValue({
      horizontalMm: 1.1,
      horizontalDirection: "RIGHT",
      verticalMm: 0.9,
      verticalDirection: "HIGH",
    })

    const formData = buildBaseFormData("URL")
    formData.set("pdfUrl", "https://example.com/file.pdf")
    const result = await previewMeytonImportAction(formData)

    expect(result).toEqual({
      data: {
        date: "2026-03-05T19:20",
        hitLocation: {
          horizontalMm: 1.1,
          horizontalDirection: "RIGHT",
          verticalMm: 0.9,
          verticalDirection: "HIGH",
        },
        series: [{ nr: 1, scoreTotal: "19", shots: ["9", "10"] }],
      },
    })
  })

  it("liefert Fehler wenn erkannte Serien keine gueltigen Schuesse enthalten", async () => {
    getAuthSessionMock.mockResolvedValue({ user: { id: "user-1" } })
    findFirstMock.mockResolvedValue({ id: "disc-1", scoringType: "TENTH" })
    assertPublicImportTargetMock.mockResolvedValue(undefined)
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(Uint8Array.from([0x25, 0x50, 0x44, 0x46]), {
          status: 200,
          headers: { "content-type": "application/pdf", "content-length": "4" },
        })
      )
    )
    extractTextFromPdfBufferMock.mockResolvedValue("raw")
    parseMeytonSeriesFromTextMock.mockReturnValue({ serien: [{ nr: 1, shots: [] }] })

    const formData = buildBaseFormData("URL")
    formData.set("pdfUrl", "https://example.com/file.pdf")
    const result = await previewMeytonImportAction(formData)

    expect(result).toEqual({
      error: "Es wurden Serien erkannt, aber keine gueltigen Schusswerte gefunden.",
    })
  })
})
