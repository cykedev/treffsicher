# Baseline-Angleichung — Kanon (Treffsicher × Ringwerk)

> Verbindlicher Kanon für den Tier-4-Baseline-Pass. Zwei Impl-Agenten (je ein Repo) setzen das um.
> Prettier: `semi:false`, double quotes, `printWidth:100`. Deutsch in UI/Kommentaren, Englisch für Identifier.
> Dateien <200 Zeilen, kein `any`, kein `console.log`. KEIN git commit.

## 1. Geteilte `PageHeader` (byte-identisch in beiden Repos)

Pfad: `src/components/app/shell/PageHeader.tsx`

```tsx
import type { ReactNode } from "react"

interface Props {
  // Seitentitel (deutsch).
  title: string
  // Optionaler Untertitel.
  description?: string
  // Optionale Aktion rechts (z.B. Anlegen-Button).
  action?: ReactNode
}

// Einheitlicher Seitenkopf: Titel + optionaler Untertitel, optionale Aktion rechts.
export function PageHeader({ title, description, action }: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}
```

Kanon-Entscheidung: `font-semibold` (nicht `font-bold`), Untertitel `text-sm text-muted-foreground`.

Anwendung: ALLE Listen-/Detail-/Konto-Seitenköpfe (h1 + Untertitel + optionale Aktion) in beiden Apps
auf `PageHeader` umstellen. Die bestehende `action`/Anlegen-Schaltfläche als `action`-Prop übergeben.
Pro-Seiten-`max-w`/Spacing NICHT zwangsweise vereinheitlichen (bewusst belassen) — nur der Kopf wird kanonisch.

## 2. Einheitliche `error.tsx` (beide Apps, gleicher Inhalt)

Sowohl `src/app/error.tsx` (Root, ganzseitig) als auch `src/app/(app)/error.tsx` (im Layout) bekommen
denselben Wortlaut/Aufbau in BEIDEN Apps. Kanonischer Inhalt der Boundary (Root-Variante `min-h-screen`,
(app)-Variante `min-h-[60vh]`):

```tsx
"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: Props) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <h2 className="text-lg font-semibold">Etwas ist schiefgelaufen</h2>
      <p className="text-sm text-muted-foreground">Ein unerwarteter Fehler ist aufgetreten.</p>
      <Button variant="outline" onClick={reset}>
        Erneut versuchen
      </Button>
    </div>
  )
}
```

Für die Root-`app/error.tsx` `min-h-[60vh]` → `min-h-screen` (sonst identisch). Wortlaut in beiden Apps gleich.

## 3. `dropdown-menu.tsx` + Konto-Dropdown (nur Treffsicher)

- Treffsicher fehlt `src/components/ui/dropdown-menu.tsx`. Kopiere es **byte-identisch** aus Ringwerk
  (`/Users/christian/repos/ringwerk/src/components/ui/dropdown-menu.tsx`).
- Treffsicher `Navigation.tsx`: Konto/Logout auf das Ringwerk-Muster umstellen — rechts ein
  `UserCircle`-Ghost-Trigger mit `DropdownMenu`: Eintrag „Mein Konto" (Link `/account`),
  `DropdownMenuSeparator`, Eintrag „Abmelden" (`signOut`). Den bisherigen separaten Konto-Nav-Link und
  den separaten Abmelden-Button entfernen. Mobil bleibt Konto/Abmelden im Hamburger-Panel.

## 4. Pending-Text: Unicode-Ellipsis (nur Treffsicher)

Alle `"...„`-Pending-Texte in Treffsicher auf das Unicode-Zeichen `…` (U+2026) umstellen, konsistent mit
Ringwerk. Betroffen u.a. `"Speichern..."` → `"Speichern…"`, analog „Löschen…", „Wird gespeichert…" etc.
(Suche nach `...` in Button-/Pending-Texten.)

## 5. Datum-Formatierung zentralisieren (nur Treffsicher)

Ringwerk hat zentral `formatDateOnly(date, displayTimeZone)` in `src/lib/dateTime.ts`. Treffsicher
definiert `Intl.DateTimeFormat("de-CH", …)` inline in mehreren Seiten (z.B. `goals/page.tsx`,
`shot-routines/page.tsx`). Ziel: eine zentrale Funktion in Treffsichers `src/lib/dateTime.ts`
(gleiche Signatur wie Ringwerk: `(date, displayTimeZone)`), alle inline-Definitionen ersetzen. Verhalten
(Ausgabeformat) NICHT ändern — nur deduplizieren.

## 6. Zeitzone → `Europe/Berlin` (nur Ringwerk)

`src/lib/dateTime.ts`: `DEFAULT_DISPLAY_TIME_ZONE = "Europe/Zurich"` → `"Europe/Berlin"` (Angleichung an
Treffsicher; Nutzer in Deutschland).

## 7. Date-Input-CSS (nur Ringwerk)

Den Date/Time-Input-Block aus Treffsichers `src/app/globals.css` (die `input[type="date"]` /
`datetime-local`-Regeln, ~18 Zeilen) **identisch** in Ringwerks `globals.css` an dieselbe Stelle übernehmen,
damit `globals.css` deckungsgleich wird.

## Verifikation (zwingend, je Repo, korrekter cwd)

`docker compose -f docker-compose.dev.yml run --rm app npm run format` dann lint, format:check, test,
`npx tsc --noEmit` — alle GRÜN.

## NICHT in diesem Pass (separat geplant)

- ActionResult-Typ-Vereinheitlichung (invasiv) → eigener Schritt.
- Dependency-Pin-Angleichung (Major-Risiko) → manuell/separat.
- Per-Seiten `max-w`/Spacing-Vereinheitlichung → bewusst belassen.
