/**
 * Prisma-Jsonfeld mit Schusswerten robust als String-Array lesen.
 */
export function parseShotsJson(shots: unknown): string[] {
  if (!Array.isArray(shots)) return []
  return shots.filter((entry): entry is string => typeof entry === "string")
}

export function parseShotValue(shot: string): number | null {
  const normalized = shot.trim().replace(",", ".")
  const value = Number.parseFloat(normalized)
  if (!Number.isFinite(value)) return null
  return value
}

export function formatShotsForLine(shots: string[]): string {
  return shots
    .map((shot) => shot.trim())
    .filter((shot) => shot.length > 0)
    .join(" · ")
}
