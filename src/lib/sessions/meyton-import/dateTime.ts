import {
  GENERIC_DATETIME_GLOBAL_REGEX,
  PROBE_DATETIME_REGEX,
  WERTUNG_DATETIME_REGEX,
} from "@/lib/sessions/meyton-import/constants"

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
    // Roundtrip-Check verhindert stilles "Überlaufen" bei ungültigen Datumsteilen (z. B. 32. Tag).
    return null
  }

  const pad = (value: number) => String(value).padStart(2, "0")
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`
}

export function extractMeytonDateTime(rawText: string): string | null {
  const wertungMatch = rawText.match(WERTUNG_DATETIME_REGEX)
  if (wertungMatch) return parseDateMatch(wertungMatch)

  const probeMatch = rawText.match(PROBE_DATETIME_REGEX)
  if (probeMatch) return parseDateMatch(probeMatch)

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
