import type {
  HitLocationHorizontalDirection,
  HitLocationVerticalDirection,
} from "@/generated/prisma/client"

export type ImportSourceType = "URL" | "UPLOAD"

export type SessionHitLocation = {
  horizontalMm: string
  horizontalDirection: HitLocationHorizontalDirection | ""
  verticalMm: string
  verticalDirection: HitLocationVerticalDirection | ""
}

export type SeriesDefaults = {
  totalSeries: number
  shotCounts: number[]
  seriesIsPractice: boolean[]
  seriesKeys: string[]
  seriesTotals: string[]
}
