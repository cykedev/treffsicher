import "server-only"

const DEFAULT_DISPLAY_TIME_ZONE = "Europe/Berlin"

function isValidIanaTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("de-CH", { timeZone: value })
    return true
  } catch {
    return false
  }
}

function resolveDisplayTimeZone(raw: string | undefined): string {
  const configured = raw?.trim()
  if (!configured) return DEFAULT_DISPLAY_TIME_ZONE
  if (!isValidIanaTimeZone(configured)) return DEFAULT_DISPLAY_TIME_ZONE
  return configured
}

export function getDisplayTimeZone(): string {
  return resolveDisplayTimeZone(process.env.DISPLAY_TIME_ZONE)
}
