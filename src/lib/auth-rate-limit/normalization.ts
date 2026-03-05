import { isIP } from "node:net"

const MAX_NORMALIZED_EMAIL_LENGTH = 320
const MAX_NORMALIZED_IP_LENGTH = 64

export function emailKey(email: string): string {
  return `email:${email}`
}

export function ipKey(ip: string): string {
  return `ip:${ip}`
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase().slice(0, MAX_NORMALIZED_EMAIL_LENGTH)
}

export function normalizeIpHeaderValue(ipHeaderValue?: string | null): string | null {
  if (!ipHeaderValue) return null

  const firstValue = ipHeaderValue.split(",")[0]
  const normalized = firstValue?.trim()
  if (!normalized || normalized.length > MAX_NORMALIZED_IP_LENGTH) return null
  return isIP(normalized) ? normalized : null
}
