import { describe, expect, it } from "vitest"
import { serializePdfPages } from "@/lib/exports/simple-pdf/pdfSerializer"

function toLatin1(pdf: Uint8Array): string {
  return Buffer.from(pdf).toString("latin1")
}

describe("serializePdfPages", () => {
  it("serialisiert eine Seite mit korrekter Objektstruktur", () => {
    const pdf = serializePdfPages([["BT (Hello) Tj ET"]])
    const serialized = toLatin1(pdf)

    expect(serialized.startsWith("%PDF-1.4\n")).toBe(true)
    expect(serialized).toContain("2 0 obj\n<< /Type /Pages /Kids [5 0 R] /Count 1 >>")
    expect(serialized).toContain("6 0 obj\n<< /Length 17 >>")
    expect(serialized).toContain("stream\nBT (Hello) Tj ET\nendstream")
    expect(serialized).toContain("xref\n0 7\n")
    expect(serialized).toContain("trailer\n<< /Size 7 /Root 1 0 R >>")
  })

  it("erstellt bei mehreren Seiten eigene Page- und Content-Objekte", () => {
    const pdf = serializePdfPages([["cmd-page-1"], ["cmd-page-2"]])
    const serialized = toLatin1(pdf)

    expect(serialized).toContain("2 0 obj\n<< /Type /Pages /Kids [5 0 R 7 0 R] /Count 2 >>")
    expect(serialized).toContain("5 0 obj\n<< /Type /Page")
    expect(serialized).toContain("7 0 obj\n<< /Type /Page")
    expect(serialized).toContain("6 0 obj\n<< /Length 11 >>")
    expect(serialized).toContain("8 0 obj\n<< /Length 11 >>")
    expect(serialized).toContain("xref\n0 9\n")
    expect(serialized).toContain("trailer\n<< /Size 9 /Root 1 0 R >>")
  })

  it("kann auch leere Seitenlisten serialisieren", () => {
    const pdf = serializePdfPages([])
    const serialized = toLatin1(pdf)

    expect(serialized).toContain("2 0 obj\n<< /Type /Pages /Kids [] /Count 0 >>")
    expect(serialized).toContain("xref\n0 5\n")
    expect(serialized).toContain("trailer\n<< /Size 5 /Root 1 0 R >>")
    expect(serialized.endsWith("%%EOF")).toBe(true)
  })
})
