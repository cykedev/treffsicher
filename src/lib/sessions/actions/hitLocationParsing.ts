import type {
  HitLocationHorizontalDirection,
  HitLocationVerticalDirection,
} from "@/generated/prisma/client"

const HORIZONTAL_DIRECTION_VALUES = ["LEFT", "RIGHT"] as const
const VERTICAL_DIRECTION_VALUES = ["HIGH", "LOW"] as const

export type ParsedHitLocationInput = {
  horizontalMm: number
  horizontalDirection: HitLocationHorizontalDirection
  verticalMm: number
  verticalDirection: HitLocationVerticalDirection
}

function parseHitLocationMillimeters(rawValue: FormDataEntryValue | null): number | null {
  if (typeof rawValue !== "string") return null
  const normalized = rawValue.trim().replace(",", ".")
  if (!normalized) return null
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 9999.99) return null
  return Math.round(parsed * 100) / 100
}

export function parseHitLocationFromFormData(
  formData: FormData
): ParsedHitLocationInput | null | "INVALID" {
  const horizontalMmRaw = formData.get("hitLocationHorizontalMm")
  const horizontalDirectionRaw = formData.get("hitLocationHorizontalDirection")
  const verticalMmRaw = formData.get("hitLocationVerticalMm")
  const verticalDirectionRaw = formData.get("hitLocationVerticalDirection")

  const hasAnyValue =
    (typeof horizontalMmRaw === "string" && horizontalMmRaw.trim() !== "") ||
    (typeof horizontalDirectionRaw === "string" && horizontalDirectionRaw.trim() !== "") ||
    (typeof verticalMmRaw === "string" && verticalMmRaw.trim() !== "") ||
    (typeof verticalDirectionRaw === "string" && verticalDirectionRaw.trim() !== "")

  if (!hasAnyValue) return null

  // Drei Zustaende sind noetig:
  // null = bewusst nicht gesetzt, INVALID = teilweise/ungueltig gesetzt.
  // So kann der aufrufende Code praezise zwischen "optional leer" und
  // "muss als Fehler behandelt werden" unterscheiden.
  const horizontalMm = parseHitLocationMillimeters(horizontalMmRaw)
  const verticalMm = parseHitLocationMillimeters(verticalMmRaw)
  if (horizontalMm === null || verticalMm === null) return "INVALID"

  if (
    typeof horizontalDirectionRaw !== "string" ||
    typeof verticalDirectionRaw !== "string" ||
    !HORIZONTAL_DIRECTION_VALUES.includes(
      horizontalDirectionRaw as HitLocationHorizontalDirection
    ) ||
    !VERTICAL_DIRECTION_VALUES.includes(verticalDirectionRaw as HitLocationVerticalDirection)
  ) {
    return "INVALID"
  }

  return {
    horizontalMm,
    horizontalDirection: horizontalDirectionRaw as HitLocationHorizontalDirection,
    verticalMm,
    verticalDirection: verticalDirectionRaw as HitLocationVerticalDirection,
  }
}
