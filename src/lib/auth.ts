import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { isIP } from "node:net"
import { db } from "@/lib/db"
import {
  checkLoginAllowed,
  clearSuccessfulLoginAttempts,
  registerFailedLoginAttempt,
} from "@/lib/auth-rate-limit"
import { normalizeLoginEmail } from "@/lib/authValidation"

const TRUST_PROXY_HEADERS_FOR_RATE_LIMIT = process.env.AUTH_TRUST_PROXY_HEADERS === "true"
const MAX_IP_HEADER_LENGTH = 512

function getHeaderValue(
  headers: Record<string, unknown> | undefined,
  headerName: string
): string | null {
  if (!headers) return null

  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== headerName.toLowerCase()) continue

    if (typeof value === "string") return value
    if (Array.isArray(value)) {
      const firstString = value.find((entry): entry is string => typeof entry === "string")
      return firstString ?? null
    }
  }

  return null
}

function parseClientIpCandidate(value: string): string | null {
  const candidate = value.trim()
  if (!candidate || candidate.length > MAX_IP_HEADER_LENGTH) return null

  if (isIP(candidate)) return candidate

  // IPv6 mit Port kann in Headern als "[2001:db8::1]:443" auftauchen.
  if (candidate.startsWith("[") && candidate.includes("]")) {
    const end = candidate.indexOf("]")
    const ipv6 = candidate.slice(1, end)
    if (isIP(ipv6) === 6) return ipv6
  }

  // IPv4 mit Port: "203.0.113.7:443"
  if (candidate.includes(".")) {
    const portSeparator = candidate.lastIndexOf(":")
    if (portSeparator > 0) {
      const ipv4 = candidate.slice(0, portSeparator)
      if (isIP(ipv4) === 4) return ipv4
    }
  }

  return null
}

function extractTrustedIpFromHeader(rawHeader: string | null): string | null {
  if (!rawHeader) return null
  if (rawHeader.length > MAX_IP_HEADER_LENGTH) return null

  for (const part of rawHeader.split(",")) {
    const parsed = parseClientIpCandidate(part)
    if (parsed) return parsed
  }

  return null
}

function extractClientIpHeader(req: { headers?: Record<string, unknown> }): string | null {
  if (!TRUST_PROXY_HEADERS_FOR_RATE_LIMIT) {
    return null
  }

  const realIp = getHeaderValue(req.headers, "x-real-ip")
  const parsedRealIp = extractTrustedIpFromHeader(realIp)
  if (parsedRealIp) return parsedRealIp

  const forwardedFor = getHeaderValue(req.headers, "x-forwarded-for")
  const parsedForwardedFor = extractTrustedIpFromHeader(forwardedFor)
  if (parsedForwardedFor) return parsedForwardedFor

  return null
}

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
      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        const email = normalizeLoginEmail(credentials.email)
        if (!email) {
          return null
        }

        const ipHeaderValue = extractClientIpHeader(req)
        const rateLimitState = checkLoginAllowed(email, ipHeaderValue)
        if (!rateLimitState.allowed) {
          return null
        }

        // Nutzer anhand der E-Mail suchen
        const user = await db.user.findUnique({
          where: { email },
        })

        // Kein Nutzer gefunden oder Passwort falsch — gleiche Fehlermeldung für beide Fälle
        // (verhindert User-Enumeration: kein Hinweis ob E-Mail existiert oder Passwort falsch ist)
        if (!user || !user.isActive) {
          registerFailedLoginAttempt(rateLimitState.normalizedEmail, rateLimitState.normalizedIp)
          return null
        }

        const passwordValid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!passwordValid) {
          registerFailedLoginAttempt(rateLimitState.normalizedEmail, rateLimitState.normalizedIp)
          return null
        }

        clearSuccessfulLoginAttempts(rateLimitState.normalizedEmail)

        // Die zurückgegebenen Werte werden im JWT gespeichert und später in der Session verfügbar
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          sessionVersion: user.sessionVersion,
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
        const authUser = user as {
          id: string
          role: string
          name?: string | null
          sessionVersion?: number
        }
        token.id = authUser.id
        token.role = authUser.role
        token.name = authUser.name ?? null
        token.sessionVersion = authUser.sessionVersion ?? 0
      }
      return token
    },

    // Session-Callback: id und role aus dem Token in die Session übertragen
    // Ohne das wären id und role nur im Token, nicht in session.user verfügbar
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.name = (token.name as string | null | undefined) ?? null
        session.user.sessionVersion =
          typeof token.sessionVersion === "number" ? token.sessionVersion : -1
      }
      return session
    },
  },

  pages: {
    // Eigene Login-Seite statt der Standard-NextAuth-Seite
    signIn: "/login",
  },
}
