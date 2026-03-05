import { isIP } from "node:net"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { getAuthSession } from "@/lib/auth-helpers"
import {
  MAX_PASSWORD_LENGTH,
  MAX_USER_EMAIL_LENGTH,
  MIN_PASSWORD_LENGTH,
} from "@/lib/authValidation"
import type { AdminLoginRateLimitBucket } from "@/lib/admin/types"

export const TOP_NOISY_WINDOW_HOURS = 24
export const TOP_NOISY_LIMIT = 10

export const CreateUserSchema = z.object({
  name: z.string().trim().min(1, "Bitte einen Namen angeben.").max(120, "Name ist zu lang."),
  email: z
    .string()
    .trim()
    .max(MAX_USER_EMAIL_LENGTH, "E-Mail ist zu lang.")
    .email("Bitte eine gültige E-Mail angeben."),
  tempPassword: z
    .string()
    .min(
      MIN_PASSWORD_LENGTH,
      `Temporäres Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen haben.`
    )
    .max(MAX_PASSWORD_LENGTH, "Passwort ist zu lang."),
  role: z.enum(["USER", "ADMIN"] as const).default("USER"),
})

export const UpdateUserSchema = z.object({
  name: z.string().trim().min(1, "Bitte einen Namen angeben.").max(120, "Name ist zu lang."),
  email: z
    .string()
    .trim()
    .max(MAX_USER_EMAIL_LENGTH, "E-Mail ist zu lang.")
    .email("Bitte eine gültige E-Mail angeben."),
  role: z.enum(["USER", "ADMIN"] as const),
  isActive: z.boolean(),
})

export const LoginRateLimitBucketKeySchema = z
  .string()
  .trim()
  .min(1, "Ungültiger Rate-Limit-Schlüssel.")
  .max(400, "Ungültiger Rate-Limit-Schlüssel.")
  .refine((value) => parseLoginRateLimitKey(value) !== null, "Ungültiger Rate-Limit-Schlüssel.")

export type LoginRateLimitBucketRow = {
  key: string
  attempts: number
  windowStartedAt: Date
  blockedUntil: Date | null
  lastAttemptAt: Date
}

export async function requireAdminSession(): Promise<{ id: string } | null> {
  const session = await getAuthSession()
  if (!session || session.user.role !== "ADMIN") {
    return null
  }

  return { id: session.user.id }
}

export function revalidateAdminPaths(): void {
  // Layout-Revalidation deckt /admin und alle Unterseiten ab.
  revalidatePath("/admin", "layout")
}

function parseLoginRateLimitKey(
  key: string
): { type: AdminLoginRateLimitBucket["type"]; identifier: string } | null {
  if (key.startsWith("email:")) {
    const identifier = key.slice("email:".length)
    if (!identifier || identifier.length > MAX_USER_EMAIL_LENGTH) {
      return null
    }
    return { type: "EMAIL", identifier }
  }

  if (key.startsWith("ip:")) {
    const identifier = key.slice("ip:".length)
    if (!identifier || isIP(identifier) === 0) {
      return null
    }
    return { type: "IP", identifier }
  }

  return null
}

export function mapLoginRateLimitRowToAdminBucket(
  row: LoginRateLimitBucketRow
): AdminLoginRateLimitBucket | null {
  const parsedKey = parseLoginRateLimitKey(row.key)
  if (!parsedKey) return null

  return {
    key: row.key,
    type: parsedKey.type,
    identifier: parsedKey.identifier,
    attempts: row.attempts,
    windowStartedAt: row.windowStartedAt,
    blockedUntil: row.blockedUntil,
    lastAttemptAt: row.lastAttemptAt,
  }
}
