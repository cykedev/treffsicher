import type { Discipline } from "@/generated/prisma/client"
import type { SeriesDefaults } from "@/components/app/session-form/types"

export function toDateTimeLocalValue(value: Date | string): string {
  const base = new Date(value)
  base.setMinutes(base.getMinutes() - base.getTimezoneOffset())
  return base.toISOString().slice(0, 16)
}

export function toIsoFromDateTimeLocalValue(value: string): string | null {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

export function isPdfFile(file: File): boolean {
  if (file.type === "application/pdf") return true
  return file.name.toLowerCase().endsWith(".pdf")
}

export function formatMillimeters(value: number): string {
  return value.toFixed(2)
}

export function isValidHitLocationMillimeter(value: string): boolean {
  const normalized = value.trim().replace(",", ".")
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return false

  const parsed = Number(normalized)
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 9999.99
}

export function createSeriesDefaults(discipline: Discipline | undefined): SeriesDefaults {
  if (!discipline) {
    return {
      totalSeries: 0,
      shotCounts: [],
      seriesIsPractice: [],
      seriesKeys: [],
      seriesTotals: [],
    }
  }

  const newTotal = discipline.practiceSeries + discipline.seriesCount
  const seed = Date.now()

  return {
    totalSeries: newTotal,
    shotCounts: Array(newTotal).fill(discipline.shotsPerSeries),
    seriesIsPractice: [
      ...Array(discipline.practiceSeries).fill(true),
      ...Array(discipline.seriesCount).fill(false),
    ] as boolean[],
    seriesKeys: [
      ...Array.from({ length: discipline.practiceSeries }, (_, i) => `d-p-${i}-${seed}`),
      ...Array.from({ length: discipline.seriesCount }, (_, i) => `d-r-${i}-${seed}`),
    ],
    seriesTotals: Array(newTotal).fill(""),
  }
}
