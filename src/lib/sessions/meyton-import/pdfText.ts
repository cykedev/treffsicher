import { inflateSync } from "node:zlib"
import {
  MAX_EXTRACTED_TEXT_TOKENS,
  MAX_INFLATED_STREAM_BYTES,
  MAX_TOTAL_INFLATED_BYTES,
} from "@/lib/sessions/meyton-import/constants"

function isOctalDigit(char: string): boolean {
  return char >= "0" && char <= "7"
}

function decodePdfLiteralString(value: string): string {
  let result = ""

  for (let index = 0; index < value.length; index++) {
    const char = value[index]
    if (char !== "\\") {
      result += char
      continue
    }

    const next = value[index + 1]
    if (!next) break

    if (next === "\n") {
      index += 1
      continue
    }
    if (next === "\r") {
      index += 1
      if (value[index + 1] === "\n") index += 1
      continue
    }

    if (next === "n") {
      result += "\n"
      index += 1
      continue
    }
    if (next === "r") {
      result += "\r"
      index += 1
      continue
    }
    if (next === "t") {
      result += "\t"
      index += 1
      continue
    }
    if (next === "b") {
      result += "\b"
      index += 1
      continue
    }
    if (next === "f") {
      result += "\f"
      index += 1
      continue
    }
    if (next === "\\" || next === "(" || next === ")") {
      result += next
      index += 1
      continue
    }

    if (isOctalDigit(next)) {
      let octal = next
      let consumed = 1
      while (consumed < 3) {
        const candidate = value[index + 1 + consumed]
        if (!candidate || !isOctalDigit(candidate)) break
        octal += candidate
        consumed += 1
      }
      result += String.fromCharCode(parseInt(octal, 8))
      index += consumed
      continue
    }

    result += next
    index += 1
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

export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  const tokens = extractTextTokensFromPdfBuffer(buffer)
  return tokens.join("\n")
}
