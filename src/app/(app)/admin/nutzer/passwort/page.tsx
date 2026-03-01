import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth-helpers"

export default async function AdminPasswordResetPage() {
  const session = await getAuthSession()
  if (!session) redirect("/login")
  if (session.user.role !== "ADMIN") redirect("/dashboard")
  redirect("/admin")
}
