import { notFound, redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth-helpers"
import { getAdminUserById } from "@/lib/admin/actions"
import { AdminEditUserForm } from "@/components/app/admin/AdminEditUserForm"
import { PageHeader } from "@/components/app/shell/PageHeader"

export default async function AdminUserEditPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getAuthSession()
  if (!session) redirect("/login")
  if (session.user.role !== "ADMIN") redirect("/dashboard")

  const { id } = await params
  const user = await getAdminUserById(id)
  if (!user) notFound()

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nutzer bearbeiten"
        description="Name, Rolle, Status und optional Passwort anpassen."
      />
      <AdminEditUserForm user={user} />
    </div>
  )
}
