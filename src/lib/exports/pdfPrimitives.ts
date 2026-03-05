export type Rgb = [number, number, number]

export function sanitizeText(value: string): string {
  return (
    value
      // Steuerzeichen vermeiden (würden den PDF-Textstream brechen)
      .replace(/[\u0000-\u001f\u007f]/g, " ")
      // Typografiezeichen auf ASCII/Latin-1 mappen, damit die Darstellung stabil bleibt
      .replace(/[\u2013\u2014]/g, "-")
      .replace(/\u2026/g, "...")
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201c\u201d]/g, '"')
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

export function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
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

export function concatBytes(chunks: Uint8Array[]): Uint8Array {
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const output = new Uint8Array(totalLength)

  let offset = 0
  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.length
  }

  return output
}

export function encodeLatin1(value: string): Uint8Array {
  const bytes = new Uint8Array(value.length)
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i)
    bytes[i] = code <= 0xff ? code : 0x3f
  }
  return bytes
}

export function textCommand(
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

export function rectFillCommand(
  x: number,
  y: number,
  width: number,
  height: number,
  fill: Rgb
): string {
  return `${n(fill[0])} ${n(fill[1])} ${n(fill[2])} rg ${n(x)} ${n(y - height)} ${n(width)} ${n(height)} re f`
}

export function rectStrokeCommand(
  x: number,
  y: number,
  width: number,
  height: number,
  stroke: Rgb,
  lineWidth: number
): string {
  return `${n(stroke[0])} ${n(stroke[1])} ${n(stroke[2])} RG ${n(lineWidth)} w ${n(x)} ${n(y - height)} ${n(width)} ${n(height)} re S`
}

export function lineCommand(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  stroke: Rgb,
  lineWidth: number
): string {
  return `${n(stroke[0])} ${n(stroke[1])} ${n(stroke[2])} RG ${n(lineWidth)} w ${n(x1)} ${n(y1)} m ${n(x2)} ${n(y2)} l S`
}

export function circleStrokeCommand(
  cx: number,
  cy: number,
  radius: number,
  stroke: Rgb,
  lineWidth: number
): string {
  const c = radius * 0.5522847498
  const path = [
    `${n(cx + radius)} ${n(cy)} m`,
    `${n(cx + radius)} ${n(cy + c)} ${n(cx + c)} ${n(cy + radius)} ${n(cx)} ${n(cy + radius)} c`,
    `${n(cx - c)} ${n(cy + radius)} ${n(cx - radius)} ${n(cy + c)} ${n(cx - radius)} ${n(cy)} c`,
    `${n(cx - radius)} ${n(cy - c)} ${n(cx - c)} ${n(cy - radius)} ${n(cx)} ${n(cy - radius)} c`,
    `${n(cx + c)} ${n(cy - radius)} ${n(cx + radius)} ${n(cy - c)} ${n(cx + radius)} ${n(cy)} c`,
  ].join(" ")
  return `${n(stroke[0])} ${n(stroke[1])} ${n(stroke[2])} RG ${n(lineWidth)} w ${path} S`
}

export function circleFillCommand(cx: number, cy: number, radius: number, fill: Rgb): string {
  const c = radius * 0.5522847498
  const path = [
    `${n(cx + radius)} ${n(cy)} m`,
    `${n(cx + radius)} ${n(cy + c)} ${n(cx + c)} ${n(cy + radius)} ${n(cx)} ${n(cy + radius)} c`,
    `${n(cx - c)} ${n(cy + radius)} ${n(cx - radius)} ${n(cy + c)} ${n(cx - radius)} ${n(cy)} c`,
    `${n(cx - radius)} ${n(cy - c)} ${n(cx - c)} ${n(cy - radius)} ${n(cx)} ${n(cy - radius)} c`,
    `${n(cx + c)} ${n(cy - radius)} ${n(cx + radius)} ${n(cy - c)} ${n(cx + radius)} ${n(cy)} c`,
  ].join(" ")
  return `${n(fill[0])} ${n(fill[1])} ${n(fill[2])} rg ${path} f`
}

export function polygonFillCommand(points: Array<{ x: number; y: number }>, fill: Rgb): string {
  if (points.length < 3) return ""
  const [first, ...rest] = points
  const segments = [
    `${n(first.x)} ${n(first.y)} m`,
    ...rest.map((p) => `${n(p.x)} ${n(p.y)} l`),
    "h",
  ]
  return `${n(fill[0])} ${n(fill[1])} ${n(fill[2])} rg ${segments.join(" ")} f`
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function hexToRgb(hex: string | undefined, fallback: Rgb): Rgb {
  if (!hex) return fallback

  const normalized = hex.trim().replace(/^#/, "")
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return fallback

  const r = Number.parseInt(normalized.slice(0, 2), 16) / 255
  const g = Number.parseInt(normalized.slice(2, 4), 16) / 255
  const b = Number.parseInt(normalized.slice(4, 6), 16) / 255

  return [r, g, b]
}
