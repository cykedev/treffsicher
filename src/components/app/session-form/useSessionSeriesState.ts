import { useCallback, useMemo, useState } from "react"
import { calculateSumFromShots } from "@/lib/sessions/calculateScore"
import { isValidSeriesTotal, isValidShotValue } from "@/lib/sessions/validation"
import type { Discipline } from "@/generated/prisma/client"
import type {
  MeytonImportPreviewSeries,
  SessionDetail,
  SerializedSeries,
} from "@/lib/sessions/actions"
import { createSeriesDefaults } from "@/components/app/session-form/utils"

interface Params {
  initialData?: SessionDetail
  disciplines: Discipline[]
  initialDisciplineId: string
}

function sortSeriesWithPracticeFirst(series: SerializedSeries[]): SerializedSeries[] {
  return [...series].sort((a, b) => {
    if (a.isPractice === b.isPractice) return 0
    return a.isPractice ? -1 : 1
  })
}

export function useSessionSeriesState({ initialData, disciplines, initialDisciplineId }: Params) {
  const initialDiscipline = disciplines.find((discipline) => discipline.id === initialDisciplineId)
  const initialSeriesDefaults = createSeriesDefaults(initialDiscipline)

  const [disciplineId, setDisciplineId] = useState<string>(() => initialDisciplineId)
  const [sortedInitialSeries] = useState<SerializedSeries[]>(() => {
    if (!initialData) return []
    return sortSeriesWithPracticeFirst(initialData.series)
  })

  const [showShots, setShowShots] = useState<boolean>(() => {
    if (!initialData) return false
    return sortedInitialSeries.some(
      (series) => Array.isArray(series.shots) && (series.shots as string[]).length > 0
    )
  })

  const [shots, setShots] = useState<string[][]>(() => {
    if (
      !initialData ||
      !sortedInitialSeries.some(
        (series) => Array.isArray(series.shots) && (series.shots as string[]).length > 0
      )
    ) {
      return []
    }
    return sortedInitialSeries.map((series) =>
      Array.isArray(series.shots) ? (series.shots as string[]) : []
    )
  })

  const [totalSeries, setTotalSeries] = useState<number>(() =>
    initialData ? sortedInitialSeries.length : initialSeriesDefaults.totalSeries
  )

  const [shotCounts, setShotCounts] = useState<number[]>(() => {
    if (!initialData) return initialSeriesDefaults.shotCounts
    const discipline = disciplines.find((entry) => entry.id === initialData.disciplineId)
    return sortedInitialSeries.map((series) => {
      if (Array.isArray(series.shots) && (series.shots as string[]).length > 0) {
        return (series.shots as string[]).length
      }
      return discipline?.shotsPerSeries ?? 10
    })
  })

  const [seriesTotals, setSeriesTotals] = useState<string[]>(() => {
    if (!initialData) return initialSeriesDefaults.seriesTotals
    return sortedInitialSeries.map((series) =>
      series.scoreTotal != null ? String(series.scoreTotal) : ""
    )
  })

  const [seriesIsPractice, setSeriesIsPractice] = useState<boolean[]>(() =>
    initialData
      ? sortedInitialSeries.map((series) => series.isPractice)
      : initialSeriesDefaults.seriesIsPractice
  )

  const [seriesKeys, setSeriesKeys] = useState<string[]>(() =>
    initialData ? sortedInitialSeries.map((series) => series.id) : initialSeriesDefaults.seriesKeys
  )

  const selectedDiscipline = useMemo(
    () => disciplines.find((discipline) => discipline.id === disciplineId),
    [disciplines, disciplineId]
  )

  const scoringType = selectedDiscipline?.scoringType

  const invalidShots: boolean[][] = useMemo(() => {
    if (!showShots || !scoringType) {
      return shots.map((seriesShots) => seriesShots.map(() => false))
    }

    return shots.map((seriesShots) =>
      seriesShots.map((value) => value !== "" && !isValidShotValue(value, scoringType))
    )
  }, [showShots, scoringType, shots])

  const invalidTotals: boolean[] = useMemo(() => {
    if (!showShots && scoringType) {
      return seriesTotals.map(
        (value, index) =>
          value !== "" &&
          !isValidSeriesTotal(
            value,
            scoringType,
            shotCounts[index] ?? selectedDiscipline?.shotsPerSeries ?? 10
          )
      )
    }

    return seriesTotals.map(() => false)
  }, [seriesTotals, showShots, scoringType, shotCounts, selectedDiscipline])

  const hasValidationErrors = useMemo(() => {
    return invalidShots.some((series) => series.some(Boolean)) || invalidTotals.some(Boolean)
  }, [invalidShots, invalidTotals])

  const handleDisciplineChange = useCallback(
    (id: string) => {
      setDisciplineId(id)
      const discipline = disciplines.find((entry) => entry.id === id)
      const defaults = createSeriesDefaults(discipline)
      setTotalSeries(defaults.totalSeries)
      setShotCounts(defaults.shotCounts)
      setSeriesIsPractice(defaults.seriesIsPractice)
      setSeriesKeys(defaults.seriesKeys)
      setSeriesTotals(defaults.seriesTotals)
      setShowShots(false)
      setShots([])
    },
    [disciplines]
  )

  const clearForTypeWithoutDiscipline = useCallback(() => {
    setDisciplineId("")
    setTotalSeries(0)
    setShotCounts([])
    setSeriesIsPractice([])
    setSeriesKeys([])
    setSeriesTotals([])
    setShowShots(false)
    setShots([])
  }, [])

  const handleShotToggle = useCallback(
    (enabled: boolean) => {
      setShowShots(enabled)
      if (enabled) {
        setShots(shotCounts.map((count) => Array(count).fill("")))
        return
      }

      setSeriesTotals(
        shots.map((seriesShots) => {
          const total = calculateSumFromShots(seriesShots)
          return total !== null ? String(total) : ""
        })
      )
    },
    [shotCounts, shots]
  )

  const handleShotChange = useCallback((seriesIndex: number, shotIndex: number, value: string) => {
    setShots((prev) => {
      const next = prev.map((seriesShots) => [...seriesShots])
      next[seriesIndex][shotIndex] = value
      return next
    })
  }, [])

  const handleTotalChange = useCallback((seriesIndex: number, value: string) => {
    setSeriesTotals((prev) => prev.map((entry, index) => (index === seriesIndex ? value : entry)))
  }, [])

  const handleTogglePractice = useCallback(
    (index: number) => {
      const newIsPractice = seriesIsPractice.map((value, seriesIndex) =>
        seriesIndex === index ? !value : value
      )
      const permutation = Array.from({ length: newIsPractice.length }, (_, i) => i)
      permutation.sort((a, b) => {
        if (newIsPractice[a] === newIsPractice[b]) return 0
        return newIsPractice[a] ? -1 : 1
      })

      setSeriesIsPractice(permutation.map((seriesIndex) => newIsPractice[seriesIndex]))
      setSeriesKeys(permutation.map((seriesIndex) => seriesKeys[seriesIndex]))
      setShotCounts(permutation.map((seriesIndex) => shotCounts[seriesIndex]))
      setSeriesTotals(permutation.map((seriesIndex) => seriesTotals[seriesIndex] ?? ""))

      if (showShots) {
        setShots(permutation.map((seriesIndex) => shots[seriesIndex] ?? []))
      }
    },
    [seriesIsPractice, seriesKeys, shotCounts, seriesTotals, showShots, shots]
  )

  const handleAddSeries = useCallback(() => {
    const defaultCount = selectedDiscipline?.shotsPerSeries ?? 10
    setTotalSeries((value) => value + 1)
    setShotCounts((prev) => [...prev, defaultCount])
    setSeriesIsPractice((prev) => [...prev, false])
    setSeriesKeys((prev) => [...prev, `r-${Date.now()}`])
    setSeriesTotals((prev) => [...prev, ""])

    if (showShots) {
      setShots((prev) => [...prev, Array(defaultCount).fill("")])
    }
  }, [selectedDiscipline, showShots])

  const handleAddPracticeSeries = useCallback(() => {
    const defaultCount = selectedDiscipline?.shotsPerSeries ?? 10
    const firstRegular = seriesIsPractice.findIndex((isPractice) => !isPractice)
    const insertIndex = firstRegular === -1 ? seriesIsPractice.length : firstRegular

    setTotalSeries((value) => value + 1)
    setShotCounts((prev) => [
      ...prev.slice(0, insertIndex),
      defaultCount,
      ...prev.slice(insertIndex),
    ])
    setSeriesIsPractice((prev) => [...prev.slice(0, insertIndex), true, ...prev.slice(insertIndex)])
    setSeriesKeys((prev) => [
      ...prev.slice(0, insertIndex),
      `p-${Date.now()}`,
      ...prev.slice(insertIndex),
    ])
    setSeriesTotals((prev) => [...prev.slice(0, insertIndex), "", ...prev.slice(insertIndex)])

    if (showShots) {
      setShots((prev) => [
        ...prev.slice(0, insertIndex),
        Array(defaultCount).fill(""),
        ...prev.slice(insertIndex),
      ])
    }
  }, [selectedDiscipline, seriesIsPractice, showShots])

  const handleRemoveSeries = useCallback(
    (index: number) => {
      if (totalSeries <= 1) return

      setTotalSeries((value) => value - 1)
      setShotCounts((prev) => prev.filter((_, seriesIndex) => seriesIndex !== index))
      setSeriesIsPractice((prev) => prev.filter((_, seriesIndex) => seriesIndex !== index))
      setSeriesKeys((prev) => prev.filter((_, seriesIndex) => seriesIndex !== index))
      setSeriesTotals((prev) => prev.filter((_, seriesIndex) => seriesIndex !== index))

      if (showShots) {
        setShots((prev) => prev.filter((_, seriesIndex) => seriesIndex !== index))
      }
    },
    [showShots, totalSeries]
  )

  const handleShotCountChange = useCallback(
    (seriesIndex: number, newCount: number) => {
      const count = Math.max(1, Math.min(99, newCount))
      setShotCounts((prev) => prev.map((entry, index) => (index === seriesIndex ? count : entry)))

      if (showShots) {
        setShots((prev) =>
          prev.map((seriesShots, index) => {
            if (index !== seriesIndex) return seriesShots
            if (count > seriesShots.length) {
              return [...seriesShots, ...Array(count - seriesShots.length).fill("")]
            }
            return seriesShots.slice(0, count)
          })
        )
      }
    },
    [showShots]
  )

  const applyImportedSeries = useCallback((importedSeries: MeytonImportPreviewSeries[]) => {
    const now = Date.now()
    const newTotal = importedSeries.length

    setTotalSeries(newTotal)
    setShowShots(true)
    setShots(importedSeries.map((series) => [...series.shots]))
    setShotCounts(importedSeries.map((series) => Math.max(1, series.shots.length)))
    setSeriesIsPractice(Array(newTotal).fill(false))
    setSeriesTotals(importedSeries.map((series) => series.scoreTotal))
    setSeriesKeys(importedSeries.map((series, index) => `m-${now}-${index}-${series.nr}`))
  }, [])

  return {
    disciplineId,
    selectedDiscipline,
    scoringType,
    sortedInitialSeries,
    showShots,
    shots,
    totalSeries,
    shotCounts,
    seriesTotals,
    seriesIsPractice,
    seriesKeys,
    invalidShots,
    invalidTotals,
    hasValidationErrors,
    handleDisciplineChange,
    clearForTypeWithoutDiscipline,
    handleShotToggle,
    handleShotChange,
    handleTotalChange,
    handleTogglePractice,
    handleAddSeries,
    handleAddPracticeSeries,
    handleRemoveSeries,
    handleShotCountChange,
    applyImportedSeries,
  }
}
