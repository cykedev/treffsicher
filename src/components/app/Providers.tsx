"use client"

import { SessionProvider } from "next-auth/react"

interface Props {
  children: React.ReactNode
}

// SessionProvider muss eine Client-Komponente sein, da er Browser-State verwaltet.
// Durch Auslagern in eine separate Datei bleibt das Root-Layout eine Server-Komponente.
export function Providers({ children }: Props) {
  return <SessionProvider>{children}</SessionProvider>
}
