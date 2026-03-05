import { deflateSync } from "node:zlib"
import { describe, expect, it } from "vitest"
import { extractTextFromPdfBuffer } from "@/lib/sessions/meyton-import/pdfText"

function buildPdfWithSingleFlateStream(content: string): Buffer {
  const compressed = deflateSync(Buffer.from(content, "latin1"))
  const header = Buffer.from(
    `%PDF-1.4
1 0 obj
<< /Filter /FlateDecode /Length ${compressed.length} >>
stream
`,
    "latin1"
  )
  const footer = Buffer.from(
    `
endstream
endobj
%%EOF`,
    "latin1"
  )
  return Buffer.concat([header, compressed, footer])
}

describe("extractTextFromPdfBuffer", () => {
  it("extrahiert TJ-Array-Strings inkl. escaped Zeichen", async () => {
    const pdf = buildPdfWithSingleFlateStream("BT [(Serie\\0401:) 120 (9.8) 0 (10.1)] TJ ET")

    const text = await extractTextFromPdfBuffer(pdf)

    expect(text).toContain("Serie 1:")
    expect(text).toContain("9.8")
    expect(text).toContain("10.1")
  })

  it("dekodiert escaped Literal-Strings aus Tj", async () => {
    const pdf = buildPdfWithSingleFlateStream("BT (A\\nB \\(C\\) \\\\ D) Tj ET")

    const text = await extractTextFromPdfBuffer(pdf)

    expect(text).toContain("A\nB (C) \\ D")
  })

  it("ignoriert nicht lesbare Streams ohne Fehler", async () => {
    const brokenPdf = Buffer.from(
      `%PDF-1.4
1 0 obj
<< /Filter /FlateDecode /Length 4 >>
stream
xxxx
endstream
endobj
%%EOF`,
      "latin1"
    )

    await expect(extractTextFromPdfBuffer(brokenPdf)).resolves.toBe("")
  })
})
