import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from "@/lib/authValidation"
import {
  CreateUserSchema,
  revalidateAdminPaths,
  requireAdminSession,
  UpdateUserSchema,
} from "@/lib/admin/actions/shared"
import type { AdminActionResult } from "@/lib/admin/types"

async function ensureUniqueEmail(
  email: string,
  userId?: string
): Promise<AdminActionResult | null> {
  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true },
  })

  if (!existing) return null
  if (userId && existing.id === userId) return null

  return { error: "Diese E-Mail ist bereits vergeben." }
}

async function ensureNotLastActiveAdmin(
  role: "USER" | "ADMIN",
  isActive: boolean,
  changesAdminState: boolean
): Promise<AdminActionResult | null> {
  if (!(role === "ADMIN" && isActive && changesAdminState)) return null

  const activeAdminCount = await db.user.count({
    where: { role: "ADMIN", isActive: true },
  })
  if (activeAdminCount <= 1) {
    return { error: "Mindestens ein aktiver Admin muss vorhanden bleiben." }
  }

  return null
}

function validateOptionalTempPassword(tempPassword: string): AdminActionResult | null {
  if (tempPassword.length > 0 && tempPassword.length < MIN_PASSWORD_LENGTH) {
    return { error: `Temporäres Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen haben.` }
  }
  if (tempPassword.length > MAX_PASSWORD_LENGTH) {
    return { error: "Passwort ist zu lang." }
  }

  return null
}

export async function createUserAction(
  _prevState: AdminActionResult | null,
  formData: FormData
): Promise<AdminActionResult> {
  const admin = await requireAdminSession()
  if (!admin) return { error: "Keine Berechtigung." }

  const parsed = CreateUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    tempPassword: formData.get("tempPassword"),
    role: formData.get("role") ?? "USER",
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingaben." }
  }

  const email = parsed.data.email.toLowerCase()
  const emailConflict = await ensureUniqueEmail(email)
  if (emailConflict) return emailConflict

  const passwordHash = await bcrypt.hash(parsed.data.tempPassword, 12)

  await db.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
      role: parsed.data.role,
      isActive: true,
    },
  })

  revalidateAdminPaths()
  return { success: true }
}

export async function setUserActiveAction(
  userId: string,
  nextIsActive: boolean
): Promise<AdminActionResult> {
  const admin = await requireAdminSession()
  if (!admin) return { error: "Keine Berechtigung." }

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isActive: true },
  })
  if (!target) return { error: "Nutzer nicht gefunden." }

  if (admin.id === userId && nextIsActive === false) {
    return { error: "Der eigene Account kann nicht deaktiviert werden." }
  }

  const adminGuard = await ensureNotLastActiveAdmin(
    target.role,
    target.isActive,
    nextIsActive === false
  )
  if (adminGuard) return adminGuard

  if (target.isActive === nextIsActive) return { success: true }

  await db.user.update({
    where: { id: userId },
    data: { isActive: nextIsActive },
  })

  revalidateAdminPaths()
  return { success: true }
}

export async function updateUserAction(
  userId: string,
  _prevState: AdminActionResult | null,
  formData: FormData
): Promise<AdminActionResult> {
  const admin = await requireAdminSession()
  if (!admin) return { error: "Keine Berechtigung." }

  const target = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isActive: true, email: true },
  })
  if (!target) return { error: "Nutzer nicht gefunden." }

  const parsed = UpdateUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    isActive: String(formData.get("isActive")) === "true",
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Ungültige Eingaben." }
  }

  const email = parsed.data.email.toLowerCase()
  const emailConflict = await ensureUniqueEmail(email, userId)
  if (emailConflict) return emailConflict

  if (admin.id === userId && !parsed.data.isActive) {
    return { error: "Der eigene Account kann nicht deaktiviert werden." }
  }

  const adminGuard = await ensureNotLastActiveAdmin(
    target.role,
    target.isActive,
    parsed.data.role !== "ADMIN" || !parsed.data.isActive
  )
  if (adminGuard) return adminGuard

  const tempPassword = String(formData.get("tempPassword") ?? "")
  const passwordValidation = validateOptionalTempPassword(tempPassword)
  if (passwordValidation) return passwordValidation

  const passwordHash = tempPassword.length > 0 ? await bcrypt.hash(tempPassword, 12) : undefined

  await db.user.update({
    where: { id: userId },
    data: {
      name: parsed.data.name,
      email,
      role: parsed.data.role,
      isActive: parsed.data.isActive,
      ...(passwordHash ? { passwordHash } : {}),
      ...(passwordHash ? { sessionVersion: { increment: 1 } } : {}),
    },
  })

  revalidateAdminPaths()
  return { success: true }
}
