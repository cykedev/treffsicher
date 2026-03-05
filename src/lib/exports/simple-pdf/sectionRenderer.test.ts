import { describe, expect, it } from "vitest"
import { MARGIN_BOTTOM } from "@/lib/exports/simple-pdf/constants"
import { createInitialLayoutContext } from "@/lib/exports/simple-pdf/layoutContext"
import { renderSection } from "@/lib/exports/simple-pdf/sectionRenderer"
import type { PdfSection } from "@/lib/exports/simple-pdf/types"

describe("renderSection", () => {
  it("rendert Abschnittstitel, Zeilen und Charts in eine Kartenstruktur", () => {
    const context = createInitialLayoutContext()
    const section: PdfSection = {
      title: "Ergebnis",
      icon: "ER",
      lines: ["Gesamt: 337", "Serie 1: 81"],
      charts: [
        {
          type: "bars",
          title: "Ausfuehrung",
          maxValue: 5,
          items: [{ label: "Serie 1", value: 4, displayValue: "4/5" }],
        },
      ],
    }
    const startY = context.y

    renderSection(context, section)

    expect(context.y).toBeLessThan(startY)
    const pageContent = context.pages[0].join("\n")
    expect(pageContent).toContain("(Ergebnis)")
    expect(pageContent).toContain("(Gesamt)")
    expect(pageContent).toContain("(337)")
    expect(pageContent).toContain("(Ausfuehrung)")
  })

  it("wechselt Seite wenn fuer die Kartenhoehe kein Platz bleibt", () => {
    const context = createInitialLayoutContext()
    context.y = MARGIN_BOTTOM + 1
    const section: PdfSection = {
      title: "Abschnitt mit Umbruch",
      lines: ["A: 1", "B: 2", "C: 3", "D: 4", "E: 5"],
    }

    renderSection(context, section)

    expect(context.pages.length).toBe(2)
    expect(context.pageIndex).toBe(1)
    expect(context.pages[1].join("\n")).toContain("(Abschnitt mit Umbruch)")
  })

  it("ignoriert nicht zeichnbare Charts fuer die Ausgabe", () => {
    const context = createInitialLayoutContext()
    const section: PdfSection = {
      title: "Nur Text",
      lines: ["Notiz"],
      charts: [
        {
          type: "bars",
          title: "leer",
          items: [{ label: "X", value: Number.NaN }],
        },
      ],
    }

    renderSection(context, section)

    const pageContent = context.pages[0].join("\n")
    expect(pageContent).not.toContain("(leer)")
    expect(pageContent).toContain("(Notiz)")
  })
})
