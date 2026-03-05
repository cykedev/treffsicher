"use server"

import bcrypt from "bcryptjs"
import { db } from "@/lib/db"
import { getAuthSession } from "@/lib/auth-helpers"
import { validatePasswordChangeInput } from "@/lib/authValidation"

export type AccountActionResult = {
  error?: string
  success?: boolean
}

// Passwortwechsel bleibt serverseitig, damit Hash- und Session-Invaliderung atomar erfolgen.
export async function changeOwnPassword(
  _prevState: AccountActionResult | null,
  formData: FormData
): Promise<AccountActionResult> {
  const session = await getAuthSession()
  if (!session) return { error: "Nicht angemeldet." }

  const currentPassword = String(formData.get("currentPassword") ?? "")
  const newPassword = String(formData.get("newPassword") ?? "")
  const confirmPassword = String(formData.get("confirmPassword") ?? "")

  const validationError = validatePasswordChangeInput({
    currentPassword,
    newPassword,
    confirmPassword,
  })
  if (validationError) return { error: validationError }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, passwordHash: true },
  })
  if (!user) return { error: "Nutzer nicht gefunden." }

  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash)
  if (!isCurrentPasswordValid) {
    return { error: "Aktuelles Passwort ist falsch." }
  }

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await db.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      sessionVersion: { increment: 1 },
    },
  })

  return { success: true }
}
