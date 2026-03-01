import { redirect } from "next/navigation"
import Link from "next/link"
import { getAuthSession } from "@/lib/auth-helpers"
import { createGoalAndRedirect } from "@/lib/goals/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export default async function NeuesZielPage() {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Neues Ziel</h1>
        <p className="text-muted-foreground">Ergebnis- oder Prozessziel für die Saison anlegen.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Zieldaten</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createGoalAndRedirect} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">Titel</Label>
                <Input id="title" name="title" required placeholder="z.B. 360+ im Wettkampf" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Typ</Label>
                <select
                  id="type"
                  name="type"
                  required
                  defaultValue="RESULT"
                  className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
                >
                  <option value="RESULT">Ergebnisziel</option>
                  <option value="PROCESS">Prozessziel</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung (optional)</Label>
              <Textarea id="description" name="description" rows={2} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="dateFrom">Von</Label>
                <Input id="dateFrom" name="dateFrom" type="date" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo">Bis</Label>
                <Input id="dateTo" name="dateTo" type="date" required />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="submit">Ziel anlegen</Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/ziele">Abbrechen</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
