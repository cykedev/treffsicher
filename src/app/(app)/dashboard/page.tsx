import { getAuthSession } from "@/lib/auth-helpers"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus, BookOpen, TrendingUp, Goal, Target, ListChecks } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

const quickActions = [
  {
    title: "Neue Einheit",
    description: "Erfasse Training, Wettkampf, Trockentraining oder Mentaltraining.",
    icon: Plus,
    href: "/sessions/new",
    buttonLabel: "Einheit erfassen",
    buttonVariant: "default" as const,
  },
  {
    title: "Tagebuch",
    description: "Filtere Einheiten, öffne Details und verfolge deine Entwicklung.",
    icon: BookOpen,
    href: "/sessions",
    buttonLabel: "Zum Tagebuch",
    buttonVariant: "outline" as const,
  },
  {
    title: "Statistiken",
    description: "Vergleiche Verläufe, Korrelationen, Schussverteilung und Prognose/Feedback.",
    icon: TrendingUp,
    href: "/statistics",
    buttonLabel: "Statistiken öffnen",
    buttonVariant: "outline" as const,
  },
  {
    title: "Ziele",
    description: "Lege Ziele an und markiere Einheiten, die darauf einzahlen.",
    icon: Goal,
    href: "/goals",
    buttonLabel: "Ziele öffnen",
    buttonVariant: "outline" as const,
  },
  {
    title: "Ablauf",
    description: "Lege Abläufe mit ihren Schritten an und verfeinere sie laufend.",
    icon: ListChecks,
    href: "/shot-routines",
    buttonLabel: "Ablauf öffnen",
    buttonVariant: "outline" as const,
  },
  {
    title: "Disziplinen",
    description: "Pflege System- und eigene Disziplinen, setze Favoriten und archiviere bei Bedarf.",
    icon: Target,
    href: "/disciplines",
    buttonLabel: "Disziplinen öffnen",
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
