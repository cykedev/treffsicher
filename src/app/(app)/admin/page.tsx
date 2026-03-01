import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus } from "lucide-react"
import { getAuthSession } from "@/lib/auth-helpers"
import { getAdminUsers } from "@/lib/admin/actions"
import { AdminUsersTable } from "@/components/app/AdminUsersTable"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function AdminPage() {
  const session = await getAuthSession()
  if (!session) redirect("/login")
  if (session.user.role !== "ADMIN") redirect("/dashboard")

  const users = await getAdminUsers()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nutzerverwaltung</h1>
          <p className="text-muted-foreground">
            Nutzer anzeigen, bearbeiten und bei Bedarf Passwort direkt im Nutzerprofil setzen.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <Link href="/admin/nutzer/neu">
              <Plus className="mr-1.5 h-4 w-4" />
              Neuer Nutzer
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nutzerliste</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminUsersTable users={users} currentAdminId={session.user.id} />
        </CardContent>
      </Card>
    </div>
  )
}
