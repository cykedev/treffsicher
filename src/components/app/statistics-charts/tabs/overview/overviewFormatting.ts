export function formatScore(value: number, scoringType: string): string {
  if (scoringType === "TENTH") return value.toFixed(1)
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export function formatDate(date: Date): { full: string; short: string } {
  const d = String(date.getDate()).padStart(2, "0")
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const yyyy = date.getFullYear()
  const yy = String(yyyy).slice(2)
  return { full: `${d}.${m}.${yyyy}`, short: `${d}.${m}.${yy}` }
}

export function buildSeriesLabel(position: number): { full: string; short: string } {
  return { full: `Serie ${position}`, short: `S${position}` }
}
