import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth-helpers"
import { AdminCreateUserForm } from "@/components/app/AdminCreateUserForm"

export default async function AdminUserCreatePage() {
  const session = await getAuthSession()
  if (!session) redirect("/login")
  if (session.user.role !== "ADMIN") redirect("/dashboard")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Neuer Nutzer</h1>
        <p className="text-muted-foreground">
          Neues Konto mit Name und temporaerem Passwort anlegen.
        </p>
      </div>
      <AdminCreateUserForm />
    </div>
  )
}
