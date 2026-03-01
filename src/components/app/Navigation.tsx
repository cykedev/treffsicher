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
  Shield,
  LogOut,
} from "lucide-react"

const baseNavLinks = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/einheiten", label: "Tagebuch", icon: BookOpen },
  { href: "/statistiken", label: "Statistiken", icon: TrendingUp },
  { href: "/ziele", label: "Ziele", icon: Goal },
  { href: "/disziplinen", label: "Disziplinen", icon: Target },
  { href: "/schuss-ablauf", label: "Ablauf", icon: ListChecks },
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
        <div className="flex h-16 items-center justify-between">
          {/* App-Name / Logo */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <Crosshair className="h-5 w-5 text-primary" />
            <span className="hidden lg:inline">Treffsicher</span>
          </Link>

          {/* Navigations-Links */}
          <div className="flex items-center gap-0">
            {navLinks.map((link) => {
              const isActive = pathname.startsWith(link.href)
              const Icon = link.icon
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium transition-colors md:px-2.5 lg:px-3 ${
                    isActive
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="hidden lg:inline">{link.label}</span>
                </Link>
              )
            })}
          </div>

          {/* Abmelden */}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 rounded-md px-2 py-2 text-sm font-medium text-muted-foreground transition-colors sm:px-2.5 md:px-3 hover:bg-secondary/50 hover:text-foreground"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="hidden xl:inline">Abmelden</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
