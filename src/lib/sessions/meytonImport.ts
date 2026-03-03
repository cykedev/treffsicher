import { inflateSync } from "node:zlib"

export interface MeytonSerie {
  nr: number
  shots: number[]
}

export interface MeytonSeriesResult {
  serien: MeytonSerie[]
}

export type MeytonHorizontalDirection = "LEFT" | "RIGHT"
export type MeytonVerticalDirection = "HIGH" | "LOW"

export interface MeytonHitLocation {
  horizontalMm: number
  horizontalDirection: MeytonHorizontalDirection
  verticalMm: number
  verticalDirection: MeytonVerticalDirection
}

const WERTUNG_DATETIME_REGEX = /Wertung\s+(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/i
const PROBE_DATETIME_REGEX = /Probe\s+(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/i
const GENERIC_DATETIME_GLOBAL_REGEX = /(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/g
const HIT_LOCATION_REGEX =
  /Trefferlage\s*:?\s*([0-9]+(?:[.,][0-9]+)?)\s*mm\s*(rechts|links)\s*,\s*([0-9]+(?:[.,][0-9]+)?)\s*mm\s*(hoch|tief)/i

const SERIES_HEADER_REGEX = /Serie\s+(\d+)\s*:/i
const SERIES_HEADER_GLOBAL_REGEX = /Serie\s+(\d+)\s*:/gi
const SHOT_TOKEN_REGEX = /(^|[^0-9])(\d{1,2}(?:\.\d)?)(?:\*|T)?(?!\d)/g
const MAX_INFLATED_STREAM_BYTES = 2 * 1024 * 1024
const MAX_TOTAL_INFLATED_BYTES = 8 * 1024 * 1024
const MAX_EXTRACTED_TEXT_TOKENS = 25_000

const STOP_KEYWORDS = [
  "trefferlage",
  "streuwert",
  "ergebnis",
  "serien:",
  "zaehler",
  "innenzehner",
  "weiteste",
  "teiler",
  "gedruckt am",
  "id:",
  "seite:",
]

function hasStopKeyword(line: string): boolean {
  const lower = line.toLowerCase()
  return STOP_KEYWORDS.some((keyword) => lower.includes(keyword))
}

function isOctalDigit(char: string): boolean {
  return char >= "0" && char <= "7"
}

function parseMeytonMillimeterValue(value: string): number | null {
  const normalized = value.replace(",", ".").trim()
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed < 0) return null

  return Math.round(parsed * 100) / 100
}

/**
 * Dekodiert PDF-Literalstrings (inkl. Standard-Escape-Sequenzen).
 */
function decodePdfLiteralString(value: string): string {
  let result = ""

  for (let i = 0; i < value.length; i++) {
    const char = value[i]
    if (char !== "\\") {
      result += char
      continue
    }

    const next = value[i + 1]
    if (!next) break

    // Zeilenfortsetzung in PDF-Strings (Backslash + Zeilenumbruch)
    if (next === "\n") {
      i += 1
      continue
    }
    if (next === "\r") {
      i += 1
      if (value[i + 1] === "\n") i += 1
      continue
    }

    if (next === "n") {
      result += "\n"
      i += 1
      continue
    }
    if (next === "r") {
      result += "\r"
      i += 1
      continue
    }
    if (next === "t") {
      result += "\t"
      i += 1
      continue
    }
    if (next === "b") {
      result += "\b"
      i += 1
      continue
    }
    if (next === "f") {
      result += "\f"
      i += 1
      continue
    }
    if (next === "\\" || next === "(" || next === ")") {
      result += next
      i += 1
      continue
    }

    // Oktal-Notation: bis zu drei oktale Ziffern
    if (isOctalDigit(next)) {
      let octal = next
      let consumed = 1
      while (consumed < 3) {
        const candidate = value[i + 1 + consumed]
        if (!candidate || !isOctalDigit(candidate)) break
        octal += candidate
        consumed += 1
      }
      result += String.fromCharCode(parseInt(octal, 8))
      i += consumed
      continue
    }

    result += next
    i += 1
  }

  return result
}

function extractLiteralStringsFromContent(content: string): string[] {
  const literals: string[] = []

  const tjRegex = /\(((?:\\.|[^\\()])*)\)\s*Tj/g
  for (const match of content.matchAll(tjRegex)) {
    literals.push(decodePdfLiteralString(match[1] ?? ""))
  }

  const tjArrayRegex = /\[((?:\\.|[^\]])*)\]\s*TJ/g
  for (const arrayMatch of content.matchAll(tjArrayRegex)) {
    const arrayContent = arrayMatch[1] ?? ""
    const innerStringRegex = /\(((?:\\.|[^\\()])*)\)/g
    for (const innerMatch of arrayContent.matchAll(innerStringRegex)) {
      literals.push(decodePdfLiteralString(innerMatch[1] ?? ""))
    }
  }

  return literals
}

function extractTextTokensFromPdfBuffer(buffer: Buffer): string[] {
  const source = buffer.toString("latin1")
  const tokens: string[] = []
  let totalInflatedBytes = 0

  let index = 0
  while (index < source.length) {
    const streamKeywordIndex = source.indexOf("stream", index)
    if (streamKeywordIndex === -1) break

    const objectStartIndex = source.lastIndexOf("obj", streamKeywordIndex)
    const objectChunk =
      objectStartIndex === -1
        ? ""
        : source.slice(Math.max(0, objectStartIndex - 500), streamKeywordIndex)

    // Nur FlateDecode-Streams enthalten typischerweise nutzbare, komprimierte Inhalte.
    if (!/\/Filter\s*(\[\s*)?\/FlateDecode/i.test(objectChunk)) {
      index = streamKeywordIndex + 6
      continue
    }

    let streamStart = streamKeywordIndex + 6
    if (source[streamStart] === "\r" && source[streamStart + 1] === "\n") {
      streamStart += 2
    } else if (source[streamStart] === "\n" || source[streamStart] === "\r") {
      streamStart += 1
    }

    const streamEnd = source.indexOf("endstream", streamStart)
    if (streamEnd === -1) break

    const compressedStream = buffer.slice(streamStart, streamEnd)
    try {
      const inflatedBuffer = inflateSync(compressedStream, {
        maxOutputLength: MAX_INFLATED_STREAM_BYTES,
      })
      totalInflatedBytes += inflatedBuffer.length
      if (totalInflatedBytes > MAX_TOTAL_INFLATED_BYTES) {
        break
      }

      const inflated = inflatedBuffer.toString("latin1")
      const streamTokens = extractLiteralStringsFromContent(inflated)
      if (streamTokens.length > 0) {
        const remainingTokenSlots = MAX_EXTRACTED_TEXT_TOKENS - tokens.length
        if (remainingTokenSlots <= 0) break
        if (streamTokens.length > remainingTokenSlots) {
          tokens.push(...streamTokens.slice(0, remainingTokenSlots))
          break
        }
        tokens.push(...streamTokens)
      }
    } catch {
      // Nicht lesbare Streams ignorieren; wir parsen weiter.
    }

    index = streamEnd + 9
  }

  return tokens
}

/**
 * Extrahiert reinen Text aus einem textbasierten PDF.
 * OCR wird bewusst nicht verwendet.
 */
export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  const tokens = extractTextTokensFromPdfBuffer(buffer)
  return tokens.join("\n")
}

/**
 * Parst Meyton-Serien und Schusswerte aus extrahiertem PDF-Text.
 * Die Reihenfolge folgt exakt der Reihenfolge im Dokument.
 */
export function parseMeytonSeriesFromText(rawText: string): MeytonSeriesResult {
  const text = rawText.replace(/\r/g, "\n")
  const matches = Array.from(text.matchAll(SERIES_HEADER_GLOBAL_REGEX))

  if (matches.length === 0) {
    return { serien: [] }
  }

  const serien: MeytonSerie[] = []

  for (let i = 0; i < matches.length; i++) {
    const current = matches[i]
    const next = matches[i + 1]
    const start = current.index ?? 0
    const end = next?.index ?? text.length
    const section = text.slice(start, end)
    const nr = Number(current[1])

    const shots: number[] = []
    const lines = section.split(/\n+/)
    let didStartShotBlock = false

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      if (SERIES_HEADER_REGEX.test(trimmed)) {
        continue
      }

      // Meyton-Footer-/Statistikbereiche sollen nicht als Schussdaten interpretiert werden.
      if (hasStopKeyword(trimmed)) {
        break
      }

      const valuesInLine: number[] = []
      for (const match of trimmed.matchAll(SHOT_TOKEN_REGEX)) {
        const value = Number(match[2])
        if (Number.isNaN(value)) continue
        if (value < 0 || value > 10.9) continue
        valuesInLine.push(Math.round(value * 10) / 10)
      }

      // Wir lesen nur den ersten zusammenhängenden Schussblock direkt nach dem Serienkopf.
      // So verhindern wir, dass spätere Layout-Zahlen (z.B. Footer, IDs, Achsenwerte) als Schüsse
      // in die letzte Serie geraten.
      if (!didStartShotBlock) {
        if (valuesInLine.length === 0) continue
        shots.push(...valuesInLine)
        didStartShotBlock = true
        continue
      }

      if (valuesInLine.length === 0) {
        break
      }

      shots.push(...valuesInLine)
    }

    serien.push({ nr, shots })
  }

  return { serien }
}

