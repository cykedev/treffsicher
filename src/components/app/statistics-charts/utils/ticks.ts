export function buildIndexTicks(length: number, maxTicks: number): number[] {
  if (length <= 0) return []
  if (length <= maxTicks) return Array.from({ length }, (_, i) => i)
  if (maxTicks <= 1) return [0]

  const lastIndex = length - 1
  const step = lastIndex / (maxTicks - 1)
  const ticks = new Set<number>([0, lastIndex])

  for (let i = 1; i < maxTicks - 1; i++) {
    ticks.add(Math.round(step * i))
  }

  return [...ticks].sort((a, b) => a - b)
}
