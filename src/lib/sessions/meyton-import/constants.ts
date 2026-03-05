export const WERTUNG_DATETIME_REGEX = /Wertung\s+(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/i
export const PROBE_DATETIME_REGEX = /Probe\s+(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/i
export const GENERIC_DATETIME_GLOBAL_REGEX = /(\d{2})\.(\d{2})\.(\d{4})\s+(\d{2}):(\d{2})/g
export const HIT_LOCATION_REGEX =
  /Trefferlage\s*:?\s*([0-9]+(?:[.,][0-9]+)?)\s*mm\s*(rechts|links)\s*,\s*([0-9]+(?:[.,][0-9]+)?)\s*mm\s*(hoch|tief)/i
export const SERIES_HEADER_REGEX = /Serie\s+(\d+)\s*:/i
export const SERIES_HEADER_GLOBAL_REGEX = /Serie\s+(\d+)\s*:/gi
export const SHOT_TOKEN_REGEX = /(^|[^0-9])(\d{1,2}(?:\.\d)?)(?:\*|T)?(?!\d)/g

export const MAX_INFLATED_STREAM_BYTES = 2 * 1024 * 1024
export const MAX_TOTAL_INFLATED_BYTES = 8 * 1024 * 1024
export const MAX_EXTRACTED_TEXT_TOKENS = 25_000

export const STOP_KEYWORDS = [
  "trefferlage",
  "streuwert",
  "ergebnis",
  "serien:",
  "zaehler",
  "innenzehner",
  "weiteste",
  "teiler",
  "gedruckt am",
  "id:",
  "seite:",
]
