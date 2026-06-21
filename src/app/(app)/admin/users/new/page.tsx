import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth-helpers"
import { AdminCreateUserForm } from "@/components/app/admin/AdminCreateUserForm"
import { PageHeader } from "@/components/app/shell/PageHeader"

export default async function AdminUserCreatePage() {
  const session = await getAuthSession()
  if (!session) redirect("/login")
  if (session.user.role !== "ADMIN") redirect("/dashboard")

  return (
    <div className="space-y-6">
      <PageHeader
        title="Neuer Nutzer"
        description="Neues Konto mit Name und temporärem Passwort anlegen."
      />
      <AdminCreateUserForm />
    </div>
  )
}
