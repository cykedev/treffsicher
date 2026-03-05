import { parseShotValue } from "@/lib/sessions/shots"
import { shotBucketColors } from "./constants"

export function buildShotHistogramBuckets(
  shots: string[],
  isDecimal: boolean
): Array<{
  label: string
  value: number
  colorHex: string
}> {
  const counts = new Array<number>(11).fill(0)

  for (const shot of shots) {
    const value = parseShotValue(shot)
    if (value === null) continue
    const bucket = isDecimal ? Math.floor(value) : Math.round(value)
    const ring = Math.max(0, Math.min(10, bucket))
    counts[ring] += 1
  }

  return Array.from({ length: 11 }, (_, index) => {
    const ring = 10 - index
    return {
      label: String(ring),
      value: counts[ring],
      colorHex: shotBucketColors[index],
    }
  })
}
