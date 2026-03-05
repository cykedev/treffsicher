import { describe, expect, it } from "vitest"
import { MARGIN_BOTTOM } from "@/lib/exports/simple-pdf/constants"
import { renderHeader } from "@/lib/exports/simple-pdf/headerRenderer"
import { createInitialLayoutContext } from "@/lib/exports/simple-pdf/layoutContext"
import type { StyledPdfDocument } from "@/lib/exports/simple-pdf/types"

describe("renderHeader", () => {
  it("rendert Titel, Untertitel und Metadaten in die aktuelle Seite", () => {
    const context = createInitialLayoutContext()
    const document: StyledPdfDocument = {
      title: "Treffsicher Export",
      subtitle: "05.03.2026",
      metaLines: ["Name: Test", "Typ: Training"],
      sections: [],
    }
    const startY = context.y

    renderHeader(context, document)

    expect(context.pageIndex).toBe(0)
    expect(context.y).toBeLessThan(startY)
    const pageContent = context.pages[0].join("\n")
    expect(pageContent).toContain("(Treffsicher Export)")
    expect(pageContent).toContain("(05.03.2026)")
    expect(pageContent).toContain("(Name)")
    expect(pageContent).toContain("(Test)")
  })

  it("wechselt auf neue Seite wenn der verbleibende Platz nicht reicht", () => {
    const context = createInitialLayoutContext()
    context.y = MARGIN_BOTTOM + 2
    const document: StyledPdfDocument = {
      title: "Sehr langer Titel fuer Headerkarte",
      subtitle: "Untertitel",
      metaLines: ["A: 1", "B: 2", "C: 3"],
      sections: [],
    }

    renderHeader(context, document)

    expect(context.pages.length).toBe(2)
    expect(context.pageIndex).toBe(1)
    expect(context.pages[1].join("\n")).toContain("(Sehr langer Titel fuer Headerkarte)")
  })
})
