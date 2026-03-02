import { describe, expect, it } from "vitest"
import { normalizeMeytonPdfUrlInput } from "./importUrl"

describe("normalizeMeytonPdfUrlInput", () => {
  it("laesst URLs mit http/https unveraendert", () => {
    expect(normalizeMeytonPdfUrlInput("https://example.com/report.pdf")).toBe(
      "https://example.com/report.pdf"
    )
    expect(normalizeMeytonPdfUrlInput("http://example.com/report.pdf")).toBe(
      "http://example.com/report.pdf"
    )
  })

  it("ergaenzt http:// bei schema-losen URLs", () => {
    expect(normalizeMeytonPdfUrlInput("example.com/report.pdf")).toBe(
      "http://example.com/report.pdf"
    )
    expect(normalizeMeytonPdfUrlInput("example.com:8080/report.pdf")).toBe(
      "http://example.com:8080/report.pdf"
    )
  })

  it("ergaenzt http: bei schema-relativen URLs", () => {
    expect(normalizeMeytonPdfUrlInput("//example.com/report.pdf")).toBe(
      "http://example.com/report.pdf"
    )
  })

  it("trimmt Eingaben", () => {
    expect(normalizeMeytonPdfUrlInput("  example.com/report.pdf  ")).toBe(
      "http://example.com/report.pdf"
    )
  })

  it("normalisiert mailto-Angaben nicht auf http", () => {
    expect(normalizeMeytonPdfUrlInput("mailto:test@example.com")).toBe("mailto:test@example.com")
  })
})
