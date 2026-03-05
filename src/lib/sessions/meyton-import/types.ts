export interface MeytonSerie {
  nr: number
  shots: number[]
}

export interface MeytonSeriesResult {
  serien: MeytonSerie[]
}

export type MeytonHorizontalDirection = "LEFT" | "RIGHT"
export type MeytonVerticalDirection = "HIGH" | "LOW"

export interface MeytonHitLocation {
  horizontalMm: number
  horizontalDirection: MeytonHorizontalDirection
  verticalMm: number
  verticalDirection: MeytonVerticalDirection
}
