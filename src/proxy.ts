import { withAuth } from "next-auth/middleware"

// Next.js 16 nutzt die Datei-Konvention "proxy.ts" statt "middleware.ts".
// Next.js erwartet hier eine benannte `proxy`-Funktion oder default function.
export const proxy = withAuth({
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized: ({ req, token }) => {
      // Alle geschützten Routen erfordern Login.
      if (!token) return false

      // /admin nur für ADMIN-Rolle erlauben.
      if (req.nextUrl.pathname.startsWith("/admin")) {
        return token.role === "ADMIN"
      }

      return true
    },
  },
})

export default proxy

// Alle Routen unter /(app)/ sind geschützt.
// Nicht eingeloggte Nutzer werden automatisch zur Login-Seite weitergeleitet.
// Die Route-Group-Klammern (app) erscheinen nicht in der URL,
// aber der Matcher muss das Dateisystem-Muster verwenden.
export const config = {
  matcher: [
    // Schützt alle Routen die im (app)-Ordner liegen
    "/dashboard/:path*",
    "/sessions/:path*",
    "/disciplines/:path*",
    "/statistics/:path*",
    "/shot-routines/:path*",
    "/goals/:path*",
    "/admin/:path*",
  ],
}
