"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import {
  Crosshair,
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  Target,
  Goal,
  ListChecks,
  User,
  Shield,
  LogOut,
} from "lucide-react"

const baseNavLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/sessions", label: "Tagebuch", icon: BookOpen },
  { href: "/statistics", label: "Statistiken", icon: TrendingUp },
  { href: "/goals", label: "Ziele", icon: Goal },
  { href: "/shot-routines", label: "Ablauf", icon: ListChecks },
  { href: "/disciplines", label: "Disziplinen", icon: Target },
  { href: "/account", label: "Konto", icon: User },
]

// Haupt-Navigation der App.
// Client-Komponente weil usePathname() (aktiver Link) nur im Browser verfügbar ist.
export function Navigation() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const isAdmin = session?.user?.role === "ADMIN"
  const navLinks = isAdmin
    ? [...baseNavLinks, { href: "/admin", label: "Admin", icon: Shield }]
    : baseNavLinks

  return (
    <nav className="border-b border-border/50 bg-background">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-16 items-center gap-2">
          {/* App-Name / Logo */}
          <Link
            href="/dashboard"
            className="flex shrink-0 items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <Crosshair className="h-5 w-5 text-primary" />
            <span className="hidden lg:inline">Treffsicher</span>
          </Link>

          {/* Navigations-Links */}
          <div className="no-scrollbar min-w-0 flex-1 overflow-x-auto">
            <div className="flex w-max min-w-full items-center justify-center gap-0 px-0.5">
              {navLinks.map((link) => {
                const isActive = pathname.startsWith(link.href)
                const Icon = link.icon
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex min-h-11 min-w-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2.5 text-sm font-medium transition-colors md:px-2.5 lg:min-w-0 lg:justify-start lg:px-3 ${
                      isActive
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0 lg:h-4 lg:w-4" />
                    <span className="hidden lg:inline">{link.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Abmelden */}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex min-h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors sm:px-2.5 md:px-3 xl:min-w-0 xl:justify-start hover:bg-secondary/50 hover:text-foreground"
          >
            <LogOut className="h-5 w-5 shrink-0 xl:h-4 xl:w-4" />
            <span className="hidden xl:inline">Abmelden</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
