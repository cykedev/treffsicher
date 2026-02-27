"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"

const navLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/einheiten", label: "Tagebuch" },
  { href: "/disziplinen", label: "Disziplinen" },
]

// Haupt-Navigation der App.
// Client-Komponente weil usePathname() (aktiver Link) nur im Browser verfügbar ist.
export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="border-b bg-background">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex h-14 items-center justify-between">
          {/* App-Name / Logo */}
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight">
            Treffsicher
          </Link>

          {/* Navigations-Links */}
          <div className="flex items-center gap-1">
            {navLinks.map((link) => {
              // Aktiver Zustand: Link ist aktiv wenn der aktuelle Pfad mit dem href beginnt
              const isActive = pathname.startsWith(link.href)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>

          {/* Abmelden */}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-secondary-foreground"
          >
            Abmelden
          </button>
        </div>
      </div>
    </nav>
  )
}
