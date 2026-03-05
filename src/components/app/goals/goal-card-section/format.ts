export const GOAL_TYPE_LABELS: Record<string, string> = {
  RESULT: "Ergebnisziel",
  PROCESS: "Prozessziel",
}

export function formatDateOnly(date: Date, displayTimeZone: string): string {
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: displayTimeZone,
  }).format(new Date(date))
}

export function formatDateTime(date: Date, displayTimeZone: string): string {
  return new Intl.DateTimeFormat("de-CH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: displayTimeZone,
  }).format(new Date(date))
}

export function toDateInputValue(date: Date): string {
  return new Date(date).toISOString().slice(0, 10)
}
