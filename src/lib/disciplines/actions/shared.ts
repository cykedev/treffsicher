import { revalidatePath } from "next/cache"
import type { Session } from "next-auth"
import { z } from "zod"
import { getAuthSession } from "@/lib/auth-helpers"

export const CreateDisciplineSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich").max(100, "Name zu lang"),
  seriesCount: z
    .number({ message: "Anzahl Serien muss eine Zahl sein" })
    .int()
    .min(1, "Mindestens 1 Serie")
    .max(20, "Maximal 20 Serien"),
  shotsPerSeries: z
    .number({ message: "Schuss pro Serie muss eine Zahl sein" })
    .int()
    .min(1, "Mindestens 1 Schuss")
    .max(60, "Maximal 60 Schuss"),
  practiceSeries: z
    .number({ message: "Probe-Serien muss eine Zahl sein" })
    .int()
    .min(0)
    .max(5)
    .default(0),
  scoringType: z.enum(["WHOLE", "TENTH"] as const, {
    message: "Ungültige Wertungsart",
  }),
  isSystem: z.boolean().default(false),
})

export async function requireAuthSession(): Promise<Session | null> {
  return getAuthSession()
}

export function parseDisciplineFormData(formData: FormData, isSystem: boolean) {
  return CreateDisciplineSchema.safeParse({
    name: formData.get("name"),
    seriesCount: Number(formData.get("seriesCount")),
    shotsPerSeries: Number(formData.get("shotsPerSeries")),
    practiceSeries: Number(formData.get("practiceSeries") ?? 0),
    scoringType: formData.get("scoringType"),
    isSystem,
  })
}

export function mapValidationErrors(error: z.ZodError): Record<string, string[]> {
  return error.flatten().fieldErrors as Record<string, string[]>
}

export function canManageDiscipline(
  session: Session,
  discipline: { ownerId: string | null; isSystem: boolean }
): boolean {
  // System-Disziplinen nur für Admins, private Disziplinen nur für den Besitzer.
  const canManageSystem = discipline.isSystem && session.user.role === "ADMIN"
  const canManageOwn = !discipline.isSystem && discipline.ownerId === session.user.id
  return canManageSystem || canManageOwn
}

export function revalidateDisciplinePaths(): void {
  revalidatePath("/disciplines")
  revalidatePath("/sessions", "layout")
}
