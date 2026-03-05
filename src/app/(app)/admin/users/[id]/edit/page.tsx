import { notFound, redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth-helpers"
import { getAdminUserById } from "@/lib/admin/actions"
import { AdminEditUserForm } from "@/components/app/admin/AdminEditUserForm"

export default async function AdminUserEditPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession()
  if (!session) redirect("/login")
  if (session.user.role !== "ADMIN") redirect("/dashboard")

  const { id } = await params
  const user = await getAdminUserById(id)
  if (!user) notFound()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nutzer bearbeiten</h1>
        <p className="text-muted-foreground">Name, Rolle, Status und optional Passwort anpassen.</p>
      </div>
      <AdminEditUserForm user={user} />
    </div>
  )
}
