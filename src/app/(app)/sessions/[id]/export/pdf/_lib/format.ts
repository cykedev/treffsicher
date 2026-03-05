export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date))
}

export function formatDateForFile(date: Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date))
}

export function formatScore(score: number | null, isDecimal: boolean): string {
  if (score === null) return "-"
  if (isDecimal) return score.toFixed(1)
  return String(Math.round(score))
}

export function hasValue(value: string | null | undefined): boolean {
  return value != null && value.trim().length > 0
}
