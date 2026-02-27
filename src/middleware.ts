export { default } from "next-auth/middleware"

// Alle Routen unter /(app)/ sind geschützt.
// Nicht eingeloggte Nutzer werden automatisch zur Login-Seite weitergeleitet.
// Die Route-Group-Klammern (app) erscheinen nicht in der URL,
// aber der Matcher muss das Dateisystem-Muster verwenden.
export const config = {
  matcher: [
    // Schützt alle Routen die im (app)-Ordner liegen
    "/dashboard/:path*",
    "/einheiten/:path*",
    "/disziplinen/:path*",
    "/statistiken/:path*",
    "/schuss-ablauf/:path*",
    "/ziele/:path*",
    "/admin/:path*",
  ],
}
