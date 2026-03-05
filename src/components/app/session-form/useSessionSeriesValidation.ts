import { useMemo } from "react"
import type { ScoringType } from "@/generated/prisma/client"
import { isValidSeriesTotal, isValidShotValue } from "@/lib/sessions/validation"

interface Params {
  showShots: boolean
  scoringType: ScoringType | undefined
  shots: string[][]
  seriesTotals: string[]
  shotCounts: number[]
  defaultShotsPerSeries: number
}

export function useSessionSeriesValidation({
  showShots,
  scoringType,
  shots,
  seriesTotals,
  shotCounts,
  defaultShotsPerSeries,
}: Params): {
  invalidShots: boolean[][]
  invalidTotals: boolean[]
  hasValidationErrors: boolean
} {
  const invalidShots = useMemo(() => {
    if (!showShots || !scoringType) {
      return shots.map((seriesShots) => seriesShots.map(() => false))
    }

    return shots.map((seriesShots) =>
      seriesShots.map((value) => value !== "" && !isValidShotValue(value, scoringType))
    )
  }, [showShots, scoringType, shots])

  const invalidTotals = useMemo(() => {
    if (!showShots && scoringType) {
      return seriesTotals.map(
        (value, index) =>
          value !== "" &&
          !isValidSeriesTotal(value, scoringType, shotCounts[index] ?? defaultShotsPerSeries)
      )
    }

    return seriesTotals.map(() => false)
  }, [seriesTotals, showShots, scoringType, shotCounts, defaultShotsPerSeries])

  const hasValidationErrors = useMemo(() => {
    return invalidShots.some((series) => series.some(Boolean)) || invalidTotals.some(Boolean)
  }, [invalidShots, invalidTotals])

  return {
    invalidShots,
    invalidTotals,
    hasValidationErrors,
  }
}
