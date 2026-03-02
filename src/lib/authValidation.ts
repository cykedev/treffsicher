export const MAX_USER_EMAIL_LENGTH = 320

export function normalizeLoginEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return null
  if (normalized.length > MAX_USER_EMAIL_LENGTH) return null
  return normalized
}
