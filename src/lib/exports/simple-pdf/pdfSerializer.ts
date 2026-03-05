import { concatBytes, encodeLatin1 } from "@/lib/exports/pdfPrimitives"
import { PAGE_HEIGHT, PAGE_WIDTH } from "@/lib/exports/simple-pdf/constants"

export function serializePdfPages(pages: string[][]): Uint8Array {
  const maxObjectId = 4 + pages.length * 2
  const objects = new Map<number, string>()

  pages.forEach((commands, index) => {
    const pageObjectId = 5 + index * 2
    const contentObjectId = pageObjectId + 1
    const content = commands.join("\n")
    const streamData = `${content}\n`
    const streamLength = encodeLatin1(streamData).length

    objects.set(contentObjectId, `<< /Length ${streamLength} >>\nstream\n${streamData}endstream`)
    objects.set(
      pageObjectId,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjectId} 0 R >>`
    )
  })

  const pageKids = pages.map((_, index) => `${5 + index * 2} 0 R`).join(" ")

  objects.set(1, "<< /Type /Catalog /Pages 2 0 R >>")
  objects.set(2, `<< /Type /Pages /Kids [${pageKids}] /Count ${pages.length} >>`)
  objects.set(
    3,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"
  )
  objects.set(
    4,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
  )

  const chunks: Uint8Array[] = []
  const offsets: number[] = new Array(maxObjectId + 1).fill(0)
  let offset = 0

  const push = (value: string): void => {
    const bytes = encodeLatin1(value)
    chunks.push(bytes)
    offset += bytes.length
  }

  push("%PDF-1.4\n")

  // Offsets werden waehrend des Schreibens gesammelt, weil xref exakte
  // Byte-Positionen jedes Objekts benoetigt.
  for (let objectId = 1; objectId <= maxObjectId; objectId++) {
    offsets[objectId] = offset
    push(`${objectId} 0 obj\n${objects.get(objectId) ?? ""}\nendobj\n`)
  }

  const xrefOffset = offset
  push(`xref\n0 ${maxObjectId + 1}\n`)
  push("0000000000 65535 f \n")

  for (let objectId = 1; objectId <= maxObjectId; objectId++) {
    push(`${String(offsets[objectId]).padStart(10, "0")} 00000 n \n`)
  }

  push(`trailer\n<< /Size ${maxObjectId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`)

  return concatBytes(chunks)
}
