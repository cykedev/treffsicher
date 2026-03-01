import { getAuthSession } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus, BookOpen, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const quickActions = [
  {
    title: "Neue Einheit",
    description: "Training, Wettkampf oder Trockentraining erfassen.",
    icon: Plus,
    href: "/einheiten/neu",
    buttonLabel: "Einheit erfassen",
    buttonVariant: "default" as const,
  },
  {
    title: "Tagebuch",
    description: "Alle bisherigen Einheiten ansehen und auswerten.",
    icon: BookOpen,
    href: "/einheiten",
    buttonLabel: "Zum Tagebuch",
    buttonVariant: "outline" as const,
  },
  {
    title: "Statistiken",
    description: "Ergebnisverlauf, Serienanalyse und Befinden-Korrelation.",
    icon: TrendingUp,
    href: "/statistiken",
    buttonLabel: "Statistiken öffnen",
    buttonVariant: "outline" as const,
  },
]

// Dashboard-Seite: Einstiegspunkt nach dem Login.
export default async function DashboardPage() {
  const session = await getAuthSession()
  if (!session) redirect("/login")

  const displayName = session.user.name ?? session.user.email

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Willkommen, {displayName}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {quickActions.map((action) => {
          const Icon = action.icon
          return (
            <Card key={action.href}>
              <CardHeader>
                <Icon className="mb-1 h-7 w-7 text-muted-foreground" />
                <CardTitle className="text-base">{action.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{action.description}</p>
                <Button variant={action.buttonVariant} asChild>
                  <Link href={action.href}>{action.buttonLabel}</Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
