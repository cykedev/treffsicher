// NextAuth v4 erweitert die eingebauten Typen über Module Augmentation.
// Ohne diese Datei würde TypeScript bei session.user.id und session.user.role
// einen Fehler melden, da diese Felder im Standard-Typ nicht vorhanden sind.
import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
  }
}
