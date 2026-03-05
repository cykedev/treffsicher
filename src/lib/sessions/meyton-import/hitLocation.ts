import { HIT_LOCATION_REGEX } from "@/lib/sessions/meyton-import/constants"
import type {
  MeytonHitLocation,
  MeytonHorizontalDirection,
  MeytonVerticalDirection,
} from "@/lib/sessions/meyton-import/types"

function parseMeytonMillimeterValue(value: string): number | null {
  const normalized = value.replace(",", ".").trim()
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null

  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed < 0) return null

  return Math.round(parsed * 100) / 100
}

export function extractMeytonHitLocation(rawText: string): MeytonHitLocation | null {
  const match = rawText.match(HIT_LOCATION_REGEX)
  if (!match) return null

  const horizontalMm = parseMeytonMillimeterValue(match[1] ?? "")
  const verticalMm = parseMeytonMillimeterValue(match[3] ?? "")
  if (horizontalMm === null || verticalMm === null) return null

  const horizontalLabel = (match[2] ?? "").toLowerCase()
  const verticalLabel = (match[4] ?? "").toLowerCase()

  let horizontalDirection: MeytonHorizontalDirection
  if (horizontalLabel === "links") {
    horizontalDirection = "LEFT"
  } else if (horizontalLabel === "rechts") {
    horizontalDirection = "RIGHT"
  } else {
    return null
  }

  let verticalDirection: MeytonVerticalDirection
  if (verticalLabel === "hoch") {
    verticalDirection = "HIGH"
  } else if (verticalLabel === "tief") {
    verticalDirection = "LOW"
  } else {
    return null
  }

  return {
    horizontalMm,
    horizontalDirection,
    verticalMm,
    verticalDirection,
  }
}
