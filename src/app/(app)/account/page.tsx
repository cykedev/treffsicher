import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth-helpers"
import { AccountPasswordForm } from "@/components/app/account/AccountPasswordForm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/app/shell/PageHeader"

export default async function AccountPage() {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  return (
    <div className="space-y-6">
      <PageHeader
        title="Konto"
        description="Ändere dein Passwort. Nach dem Speichern wirst du aus Sicherheitsgründen abgemeldet."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Passwort ändern</CardTitle>
        </CardHeader>
        <CardContent>
          <AccountPasswordForm />
        </CardContent>
      </Card>
    </div>
  )
}
