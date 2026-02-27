import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { db } from "@/lib/db"

// NextAuth v4 Konfiguration.
// Wir verwenden ausschliesslich Email/Passwort — kein OAuth, kein Magic Link.
// Das vereinfacht den Betrieb: keine externen Abhängigkeiten, keine E-Mail-Infrastruktur.
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Nutzer anhand der E-Mail suchen
        const user = await db.user.findUnique({
          where: { email: credentials.email },
        })

        // Kein Nutzer gefunden oder Passwort falsch — gleiche Fehlermeldung für beide Fälle
        // (verhindert User-Enumeration: kein Hinweis ob E-Mail existiert oder Passwort falsch ist)
        if (!user || !user.isActive) {
          return null
        }

        const passwordValid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!passwordValid) {
          return null
        }

        // Die zurückgegebenen Werte werden im JWT gespeichert und später in der Session verfügbar
        return {
          id: user.id,
          email: user.email,
          role: user.role,
        }
      },
    }),
  ],

  session: {
    strategy: "jwt",
  },

  callbacks: {
    // JWT-Callback: Rolle und ID in den Token schreiben, damit sie in der Session verfügbar sind
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { id: string; email: string; role: string }).role
      }
      return token
    },

    // Session-Callback: id und role aus dem Token in die Session übertragen
    // Ohne das wären id und role nur im Token, nicht in session.user verfügbar
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },

  pages: {
    // Eigene Login-Seite statt der Standard-NextAuth-Seite
    signIn: "/login",
  },
}
