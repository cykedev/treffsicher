function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function monthsAgo(months: number): string {
  const date = new Date()
  date.setMonth(date.getMonth() - months)
  return formatLocalDate(date)
}

export function today(): string {
  return formatLocalDate(new Date())
}

export function parseDateInput(value: string, endOfDay: boolean): Date | null {
  const [year, month, day] = value.split("-").map(Number)
  if (!year || !month || !day) return null

  return endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59, 999)
    : new Date(year, month - 1, day, 0, 0, 0, 0)
}
