const PAGE_WIDTH = 595
const PAGE_HEIGHT = 842
const MARGIN_X = 34
const MARGIN_TOP = 36
const MARGIN_BOTTOM = 36
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2
const CARD_GAP = 10

type Rgb = [number, number, number]

export type PdfSection = {
  title: string
  lines: string[]
}

export type StyledPdfDocument = {
  title: string
  subtitle?: string
  metaLines?: string[]
  sections: PdfSection[]
}

function sanitizeText(value: string): string {
  return (
    value
      // Steuerzeichen vermeiden (würden den PDF-Textstream brechen)
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      // Latin-1 inkl. deutscher Umlaute/ß zulassen, andere Zeichen als Platzhalter
      .replace(/[^\u0020-\u00ff]/g, "?")
  )
}

function escapePdfText(value: string): string {
  return sanitizeText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")
}

function n(value: number): string {
  return Number(value.toFixed(3)).toString()
}

function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const normalized = sanitizeText(text).replace(/\s+/g, " ").trim()
  if (!normalized) return [""]

  const maxChars = Math.max(8, Math.floor(maxWidth / (fontSize * 0.54)))
  const words = normalized.split(" ")
  const lines: string[] = []
  let current = ""

  for (const word of words) {
    if (!current) {
      current = word
      continue
    }

    const candidate = `${current} ${word}`
    if (candidate.length <= maxChars) {
      current = candidate
      continue
    }

    lines.push(current)

    if (word.length <= maxChars) {
      current = word
      continue
    }

    let rest = word
    while (rest.length > maxChars) {
      lines.push(rest.slice(0, maxChars))
      rest = rest.slice(maxChars)
    }
    current = rest
  }

  if (current) lines.push(current)
  return lines
}

function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const output = new Uint8Array(totalLength)

  let offset = 0
  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.length
  }

  return output
}

function encodeLatin1(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length)
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    bytes[i] = code <= 0xff ? code : 0x3f
  }
  return bytes
}

function textCommand(
  x: number,
  y: number,
  text: string,
  fontSize: number,
  bold: boolean,
  color: Rgb
): string {
  const fontName = bold ? "F2" : "F1"
  return `BT /${fontName} ${n(fontSize)} Tf ${n(color[0])} ${n(color[1])} ${n(color[2])} rg ${n(x)} ${n(y)} Td (${escapePdfText(text)}) Tj ET`
}

function rectFillCommand(x: number, y: number, width: number, height: number, fill: Rgb): string {
  return `${n(fill[0])} ${n(fill[1])} ${n(fill[2])} rg ${n(x)} ${n(y - height)} ${n(width)} ${n(height)} re f`
}

function rectStrokeCommand(
  x: number,
  y: number,
  width: number,
  height: number,
  stroke: Rgb,
  lineWidth: number
): string {
  return `${n(stroke[0])} ${n(stroke[1])} ${n(stroke[2])} RG ${n(lineWidth)} w ${n(x)} ${n(y - height)} ${n(width)} ${n(height)} re S`
}

function lineCommand(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  stroke: Rgb,
  lineWidth: number
): string {
  return `${n(stroke[0])} ${n(stroke[1])} ${n(stroke[2])} RG ${n(lineWidth)} w ${n(x1)} ${n(y1)} m ${n(x2)} ${n(y2)} l S`
}

