import { describe, expect, it } from "vitest"
import { renderDocumentPages } from "@/lib/exports/simple-pdf/documentPages"
import type { StyledPdfDocument } from "@/lib/exports/simple-pdf/types"

describe("renderDocumentPages", () => {
  it("rendert Header, Sections und Footer auf einer Seite", () => {
    const document: StyledPdfDocument = {
      title: "Treffsicher - Einheitenexport",
      subtitle: "05.03.2026, 18:30",
      metaLines: ["Name: Test", "Typ: Training"],
      sections: [
        {
          title: "Ergebnis",
          icon: "ER",
          lines: ["Gesamt: 337", "Serie 1: 81"],
        },
      ],
    }

    const pages = renderDocumentPages(document)
    const page = pages[0].join("\n")

    expect(pages).toHaveLength(1)
    expect(page).toContain("(Treffsicher - Einheitenexport)")
    expect(page).toContain("(Ergebnis)")
    expect(page).toContain("(Treffsicher)")
    expect(page).toContain("(Seite 1/1)")
  })

  it("nummeriert Footer korrekt ueber mehrere Seiten", () => {
    const sections = Array.from({ length: 24 }, (_, index) => ({
      title: `Abschnitt ${index + 1}`,
      lines: Array.from({ length: 8 }, (_, line) => `Wert ${line + 1}: ${index + line}`),
    }))
    const document: StyledPdfDocument = {
      title: "Mehrseitiger Export",
      sections,
    }

    const pages = renderDocumentPages(document)

    expect(pages.length).toBeGreaterThan(1)
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i].join("\n")
      expect(page).toContain("(Treffsicher)")
      expect(page).toContain(`(Seite ${i + 1}/${pages.length})`)
    }
  })
})
