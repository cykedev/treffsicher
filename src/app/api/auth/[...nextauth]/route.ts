import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth"

// NextAuth v4 Route Handler für App Router.
// Alle /api/auth/* Anfragen (login, logout, session) werden hier behandelt.
const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