export function buildStyledPdf(document: StyledPdfDocument): Uint8Array {
  const pages: string[][] = [[]]
  let pageIndex = 0
  let y = PAGE_HEIGHT - MARGIN_TOP

  const addCommand = (command: string): void => {
    pages[pageIndex].push(command)
  }

  const addPage = (): void => {
    pages.push([])
    pageIndex = pages.length - 1
    y = PAGE_HEIGHT - MARGIN_TOP
  }

  const ensureSpace = (requiredHeight: number): void => {
    if (y - requiredHeight < MARGIN_BOTTOM) {
      addPage()
    }
  }

  const drawWrappedText = (
    text: string,
    x: number,
    topY: number,
    maxWidth: number,
    fontSize: number,
    bold: boolean,
    color: Rgb,
    lineHeight: number
  ): number => {
    const wrapped = wrapText(text, maxWidth, fontSize)
    let baseline = topY
    for (const line of wrapped) {
      addCommand(textCommand(x, baseline, line, fontSize, bold, color))
      baseline -= lineHeight
    }
    return wrapped.length * lineHeight
  }

  const renderHeader = (): void => {
    const meta = document.metaLines ?? []
    const wrappedMeta = meta.flatMap((line) => wrapText(line, CONTENT_WIDTH - 24, 10))
    const headerHeight = 72 + wrappedMeta.length * 12
    ensureSpace(headerHeight + CARD_GAP)

    const headerY = y
    addCommand(rectFillCommand(MARGIN_X, headerY, CONTENT_WIDTH, headerHeight, [0.95, 0.97, 1]))
    addCommand(
      rectStrokeCommand(MARGIN_X, headerY, CONTENT_WIDTH, headerHeight, [0.83, 0.88, 0.98], 1)
    )
    addCommand(
      lineCommand(MARGIN_X, headerY, MARGIN_X + CONTENT_WIDTH, headerY, [0.23, 0.47, 0.88], 2)
    )

    let cursorY = headerY - 26
    drawWrappedText(
      document.title,
      MARGIN_X + 12,
      cursorY,
      CONTENT_WIDTH - 24,
      20,
      true,
      [0.12, 0.21, 0.4],
      22
    )
    cursorY -= 24

    if (document.subtitle) {
      const subtitleHeight = drawWrappedText(
        document.subtitle,
        MARGIN_X + 12,
        cursorY,
        CONTENT_WIDTH - 24,
        10,
        false,
        [0.27, 0.31, 0.39],
        12
      )
      cursorY -= subtitleHeight + 4
    }

    for (const line of wrappedMeta) {
      addCommand(textCommand(MARGIN_X + 12, cursorY, line, 10, false, [0.27, 0.31, 0.39]))
      cursorY -= 12
    }

    y -= headerHeight + CARD_GAP
  }

  const renderSection = (section: PdfSection): void => {
    const titleWrapped = wrapText(section.title, CONTENT_WIDTH - 24, 12)
    const contentLines = section.lines.length > 0 ? section.lines : ["-"]
    const wrappedContent = contentLines.flatMap((line) => wrapText(line, CONTENT_WIDTH - 24, 10))

    const sectionHeight = 14 + titleWrapped.length * 15 + 8 + wrappedContent.length * 12 + 12
    ensureSpace(sectionHeight + CARD_GAP)

    const sectionY = y
    addCommand(
      rectFillCommand(MARGIN_X, sectionY, CONTENT_WIDTH, sectionHeight, [0.985, 0.988, 0.995])
    )
    addCommand(
      rectStrokeCommand(MARGIN_X, sectionY, CONTENT_WIDTH, sectionHeight, [0.86, 0.89, 0.95], 0.8)
    )
    addCommand(
      lineCommand(MARGIN_X, sectionY, MARGIN_X + CONTENT_WIDTH, sectionY, [0.27, 0.44, 0.78], 1.6)
    )

    let cursorY = sectionY - 18
    for (const line of titleWrapped) {
      addCommand(textCommand(MARGIN_X + 12, cursorY, line, 12, true, [0.14, 0.24, 0.45]))
      cursorY -= 15
    }
    cursorY -= 6

    for (const line of wrappedContent) {
      addCommand(textCommand(MARGIN_X + 12, cursorY, line, 10, false, [0.17, 0.2, 0.26]))
      cursorY -= 12
    }

    y -= sectionHeight + CARD_GAP
  }

  renderHeader()
  for (const section of document.sections) {
    renderSection(section)
  }

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
