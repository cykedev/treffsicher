"use server"

import bcrypt from "bcryptjs"
import { z } from "zod"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"
import { getAuthSession } from "@/lib/auth-helpers"
import { MAX_USER_EMAIL_LENGTH } from "@/lib/authValidation"
import type { ScoringType, UserRole } from "@/generated/prisma/client"

export type AdminActionResult = {
  error?: string
  success?: boolean
}

export type AdminUserSummary = {
  id: string
  name: string | null
  email: string
  role: UserRole
  isActive: boolean
  createdAt: Date
}

export type AdminSystemDisciplineSummary = {
  id: string
  name: string
  seriesCount: number
  shotsPerSeries: number
  practiceSeries: number
  scoringType: ScoringType
  isArchived: boolean
  createdAt: Date
  updatedAt: Date
}

const CreateUserSchema = z.object({
  name: z.string().trim().min(1, "Bitte einen Namen angeben.").max(120, "Name ist zu lang."),
  email: z
    .string()
    .trim()
    .max(MAX_USER_EMAIL_LENGTH, "E-Mail ist zu lang.")
    .email("Bitte eine gueltige E-Mail angeben."),
  tempPassword: z
    .string()
    .min(12, "Temporaeres Passwort muss mindestens 12 Zeichen haben.")
    .max(200, "Passwort ist zu lang."),
  role: z.enum(["USER", "ADMIN"] as const).default("USER"),
})

const UpdateUserSchema = z.object({
  name: z.string().trim().min(1, "Bitte einen Namen angeben.").max(120, "Name ist zu lang."),
  email: z
    .string()
    .trim()
    .max(MAX_USER_EMAIL_LENGTH, "E-Mail ist zu lang.")
    .email("Bitte eine gueltige E-Mail angeben."),
  role: z.enum(["USER", "ADMIN"] as const),
  isActive: z.boolean(),
})

async function requireAdminSession(): Promise<{ id: string } | null> {
  const session = await getAuthSession()
  if (!session || session.user.role !== "ADMIN") {
    return null
  }
  return { id: session.user.id }
}

function revalidateAdminPaths(): void {
  // Layout-Revalidation deckt /admin und alle Unterseiten ab.
  revalidatePath("/admin", "layout")
}

/**
 * Gibt alle Nutzer für die Admin-Verwaltung zurueck (ohne Passwort-Hashes).
 */
export async function getAdminUsers(): Promise<AdminUserSummary[]> {
  const admin = await requireAdminSession()
  if (!admin) return []

  return db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
  })
}

/**
 * Gibt einen einzelnen Nutzer fuer die Bearbeitungsseite zurueck.
 */
export async function getAdminUserById(userId: string): Promise<AdminUserSummary | null> {
  const admin = await requireAdminSession()
  if (!admin) return null

  return db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  })
}

/**
 * Gibt alle System-Disziplinen für die Admin-Verwaltung zurueck.
 */
export async function getAdminSystemDisciplines(): Promise<AdminSystemDisciplineSummary[]> {
  const admin = await requireAdminSession()
  if (!admin) return []

  return db.discipline.findMany({
    where: { isSystem: true },
    select: {
      id: true,
      name: true,
      seriesCount: true,
      shotsPerSeries: true,
      practiceSeries: true,
      scoringType: true,
      isArchived: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [{ isArchived: "asc" }, { name: "asc" }],
  })
}

/**
 * Legt einen neuen Nutzer (USER oder ADMIN) mit temporaerem Passwort an.
 */
export async function createUser(
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
    return { error: parsed.error.issues[0]?.message ?? "Ungueltige Eingaben." }
  }

  const email = parsed.data.email.toLowerCase()
  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true },
  })
  if (existing) {
    return { error: "Diese E-Mail ist bereits vergeben." }
  }

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

/**
 * Aktiviert oder deaktiviert einen Nutzer.
 */
export async function setUserActive(
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

  // Selbst-Deaktivierung verhindern, damit der Admin sich nicht aussperrt.
  if (admin.id === userId && nextIsActive === false) {
    return { error: "Der eigene Account kann nicht deaktiviert werden." }
  }

  // Verhindert, dass der letzte aktive Admin deaktiviert wird.
  if (target.role === "ADMIN" && nextIsActive === false) {
    const activeAdminCount = await db.user.count({
      where: { role: "ADMIN", isActive: true },
    })
    if (activeAdminCount <= 1) {
      return { error: "Mindestens ein aktiver Admin muss vorhanden bleiben." }
    }
  }

  if (target.isActive === nextIsActive) {
    return { success: true }
  }

  await db.user.update({
    where: { id: userId },
    data: { isActive: nextIsActive },
  })

  revalidateAdminPaths()
  return { success: true }
}

/**
 * Aktualisiert E-Mail, Rolle und Status eines Nutzers.
 * Optional kann in derselben Aktion ein neues temporaeres Passwort gesetzt werden.
 */
export async function updateUser(
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
    return { error: parsed.error.issues[0]?.message ?? "Ungueltige Eingaben." }
  }

  const email = parsed.data.email.toLowerCase()
  const existing = await db.user.findUnique({
    where: { email },
    select: { id: true },
  })
  if (existing && existing.id !== userId) {
    return { error: "Diese E-Mail ist bereits vergeben." }
  }

  if (admin.id === userId && !parsed.data.isActive) {
    return { error: "Der eigene Account kann nicht deaktiviert werden." }
  }

  // Schuetzt den letzten aktiven Admin bei Deaktivierung oder Rollenwechsel.
  if (
    target.role === "ADMIN" &&
    target.isActive &&
    (parsed.data.role !== "ADMIN" || !parsed.data.isActive)
  ) {
    const activeAdminCount = await db.user.count({
      where: { role: "ADMIN", isActive: true },
    })
    if (activeAdminCount <= 1) {
      return { error: "Mindestens ein aktiver Admin muss vorhanden bleiben." }
    }
  }

  const tempPassword = String(formData.get("tempPassword") ?? "")
  if (tempPassword.length > 0 && tempPassword.length < 12) {
    return { error: "Temporaeres Passwort muss mindestens 12 Zeichen haben." }
  }
  if (tempPassword.length > 200) {
    return { error: "Passwort ist zu lang." }
  }

  const passwordHash = tempPassword.length > 0 ? await bcrypt.hash(tempPassword, 12) : undefined

  await db.user.update({
    where: { id: userId },
    data: {
      name: parsed.data.name,
      email,
      role: parsed.data.role,
      isActive: parsed.data.isActive,
      ...(passwordHash ? { passwordHash } : {}),
    },
  })

  revalidateAdminPaths()
  return { success: true }
}
