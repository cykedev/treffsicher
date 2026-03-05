import { describe, expect, it } from "vitest"
import { buildStyledPdf } from "@/lib/exports/simplePdf"

describe("buildStyledPdf", () => {
  it("baut aus Dokumentdaten ein gueltiges PDF-Bytearray", () => {
    const pdf = buildStyledPdf({
      title: "Treffsicher - Export",
      subtitle: "05.03.2026",
      sections: [
        {
          title: "Ergebnis",
          lines: ["Gesamt: 337"],
        },
      ],
    })
    const content = Buffer.from(pdf).toString("latin1")

    expect(pdf).toBeInstanceOf(Uint8Array)
    expect(pdf.length).toBeGreaterThan(500)
    expect(content.startsWith("%PDF-1.4\n")).toBe(true)
    expect(content).toContain("(Treffsicher - Export)")
    expect(content).toContain("(Ergebnis)")
    expect(content).toContain("(Seite 1/1)")
    expect(content).toContain("%%EOF")
  })
})
