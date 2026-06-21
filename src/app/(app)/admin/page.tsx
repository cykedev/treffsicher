import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth-helpers"
import { getAdminLoginRateLimitInsights, getAdminUsers } from "@/lib/admin/actions"
import { getDisplayTimeZone } from "@/lib/dateTime"
import { AdminLoginRateLimitInsightsPanel } from "@/components/app/admin/AdminLoginRateLimitInsights"
import { AdminLoginRateLimitTable } from "@/components/app/admin/AdminLoginRateLimitTable"
import { AdminUsersTable } from "@/components/app/admin/AdminUsersTable"
import { CreateItemLinkButton } from "@/components/app/sessions/CreateItemLinkButton"
import { PageHeader } from "@/components/app/shell/PageHeader"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function AdminPage() {
  const displayTimeZone = getDisplayTimeZone()
  const session = await getAuthSession()
  if (!session) redirect("/login")
  if (session.user.role !== "ADMIN") redirect("/dashboard")

  const [users, rateLimitInsights] = await Promise.all([
    getAdminUsers(),
    getAdminLoginRateLimitInsights(),
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nutzerverwaltung"
        description="Nutzer anzeigen, bearbeiten und Aktivität übersichtlich anhand der erfassten Daten sehen."
        action={
          <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:justify-end">
            <CreateItemLinkButton href="/admin/users/new" label="Neuer Nutzer" />
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Nutzerliste</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminUsersTable
            users={users}
            currentAdminId={session.user.id}
            displayTimeZone={displayTimeZone}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Aktive Login-Sperren ({rateLimitInsights.activeBlockedBuckets.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AdminLoginRateLimitTable
            buckets={rateLimitInsights.activeBlockedBuckets}
            displayTimeZone={displayTimeZone}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Login-Rate-Limit Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminLoginRateLimitInsightsPanel insights={rateLimitInsights} />
        </CardContent>
      </Card>
    </div>
  )
}
