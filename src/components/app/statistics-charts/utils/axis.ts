function niceNumber(value: number, round: boolean): number {
  if (!Number.isFinite(value) || value <= 0) return 1

  const exponent = Math.floor(Math.log10(value))
  const fraction = value / 10 ** exponent

  let niceFraction: number
  if (round) {
    if (fraction < 1.5) niceFraction = 1
    else if (fraction < 3) niceFraction = 2
    else if (fraction < 7) niceFraction = 5
    else niceFraction = 10
  } else {
    if (fraction <= 1) niceFraction = 1
    else if (fraction <= 2) niceFraction = 2
    else if (fraction <= 5) niceFraction = 5
    else niceFraction = 10
  }

  return niceFraction * 10 ** exponent
}

export function computeStableAxis(
  values: number[],
  targetTickCount = 5
): { domain: [number, number]; ticks: number[] } {
  if (values.length === 0) {
    return { domain: [0, 1], ticks: [0, 0.25, 0.5, 0.75, 1] }
  }

  let min = Math.min(...values)
  let max = Math.max(...values)

  if (min === max) {
    const padding = Math.max(Math.abs(min) * 0.02, 0.1)
    min -= padding
    max += padding
  } else {
    const range = max - min
    const padding = Math.max(range * 0.08, 0.1)
    min -= padding
    max += padding
  }

  const niceRange = niceNumber(max - min, false)
  const step = niceNumber(niceRange / Math.max(targetTickCount - 1, 1), true)
  const niceMin = Math.floor(min / step) * step
  const niceMax = Math.ceil(max / step) * step

  const ticks: number[] = []
  for (let tick = niceMin; tick <= niceMax + step * 0.5; tick += step) {
    ticks.push(Number(tick.toFixed(6)))
    if (ticks.length >= 12) break
  }

  return {
    domain: [ticks[0] ?? niceMin, ticks[ticks.length - 1] ?? niceMax],
    ticks,
  }
}

export function computeCenteredAxis(
  values: number[],
  minAbsMax = 1
): { domain: [number, number]; ticks: number[] } {
  if (values.length === 0) {
    return { domain: [-minAbsMax, minAbsMax], ticks: [-minAbsMax, 0, minAbsMax] }
  }

  const absMaxRaw = Math.max(...values.map((v) => Math.abs(v)))
  const absMax = Math.max(minAbsMax, absMaxRaw)
  const niceMax = niceNumber(absMax * 1.12, false)
  const half = Math.round((niceMax / 2) * 100) / 100

  return {
    domain: [-niceMax, niceMax],
    ticks: [-niceMax, -half, 0, half, niceMax],
  }
}

export function calculateMean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((sum, v) => sum + v, 0) / values.length
}
