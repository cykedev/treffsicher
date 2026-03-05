import type {
  HitLocationHorizontalDirection,
  HitLocationVerticalDirection,
  ScoringType,
} from "@/generated/prisma/client"

// Zentrale Form-Typen reduzieren Prop-Kopplung zwischen Session-Form-Teilkomponenten.
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

export type HitLocationSectionModel = {
  pending: boolean
  hitLocation: SessionHitLocation | null
  hasValidationError: boolean
}

export type HitLocationSectionActions = {
  enable: () => void
  clear: () => void
  change: <K extends keyof SessionHitLocation>(key: K, value: SessionHitLocation[K]) => void
}

export type MeytonImportDialogModel = {
  open: boolean
  isPending: boolean
  source: ImportSourceType
  url: string
  file: File | null
  error: string | null
}

export type MeytonImportDialogActions = {
  openChange: (open: boolean) => void
  sourceChange: (value: ImportSourceType) => void
  urlChange: (value: string) => void
  fileChange: (file: File | null) => void
  runImport: () => Promise<void>
}

export type SeriesEditorCardModel = {
  seriesIndex: number
  seriesLabel: string
  isPractice: boolean
  totalSeries: number
  showShots: boolean
  pending: boolean
  scoringType: ScoringType
  currentShotCount: number
  shotsForSeries: string[]
  computedTotal: number | null
  maxLabel: string
  invalidShots: boolean[]
  totalIsInvalid: boolean
  invalidShotCount: number
  seriesTotalValue: string
  defaultExecutionQuality: number | null | undefined
}

export type SeriesEditorCardActions = {
  togglePractice: (index: number) => void
  removeSeries: (index: number) => void
  shotCountChange: (seriesIndex: number, newCount: number) => void
  shotChange: (seriesIndex: number, shotIndex: number, value: string) => void
  totalChange: (seriesIndex: number, value: string) => void
}
