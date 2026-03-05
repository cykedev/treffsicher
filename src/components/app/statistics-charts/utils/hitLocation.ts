import type { StatsSession } from "@/lib/stats/actions"
import type {
  HitLocationCurvePoint,
  HitLocationPathPoint,
  HitLocationPoint,
} from "@/components/app/statistics-charts/types"

export function formatSignedMillimeters(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "–"
  const sign = value > 0 ? "+" : value < 0 ? "−" : "±"
  return `${sign}${Math.abs(value).toFixed(2)} mm`
}

export function formatDirectionalMillimeters(value: number | null, axis: "x" | "y"): string {
  if (value === null || !Number.isFinite(value)) return "–"

  const absValue = `${Math.abs(value).toFixed(2)} mm`
  if (axis === "x") {
    if (value > 0) return `→ ${absValue}`
    if (value < 0) return `← ${absValue}`
    return `↔ ${absValue}`
  }

  if (value > 0) return `↑ ${absValue}`
  if (value < 0) return `↓ ${absValue}`
  return `↕ ${absValue}`
}

export function mapSessionToHitLocationPoint(session: StatsSession): HitLocationPoint | null {
  if (
    session.hitLocationHorizontalMm === null ||
    session.hitLocationHorizontalDirection === null ||
    session.hitLocationVerticalMm === null ||
    session.hitLocationVerticalDirection === null
  ) {
    return null
  }

  const signedX =
    session.hitLocationHorizontalDirection === "RIGHT"
      ? session.hitLocationHorizontalMm
      : -session.hitLocationHorizontalMm
  const signedY =
    session.hitLocationVerticalDirection === "HIGH"
      ? session.hitLocationVerticalMm
      : -session.hitLocationVerticalMm

  return {
    sessionId: session.id,
    date: session.date,
    x: Math.round(signedX * 100) / 100,
    y: Math.round(signedY * 100) / 100,
    disciplineId: session.disciplineId,
  }
}

export function buildCatmullRomCurvePoints(
  points: HitLocationPathPoint[],
  samplesPerSegment = 8
): HitLocationCurvePoint[] {
  if (points.length === 0) return []
  if (points.length === 1) return [{ x: points[0].x, y: points[0].y }]
  if (points.length === 2) return points.map((point) => ({ x: point.x, y: point.y }))

  const curve: HitLocationCurvePoint[] = [{ x: points[0].x, y: points[0].y }]

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[Math.min(points.length - 1, i + 2)]

    for (let step = 1; step <= samplesPerSegment; step++) {
      const t = step / samplesPerSegment
      const t2 = t * t
      const t3 = t2 * t

      const x =
        0.5 *
        ((2 * p1.x +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3) as number)
      const y =
        0.5 *
        ((2 * p1.y +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3) as number)

      curve.push({ x, y })
    }
  }

  return curve
}