/**
 * Liest Datum/Uhrzeit aus dem Meyton-Header (Wertung dd.mm.yyyy hh:mm).
 * Rückgabe als datetime-local-String (yyyy-mm-ddThh:mm) oder null wenn nicht vorhanden.
 */
export function extractMeytonDateTime(rawText: string): string | null {
  function parseDateMatch(match: RegExpMatchArray): string | null {
    const day = Number(match[1])
    const month = Number(match[2])
    const year = Number(match[3])
    const hour = Number(match[4])
    const minute = Number(match[5])

    if (
      Number.isNaN(day) ||
      Number.isNaN(month) ||
      Number.isNaN(year) ||
      Number.isNaN(hour) ||
      Number.isNaN(minute)
    ) {
      return null
    }

    const date = new Date(year, month - 1, day, hour, minute, 0, 0)
    if (Number.isNaN(date.getTime())) return null
    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day ||
      date.getHours() !== hour ||
      date.getMinutes() !== minute
    ) {
      return null
    }

    const pad = (value: number) => String(value).padStart(2, "0")
    return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`
  }

  const wertungMatch = rawText.match(WERTUNG_DATETIME_REGEX)
  if (wertungMatch) {
    return parseDateMatch(wertungMatch)
  }

  const probeMatch = rawText.match(PROBE_DATETIME_REGEX)
  if (probeMatch) {
    return parseDateMatch(probeMatch)
  }

  // Fallback: erstes Datum/Uhrzeit-Paar im Dokument, aber "gedruckt am" ignorieren.
  for (const match of rawText.matchAll(GENERIC_DATETIME_GLOBAL_REGEX)) {
    const start = match.index ?? 0
    const contextStart = Math.max(0, start - 24)
    const context = rawText.slice(contextStart, start).toLowerCase()
    if (context.includes("gedruckt am")) continue

    const parsed = parseDateMatch(match as unknown as RegExpMatchArray)
    if (parsed) return parsed
  }

  return null
}

/**
 * Extrahiert die Trefferlage aus dem Meyton-Text.
 * Liefert die erste gefundene Trefferlage im Dokument.
 */
export function extractMeytonHitLocation(rawText: string): MeytonHitLocation | null {
  const match = rawText.match(HIT_LOCATION_REGEX)
  if (!match) return null

  const horizontalMm = parseMeytonMillimeterValue(match[1] ?? "")
  const verticalMm = parseMeytonMillimeterValue(match[3] ?? "")
  if (horizontalMm === null || verticalMm === null) return null

  const horizontalLabel = (match[2] ?? "").toLowerCase()
  const verticalLabel = (match[4] ?? "").toLowerCase()

  let horizontalDirection: MeytonHorizontalDirection
  if (horizontalLabel === "links") {
    horizontalDirection = "LEFT"
  } else if (horizontalLabel === "rechts") {
    horizontalDirection = "RIGHT"
  } else {
    return null
  }

  let verticalDirection: MeytonVerticalDirection
  if (verticalLabel === "hoch") {
    verticalDirection = "HIGH"
  } else if (verticalLabel === "tief") {
    verticalDirection = "LOW"
  } else {
    return null
  }

  return {
    horizontalMm,
    horizontalDirection,
    verticalMm,
    verticalDirection,
  }
}
