import { redirect } from "next/navigation"
import { getAuthSession } from "@/lib/auth-helpers"
import { AccountPasswordForm } from "@/components/app/AccountPasswordForm"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function AccountPage() {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Konto</h1>
        <p className="text-muted-foreground">
          Ändere dein Passwort. Nach dem Speichern wirst du aus Sicherheitsgründen abgemeldet.
        </p>
      </div>

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
