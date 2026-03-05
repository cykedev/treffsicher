import {
  SERIES_HEADER_GLOBAL_REGEX,
  SERIES_HEADER_REGEX,
  SHOT_TOKEN_REGEX,
  STOP_KEYWORDS,
} from "@/lib/sessions/meyton-import/constants"
import type { MeytonSerie, MeytonSeriesResult } from "@/lib/sessions/meyton-import/types"

function hasStopKeyword(line: string): boolean {
  const lower = line.toLowerCase()
  return STOP_KEYWORDS.some((keyword) => lower.includes(keyword))
}

export function parseMeytonSeriesFromText(rawText: string): MeytonSeriesResult {
  const text = rawText.replace(/\r/g, "\n")
  const matches = Array.from(text.matchAll(SERIES_HEADER_GLOBAL_REGEX))
  if (matches.length === 0) return { serien: [] }

  const serien: MeytonSerie[] = []
  for (let index = 0; index < matches.length; index++) {
    const current = matches[index]
    const next = matches[index + 1]
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
      if (SERIES_HEADER_REGEX.test(trimmed)) continue
      if (hasStopKeyword(trimmed)) break

      const valuesInLine: number[] = []
      for (const match of trimmed.matchAll(SHOT_TOKEN_REGEX)) {
        const value = Number(match[2])
        if (Number.isNaN(value)) continue
        if (value < 0 || value > 10.9) continue
        valuesInLine.push(Math.round(value * 10) / 10)
      }

      if (!didStartShotBlock) {
        if (valuesInLine.length === 0) continue
        shots.push(...valuesInLine)
        didStartShotBlock = true
        continue
      }

      if (valuesInLine.length === 0) break
      shots.push(...valuesInLine)
    }

    serien.push({ nr, shots })
  }

  return { serien }
}
