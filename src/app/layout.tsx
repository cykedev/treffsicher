import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import "./globals.css"
import { Providers } from "@/components/app/Providers"
import { runStartup } from "@/lib/startup"

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export const metadata: Metadata = {
  title: "Treffsicher",
  description: "Trainingsunterstützung für Schiesssportler",
}

// Root-Layout ist eine Server-Komponente und wird nur einmal pro Request ausgeführt.
// runStartup() prüft beim ersten App-Start ob ein Admin angelegt werden muss.
// Die Funktion bricht früh ab wenn bereits ein Admin existiert (hasRun-Flag).
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  await runStartup()

  return (
    <html lang="de" className="dark" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
