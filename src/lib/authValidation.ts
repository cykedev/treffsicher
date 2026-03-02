export const MAX_USER_EMAIL_LENGTH = 320
export const MIN_PASSWORD_LENGTH = 12
export const MAX_PASSWORD_LENGTH = 200

export function normalizeLoginEmail(email: string): string | null {
  const normalized = email.trim().toLowerCase()
  if (!normalized) return null
  if (normalized.length > MAX_USER_EMAIL_LENGTH) return null
  return normalized
}

export type PasswordChangeValidationInput = {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

export function validatePasswordChangeInput(input: PasswordChangeValidationInput): string | null {
  if (!input.currentPassword) return "Bitte aktuelles Passwort angeben."
  if (!input.newPassword) return "Bitte neues Passwort angeben."
  if (!input.confirmPassword) return "Bitte Passwort-Bestätigung angeben."
  if (input.currentPassword.length > MAX_PASSWORD_LENGTH) return "Aktuelles Passwort ist zu lang."
  if (input.confirmPassword.length > MAX_PASSWORD_LENGTH) {
    return "Passwort-Bestätigung ist zu lang."
  }

  if (input.newPassword.length < MIN_PASSWORD_LENGTH) {
    return `Neues Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen haben.`
  }
  if (input.newPassword.length > MAX_PASSWORD_LENGTH) {
    return "Passwort ist zu lang."
  }
  if (input.newPassword !== input.confirmPassword) {
    return "Neues Passwort und Bestätigung stimmen nicht überein."
  }
  if (input.currentPassword === input.newPassword) {
    return "Neues Passwort muss sich vom aktuellen Passwort unterscheiden."
  }

  return null
}
