# UI-Vereinheitlichung — Kanonische Spezifikation (Treffsicher × Ringwerk)

> **Status:** verbindliche Quelle der Wahrheit. Zwei Implementierungs-Agenten (je ein Repo) setzen
> diese Datei **verbatim** um. Bei Widersprüchen zu lokalen Docs gewinnt diese Datei für alles, was
> sie behandelt.
>
> **Repos:**
>
> - `treffsicher` = `/Users/christian/repos/treffsicher` (Training/Tagebuch)
> - `ringwerk` = `/Users/christian/repos/ringwerk` (Liga/Wettbewerbe)
>
> **Gemeinsamer Stack (verifiziert):** Next.js 16 App Router, React 19, TypeScript strict,
> shadcn/ui (new-york, neutral), Tailwind 4, `lucide-react` v1, NextAuth v4, Server Actions +
> `useActionState` + Zod 4, Dark-Mode-only (`<html class="dark">`), deutsche UI.
>
> **Bestätigte Gleichteile:** `src/components/ui/button.tsx` und `src/components/ui/card.tsx` sind
> zwischen beiden Repos **byte-identisch**. `globals.css` ist bis auf ein paar Date-Input-Regeln in
> Treffsicher identisch. `src/components/app/shell/Providers.tsx` ist identisch.

---

## 0. Verbindliche Rahmenregeln für jede neue/geänderte Datei

Diese Regeln gelten ohne Ausnahme (aus beiden CLAUDE.md + technical-constraints.md):

- **Prettier:** `semi: false`, `singleQuote: false` (double quotes), `tabWidth: 2`,
  `trailingComma: "es5"`, `printWidth: 100`. Kein Semikolon am Zeilenende.
- **Dateigröße < 200 Zeilen** (Ziel 80–180). Ab > 220 Zeilen Split-Pflicht.
- **Max. 6 Top-Level-Props** pro Komponente. Bei mehr → `model` + `actions` Pattern.
- **Sprache:** UI-Texte, Fehlermeldungen und Kommentare **Deutsch**; Identifier, Dateinamen,
  Komponenten, Routen **Englisch**.
- **Kein `any`** (`@typescript-eslint/no-explicit-any` = error).
- **Kein `console.log`** (nur `console.warn` / `console.error`).
- **Kein `alert` / `confirm` / `prompt`** — immer shadcn-Dialoge.
- **Icon-only-Buttons:** `variant="ghost"` (borderlos), nie `outline`. Icon+Text → `outline`/Default.
- **Terminologie:** „Probe" (nicht „Probeschuss").
- **Server Actions:** kein silent fail. Erfolg → `toast.success`, Fehler → `toast.error`.

### 0.1 Zwei ActionResult-Formen — wichtig

Die Repos haben **historisch unterschiedliche** `ActionResult`-Typen. Das ist Absicht und wird
**nicht** im Rahmen dieser Vereinheitlichung angeglichen (zu invasiv). Die geteilten Helfer müssen
mit **beiden** Formen funktionieren:

- **Ringwerk** (`src/lib/types.ts`) — diskriminierte Union:

  ```ts
  export type ActionResult<T = void> =
    | { success: true; data?: T }
    | { error: string | Record<string, string[] | undefined> }
  ```

- **Treffsicher** — je nach Modul gemischt:
  - `src/lib/sessions/actions/types.ts`: `{ error?: string; success?: boolean }` (nur String-Fehler)
  - `src/lib/disciplines/actions.ts` u.a.: `{ success?: boolean; error?: string | Record<string, string[]> }`

**Konsequenz für die Spec:** Die FieldError-Konvention (Abschnitt 3) liest Feldfehler defensiv per
Helper, der `string | Record<...> | undefined` toleriert. Sie schreibt **keinen** neuen ActionResult-Typ
vor. Wo ein Treffsicher-Modul aktuell nur String-Fehler kann (z.B. `sessions`), bleibt es bei
Toast + globalem Fehler; Feldfehler werden nur dort gerendert, wo das Modul sie tatsächlich liefert.

---

## P0.1 — Feedback-Schicht (sonner-Toaster + Feldfehler)

**Kanonische Entscheidung:** Ringwerks `sonner`-Setup ist Referenz. Treffsicher zieht nach.

### Soll-Zustand (beide Apps)

1. `src/components/ui/sonner.tsx` existiert (byte-identisch, siehe unten).
2. `<Toaster />` ist im Root-Layout (`src/app/layout.tsx`) **nach** `<Providers>{children}</Providers>`
   im `<body>` gerendert.
3. Nach jeder erfolgreichen mutierenden Server-Action: `toast.success("<deutsche Meldung>")`.
4. Bei Fehler einer Action (kein Redirect-Erfolg): `toast.error(<message>)`.
5. Feld-genaue Validierungsfehler unter dem jeweiligen Feld (Abschnitt 3) **plus** ein
   `toast.error("Bitte Eingaben prüfen.")` bei reiner Validierungsabweisung ist erlaubt, aber nicht
   verpflichtend, wenn Feldfehler bereits sichtbar sind.

### Geteilte Datei — `src/components/ui/sonner.tsx` (byte-identisch in beiden Repos)

> **Abhängigkeit:** benötigt `sonner` **und** `next-themes` (für `useTheme`). Ringwerk hat beide.
> **Treffsicher fehlen beide** → siehe Abschnitt „Dependencies". `next-themes` wird hier nur als
> Theme-Quelle für sonner verwendet; es wird **kein** ThemeProvider eingeführt (Dark-Mode bleibt
> fest über `<html class="dark">`). `useTheme()` ohne Provider liefert `"system"` als Default — das
> ist für sonner ausreichend und ändert nichts am erzwungenen Dark Mode.

```tsx
"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
```

> **Alternative ohne `next-themes` (nur falls der Treffsicher-Impl-Agent `next-themes` vermeiden
> will):** `theme="dark"` hart setzen und die `useTheme`-Zeile + den `next-themes`-Import entfernen.
> Dann ist die Datei **nicht** mehr byte-identisch zu Ringwerk. **Bevorzugt** ist die identische
> Variante mit `next-themes` als Dependency, damit die Konsistenz-Checkliste (Abschnitt 6) grün
> bleibt. Der Impl-Agent wählt eine Variante und dokumentiert sie im PR.

### Root-Layout-Verdrahtung (Treffsicher)

`src/app/layout.tsx` ergänzen (Ringwerk ist bereits so):

```tsx
import { Toaster } from "@/components/ui/sonner"
// ...
;<body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
  <Providers>{children}</Providers>
  <Toaster />
</body>
```

---

## P0.2 — Detail-Aktionen (Inline-ghost-Leiste)

**Kanonische Entscheidung:** Treffsichers `SessionDetailHeaderActions` ist das Referenzmuster
(Inline-Leiste oben rechts, alles `ghost`, Reihenfolge **fachlich → destruktiv → Zurück**).
Ringwerk **ersetzt** sein `MoreHorizontal`-Dropdown in `CompetitionActions.tsx` damit.

### Geteilte Datei — `src/components/app/shell/DetailActionBar.tsx` (byte-identisch)

Reiner Layout-Container. Er rendert seine Children rechtsbündig mit konsistenten Abständen, damit
beide Apps dieselbe Aktionsleiste verwenden. Inhalt (welche Buttons) bleibt app-spezifisch, die
**Reihenfolge** ist vorgeschrieben.

```tsx
import type { ReactNode } from "react"

interface Props {
  children: ReactNode
}

// Einheitliche Detail-Aktionsleiste: oben rechts, alle Aktionen als ghost-Buttons.
// Verbindliche Reihenfolge der Children: fachliche/sekundäre Aktionen → destruktive Aktion → Zurück.
export function DetailActionBar({ children }: Props) {
  return <div className="flex flex-wrap items-center justify-end gap-0.5 sm:gap-1">{children}</div>
}
```

### Anwendung Treffsicher

`SessionDetailHeaderActions.tsx` wird auf `DetailActionBar` umgestellt (Wrapper-`div` ersetzen durch
`<DetailActionBar>`), Inhalt bleibt identisch. Gleiches Muster für die Detailseiten von
`goals/[id]`, `disciplines/[id]`, `shot-routines/[id]`, sofern diese eine Aktionsleiste haben — dort
`DetailActionBar` einführen statt eigener Flex-Wrapper.

### Anwendung Ringwerk (Dropdown → Inline-Leiste)

`src/components/app/competitions/CompetitionActions.tsx` wird umgebaut:

- `DropdownMenu`/`MoreHorizontal` **entfernen**.
- Aktionen als Inline-`ghost`-Icon-Buttons in einer `DetailActionBar` rendern, Reihenfolge:
  1. **fachlich/sekundär:** Protokoll (`ScrollText`), Bearbeiten (`Pencil`), Status-Wechsel
     (`CheckCircle` / `RotateCcw` / `Archive` / `ArchiveRestore`) — je nach Status sichtbar.
  2. **destruktiv:** Löschen (`Trash2`).
  3. **Zurück** entfällt hier, weil die Komponente in Listenkarten sitzt (keine Detailseite). Auf
     der echten Detailseite `competitions/[id]/page.tsx` gilt die Reihenfolge inkl. „Zurück".
- Jeder Icon-Button: `variant="ghost"`, `size="icon"`, mit `title`/`aria-label` (deutsch).
- Bestehende `AlertDialog`-Bestätigungen für Status-Wechsel und Löschen **bleiben** unverändert.
- Erfolg/Fehler weiter über `toast` (bereits vorhanden).

> **Hinweis Modularität:** Wird `CompetitionActions.tsx` durch den Umbau > 200 Zeilen, in
> `CompetitionStatusActions.tsx` (Status-Buttons + Dialoge) und `CompetitionActions.tsx`
> (Komposition) splitten.

---

## P0.3 — Icon-Vokabular

**Kanonische Festlegung — gilt in BEIDEN Apps:**

| Bedeutung                       | Icon (`lucide-react`)        | Hinweis                            |
| ------------------------------- | ---------------------------- | ---------------------------------- |
| Disziplinen                     | `Target`                     | überall identisch (Funktions-Icon) |
| Bearbeiten                      | `Pencil`                     |                                    |
| Löschen                         | `Trash2`                     |                                    |
| Archivieren / Wiederherstellen  | `Archive` / `ArchiveRestore` |                                    |
| Protokoll / Audit               | `ScrollText`                 |                                    |
| Neu anlegen                     | `Plus`                       |                                    |
| Zurück                          | `ArrowLeft`                  |                                    |
| PDF / Download                  | `Download`                   |                                    |
| Favorit                         | `Heart`                      | Treffsicher-spezifisch             |
| Abmelden                        | `LogOut`                     |                                    |
| Konto                           | `UserCircle`                 | Konsolidiert (siehe unten)         |
| Admin                           | `Shield`                     |                                    |
| Menü öffnen / schließen (mobil) | `Menu` / `X`                 |                                    |
| Wettbewerbe / Sieger (Ringwerk) | `Trophy`                     | Wettbewerb-Familie, konsistent     |

### Marken-Logo (kollisionsfrei, je App eindeutig)

Das Logo-Icon darf **nicht** mit einem Funktions-Icon kollidieren. `Target` ist jetzt fest für
„Disziplinen" reserviert — Ringwerk darf `Target` **nicht** mehr als Logo verwenden.

- **Treffsicher:** Logo = **`Crosshair`** (bereits so in `Navigation.tsx`). `Crosshair` wird sonst
  nirgends als Funktions-Icon genutzt → kollisionsfrei. **Bleibt.**
- **Ringwerk:** Logo = **`CircleDot`** (neu). Begründung: `Trophy` wird in Ringwerk bereits
  durchgängig als Semantik-Icon für „Wettbewerb/Sieger" verwendet (Dashboard, Playoff-Sieger,
  Empty-State, Section-Header, Nav „Wettbewerbe"). Ein Logo, das denselben Glyph nutzt, wäre selbst
  eine Kollision. `CircleDot` (Zielscheiben-/Ring-Motiv) ist thematisch passend zu „Ring"werk, wird
  nirgends als Funktions-/Semantik-Icon genutzt → kollisionsfrei und markant. Damit bleibt `Trophy`
  konsistent = Wettbewerb/Sieger (inkl. Nav „Wettbewerbe" und „Playoffs"-Label), und `CircleDot` ist
  die eindeutige Marke. `Crosshair` als Logo wäre identisch zu Treffsicher → verworfen.

### Konkrete Icon-Swaps Ringwerk `Navigation.tsx`

- Logo-Icon: `Target` → **`CircleDot`**.
- Dashboard-Nav-Item: `icon: Target` → **`LayoutDashboard`** (Funktions-Icon, konsistent mit
  Treffsichers Dashboard).
- Disziplinen-Nav-Item: `icon: Crosshair` → **`Target`** (kanonisch für Disziplinen).
- Wettbewerbe-Nav-Item: bleibt **`Trophy`** (Wettbewerb-Familie; keine Kollision mehr, da Logo
  jetzt `CircleDot` ist).
- Teilnehmer: bleibt `Users`.
- Konto-Dropdown-Trigger: `UserCircle` bleibt.

### Konkrete Icon-Swaps Treffsicher `Navigation.tsx`

- Disziplinen-Nav-Item: aktuell bereits `Target` → **bleibt**.
- Konto-Nav-Item: aktuell `User` → **`UserCircle`** (kanonisch für Konto in beiden Apps).
- Logo `Crosshair` → bleibt.
- Restliche Funktions-Icons (`LayoutDashboard`, `BookOpen`, `TrendingUp`, `Goal`, `ListChecks`,
  `Shield`, `LogOut`) bleiben.

---

## P1.1 — Datenverlust-Schutz (`useUnsavedChangesGuard`)

**Kanonische Entscheidung:** ein gemeinsamer Hook für die Langformulare beider Apps.
`beforeunload`-Warnung (Tab schließen/Reload) **plus** Bestätigungsdialog beim Abbrechen/internen
Wegnavigieren.

### Geteilte Dateien (byte-identisch)

Wir teilen den Hook in zwei Artefakte, damit jede einzelne Datei < 200 Zeilen, ≤ 6 Props bleibt:

#### `src/lib/hooks/useUnsavedChangesGuard.ts`

```ts
"use client"

import { useEffect } from "react"

interface Options {
  // Aktiv schalten, sobald das Formular ungespeicherte Änderungen hat.
  enabled: boolean
}

// Warnt den Nutzer vor Datenverlust, wenn er den Tab schließt oder neu lädt,
// solange ungespeicherte Änderungen bestehen (enabled === true).
// Internes Wegnavigieren/Abbrechen wird über useNavigationConfirm() abgesichert.
export function useUnsavedChangesGuard({ enabled }: Options): void {
  useEffect(() => {
    if (!enabled) return

    function handleBeforeUnload(event: BeforeUnloadEvent): void {
      event.preventDefault()
      // Moderne Browser zeigen einen generischen Text; returnValue wird für ältere benötigt.
      event.returnValue = ""
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [enabled])
}
```

#### `src/lib/hooks/useNavigationConfirm.ts`

Liefert eine `confirmNavigation`-Funktion + den Dialog-State für internes Abbrechen/Wegnavigieren.
Der zugehörige Dialog wird mit der geteilten `ConfirmDialog`-Komponente (unten) gerendert.

```ts
"use client"

import { useState } from "react"

interface Result {
  // true, wenn ein Bestätigungsdialog offen ist.
  isConfirmOpen: boolean
  // Startet den Schutz: zeigt Dialog, wenn dirty; sonst sofortige Ausführung.
  requestNavigation: (run: () => void) => void
  // Dialog-Aktionen.
  confirm: () => void
  cancel: () => void
}

interface Options {
  // Ungespeicherte Änderungen vorhanden?
  isDirty: boolean
}

// Kapselt den Bestätigungs-Flow für internes Abbrechen/Wegnavigieren.
// Wenn nichts geändert wurde, läuft die Aktion ohne Rückfrage.
export function useNavigationConfirm({ isDirty }: Options): Result {
  const [pendingRun, setPendingRun] = useState<(() => void) | null>(null)

  function requestNavigation(run: () => void): void {
    if (!isDirty) {
      run()
      return
    }
    setPendingRun(() => run)
  }

  function confirm(): void {
    pendingRun?.()
    setPendingRun(null)
  }

  function cancel(): void {
    setPendingRun(null)
  }

  return { isConfirmOpen: pendingRun !== null, requestNavigation, confirm, cancel }
}
```

#### Geteilte UI — `src/components/app/shell/ConfirmDialog.tsx` (byte-identisch)

Einheitlicher Bestätigungsdialog auf `AlertDialog`-Basis. Wird sowohl vom Dirty-Guard als auch für
andere „Bist du sicher?"-Flows verwendet (vereinheitlicht den Bestätigungsstil aus UI-Regel 3).

```tsx
"use client"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  onConfirm: () => void
  destructive?: boolean
}

// Einheitlicher Bestätigungsdialog (Abbrechen / Bestätigen) im shadcn-Stil.
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Bestätigen",
  onConfirm,
  destructive = false,
}: Props) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={
              destructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : undefined
            }
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
```

### Verwendungsmuster (Langformulare)

```tsx
// 1. Dirty-Status aus dem Formular ableiten (z.B. "irgendein Feld vom Initialwert abweichend"
//    oder ein einfaches "der Nutzer hat editiert"-Flag).
const isDirty = /* ... */

// 2. beforeunload-Schutz
useUnsavedChangesGuard({ enabled: isDirty && !pending })

// 3. internes Abbrechen/Wegnavigieren
const nav = useNavigationConfirm({ isDirty: isDirty && !pending })

// Abbrechen-Button:
<Button type="button" variant="outline" onClick={() => nav.requestNavigation(() => router.push(backHref))}>
  Abbrechen
</Button>

// Dialog:
<ConfirmDialog
  open={nav.isConfirmOpen}
  onOpenChange={(o) => !o && nav.cancel()}
  title="Ungespeicherte Änderungen verwerfen?"
  description="Es gibt nicht gespeicherte Änderungen. Beim Verlassen gehen sie verloren."
  confirmLabel="Verwerfen"
  destructive
  onConfirm={nav.confirm}
/>
```

> **Wichtig:** Nach erfolgreichem Submit (Redirect) muss `isDirty` false sein **oder** der Guard vor
> dem programmatischen `router.push` deaktiviert werden, damit der Erfolgs-Redirect nicht
> fälschlich blockiert. Praktisch: beim Submit ein `submittedRef`/`pending`-Flag setzen, das in die
> `enabled`/`isDirty`-Berechnung einfließt (siehe `!pending` oben).

---

## P1.2 — Empty States

**Kanonische Entscheidung:** Treffsichers Empty-State-Stil (Card mit Text) ist Referenz, **erweitert**
um einen optionalen Call-to-Action-Button. Ringwerk zieht nach (ersetzt seine
`<p className="rounded-lg border bg-card ...">`-Inline-Texte).

### Geteilte Datei — `src/components/ui/empty-state.tsx` (byte-identisch)

```tsx
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

interface Props {
  // Überschrift/Hauptaussage (deutsch).
  title: string
  // Optionaler erklärender Untertext.
  description?: string
  // Optionales Icon oberhalb des Texts.
  icon?: LucideIcon
  // Optionaler Call-to-Action-Button (interner Link).
  actionLabel?: string
  actionHref?: string
}

// Einheitlicher Leerzustand: zentrierte Karte mit Text und optionalem CTA.
export function EmptyState({ title, description, icon: Icon, actionLabel, actionHref }: Props) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        {Icon && <Icon className="h-8 w-8 text-muted-foreground/60" />}
        <div className="space-y-1">
          <p className="font-medium">{title}</p>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actionLabel && actionHref && (
          <Button asChild size="sm" className="mt-1">
            <Link href={actionHref}>{actionLabel}</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
```

### Anwendung

- **Treffsicher** `sessions/page.tsx`: die beiden Inline-Card-Texte durch `EmptyState` ersetzen.
  - „Noch keine Einheiten" → `title="Noch keine Einheiten vorhanden"`,
    `description="Starte mit deiner ersten Einheit."`, `icon={BookOpen}`,
    `actionLabel="Neue Einheit"`, `actionHref="/sessions/new"`.
  - Gefilterte Leere → `title="Keine Einheiten für die gewählten Filter."` (ohne CTA).
  - Analog für `goals/page.tsx`, `disciplines/page.tsx`, `shot-routines/page.tsx`,
    `statistics/page.tsx` (wo Leerzustände existieren).
- **Ringwerk** `competitions/page.tsx`: „Keine aktiven Wettbewerbe vorhanden." → `EmptyState`
  (mit CTA `actionLabel="Neuer Wettbewerb"`, `actionHref="/competitions/new"`, nur wenn `canManage`).
  `disciplines/page.tsx` und `participants/page.tsx`: leere Listen → `EmptyState` (CTA
  „Neue Disziplin" / „Neuer Teilnehmer").

> **Modularität (Ringwerk):** `competitions/page.tsx` rendert die List-Cards aktuell inline. Wenn
> durch die Klickbar-Umstellung (P1.3) eine `CompetitionListCard`-Komponente entsteht, dort
> verwenden; ansonsten Empty-State unabhängig davon einführen.

---

## P1.3 — Klickbare Karten + Listen-Filter

### Klickbare Karten

**Kanonische Entscheidung:** Treffsichers Muster (`<Link>` umschließt die ganze `Card`, keine
„Details →"-Buttons) ist Refercia. Ringwerk zieht nach.

**Muster (verbindlich):**

```tsx
<Link href={detailHref} className="block">
  <Card className="transition-colors hover:bg-muted/30">
    <CardContent>{/* Inhalt */}</CardContent>
  </Card>
</Link>
```

**Konflikt mit Inline-Aktionen (Ringwerk):** Eine Karte, die selbst ein `<Link>` ist, darf keine
verschachtelten interaktiven Elemente (Buttons, weitere Links) im Klickbereich haben, ohne deren
Events zu stoppen. Lösung in Ringwerk:

- Die `CompetitionActions`-Leiste (P0.2) und die Sub-Links („Teilnehmer", „Spielplan", „Rangliste")
  liegen visuell in der Karte, aber **die Karte selbst ist nicht klickbar**, solange diese internen
  Navigations-Links existieren. **Festlegung:** Ringwerks Wettbewerbskarten haben mehrere Ziele
  (Teilnehmer/Spielplan/Playoffs/Rangliste) — eine einzige „ganze Karte klickbar"-Zielroute ist
  fachlich nicht eindeutig. Daher gilt für Ringwerk:
  - **Behalte** die expliziten Sub-Links als primäre Navigation.
  - **Entferne** redundante „Details/Anzeigen"-Buttons, falls vorhanden (es gibt aktuell keine).
  - Mache den **Wettbewerbs-Namen** zum Link auf die kanonische Detailseite
    `/competitions/[id]` (statt nur Text). So bleibt ein klarer „Hauptziel"-Klick erhalten, ohne den
    Mehrfachziel-Konflikt.
- Wo Ringwerk **eindeutige** Einzelziel-Listen hat (z.B. Teilnehmerliste, Disziplinenliste mit genau
  einer Edit-Detailseite), gilt das volle „ganze Karte/Row ist Link"-Muster, Inline-Aktionen mit
  `e.stopPropagation()` bzw. als separate Spalte außerhalb des Link-Bereichs.

> **Begründung der Abweichung:** Die kanonische Regel „ganze Karte klickbar" stammt aus Treffsicher,
> wo jede Karte genau ein Detailziel hat. Ringwerks Wettbewerbskarte ist ein Multi-Ziel-Objekt; ein
> erzwungener Ganzkarten-Link würde Funktion verschlechtern. Der **Name-als-Link**-Kompromiss erhält
> die Konsistenz-Idee (klickbare Navigation ohne „Details"-Button) ohne Funktionsverlust. Diese
> Ausnahme ist hier bewusst dokumentiert (Duplikations-/Konsistenzregel: bewusste Abweichung
> begründet).

### Listen-Filter (Ringwerk zieht nach — nur Konzept)

**Kanonische Entscheidung:** Ringwerk bekommt URL-State-Filter analog Treffsichers
`SessionsFilters` (Referenz: `replace` statt `push`, `useSearchParams`/`usePathname`/`useRouter`,
„Filter zurücksetzen"-Ghost-Icon-Button mit `X`).

**Konzept (Detail dem Impl-Agenten überlassen):**

- Neue Client-Komponente `src/components/app/competitions/CompetitionsFilters.tsx` nach dem exakten
  Aufbau von Treffsichers `SessionsFilters.tsx` (gleiche Hooks, gleiches `updateFilters`/`resetFilters`-
  Muster, gleiche Select-Struktur, `replace(..., { scroll: false })`).
- Sinnvolle Filter für Ringwerk: **Status** (Entwurf/Aktiv/Abgeschlossen/Archiviert), **Typ**
  (Liga/Event/Saison), optional **Disziplin**.
- Die Seite `competitions/page.tsx` liest `searchParams` (wie Treffsichers `sessions/page.tsx`),
  filtert serverseitig und zeigt „X von Y" im Untertitel.
- Eine **Suche** (Textfeld nach Name) ist optional und kann analog als zusätzlicher
  `?q=`-Parameter mit `Input` + debounced `replace` ergänzt werden; nicht verpflichtend für die
  erste Umsetzung.

> **Hinweis:** `SessionsFilters.tsx` selbst wird **nicht** geteilt (Filter-Felder sind
> app-spezifisch). Geteilt ist das **Muster**, nicht die Datei. Der Impl-Agent darf die generische
> Mechanik (URL-State, reset) bei Bedarf in einen kleinen Hook `useUrlFilters` extrahieren, das ist
> aber optional und nicht Teil der Konsistenz-Checkliste.

---

## P2.1 — Mobile-Navigation (Hamburger)

**Kanonische Entscheidung:** Ringwerks Hamburger-Menü ist Referenz. Treffsicher **ersetzt** seinen
horizontalen 8-Icon-Strip (`overflow-x-auto`) damit.

**Soll-Verhalten (beide Apps):**

- Desktop (`md:` und größer): horizontale Nav-Links + Logo links, Konto/Admin/Logout rechts.
- Mobil (`< md`): Logo links, rechts ein `Menu`/`X`-Toggle (`ghost`), das ein
  aufklappbares vertikales Menü unter der Top-Bar öffnet (`border-t`, volle Breite, je Link
  `flex items-center gap-3 px-4 py-3`).
- Aktiver Link: `bg-secondary text-foreground`; inaktiv: `text-muted-foreground hover:bg-secondary/50
hover:text-foreground`.
- Menü schließt beim Klick auf einen Link (`onClick={() => setMobileOpen(false)}`).

**Treffsicher-spezifisch:**

- Die `Navigation`-Komponente bleibt `"use client"` (nutzt `usePathname`, `useSession`).
- Die bestehende Logik (Admin-Link nur für `role === "ADMIN"`, Logout via `signOut`) bleibt.
- Logo `Crosshair` + „Treffsicher" links; auf Desktop alle `baseNavLinks` horizontal; auf Mobil im
  Hamburger-Panel. Konto + Logout: auf Desktop rechts (Konto als `UserCircle`-Link/Dropdown, Logout
  als `LogOut`-Ghost), auf Mobil im Panel.
- Der `no-scrollbar overflow-x-auto`-Icon-Strip wird vollständig entfernt.

**Strukturreferenz:** Ringwerks `Navigation.tsx` (oben gelesen) ist die Vorlage. Treffsichers
Navigation übernimmt dasselbe `header > div(flex justify-between)` + `nav(hidden md:flex)` +
mobiles `{mobileOpen && <nav className="border-t md:hidden">}` Layout.

> **Nicht geteilt als Datei:** Die Nav-Items unterscheiden sich (Treffsicher: 7 Links + Admin;
> Ringwerk: 2–4 Links + Admin). Geteilt ist die **Struktur/das Verhalten**, nicht der Datei-Inhalt.
> Beide `Navigation.tsx` bleiben app-spezifisch, müssen aber demselben Layout-Schema folgen.

---

## P2.2 — FavouriteButton-Fix (Treffsicher)

**Problem:** `FavouriteButton.tsx` macht ein optimistisches Update, rollt aber bei Server-Fehler
**nicht** zurück und zeigt keinen Fehler (silent fail → verstößt gegen „kein silent fail").

**Soll-Verhalten:** Bei Fehler der Action den optimistischen Zustand zurückrollen **und**
`toast.error(...)`. Erfolg braucht keinen Toast (stiller Erfolg ist bei reinem Toggle ok; optional
ein dezenter `toast.success` — **nicht** verpflichtend, um Toast-Spam zu vermeiden).

**Voraussetzung:** `toggleFavourite` muss ein Fehlersignal liefern. Aktuell gibt
`src/lib/sessions/actions/session/toggleFavourite.ts` vermutlich `void`/`revalidate` zurück. Der
Impl-Agent prüft die Rückgabe:

- Falls die Action bereits `ActionResult` zurückgibt → direkt auswerten.
- Falls nicht → die Action so anpassen, dass sie bei Fehler `{ error: string }` zurückgibt (statt zu
  werfen) und bei Erfolg `{ success: true }`. **Datenisolation nach `userId` bleibt** erhalten.

**Kanonischer Ersatz-Quelltext `src/components/app/sessions/FavouriteButton.tsx`** (Treffsicher;
setzt eine `ActionResult`-rückgebende `toggleFavourite` voraus):

```tsx
"use client"

import { useState, useTransition } from "react"
import { Heart } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { toggleFavourite } from "@/lib/sessions/actions"

interface Props {
  sessionId: string
  initialFavourite: boolean
}

// Optimistischer Toggle: Zustand wird sofort umgeschaltet. Schlägt die Server Action
// fehl, wird der optimistische Wert zurückgerollt und ein Fehler-Toast angezeigt.
export function FavouriteButton({ sessionId, initialFavourite }: Props) {
  const [isFavourite, setIsFavourite] = useState(initialFavourite)
  const [isPending, startTransition] = useTransition()

  function handleToggle() {
    const previous = isFavourite
    setIsFavourite(!previous)
    startTransition(async () => {
      const result = await toggleFavourite(sessionId)
      if (result && "error" in result && result.error) {
        setIsFavourite(previous)
        toast.error(
          typeof result.error === "string" ? result.error : "Favorit konnte nicht geändert werden."
        )
      }
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      disabled={isPending}
      aria-label={isFavourite ? "Favorit entfernen" : "Als Favorit markieren"}
    >
      <Heart
        className={`h-4 w-4 transition-colors ${
          isFavourite ? "fill-red-500 text-red-500" : "text-muted-foreground"
        }`}
      />
    </Button>
  )
}
```

> Dies ist **kein** geteilter Quelltext (Ringwerk hat kein Favoriten-Feature). Nur Treffsicher.

---

## P2.3 — Onboarding / Standard-Disziplinen

### Ist-Zustand (verifiziert)

| Aspekt                           | Treffsicher                                                  | Ringwerk                                               |
| -------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------ |
| `systemDisciplines.ts`           | ja (`src/lib/disciplines/systemDisciplines.ts`)              | ja (`src/lib/disciplines/systemDisciplines.ts`)        |
| `ensureSystemDisciplines()`      | ja, idempotent, gibt `number` zurück                         | ja, idempotent, gibt `number` zurück                   |
| Aufruf beim Start (`startup.ts`) | ja — Ergebnis wird per `console.warn(count)` geloggt         | ja — Ergebnis wird **nicht** geloggt                   |
| `prisma/seed.ts`                 | **vorhanden** (`"prisma": { "seed": "tsx prisma/seed.ts" }`) | **fehlt** (kein `seed.ts`, kein `prisma.seed`-Eintrag) |
| Admin-Env-Variablen              | `ADMIN_EMAIL` / `ADMIN_PASSWORD`                             | `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`             |

**Wichtigste Erkenntnis:** Beide Apps legen Standard-Disziplinen bereits **automatisch beim
App-Start** über `runStartup()` → `ensureSystemDisciplines()` an. Es gibt **keinen** funktionalen
Mangel bei der Disziplinen-Initialisierung. Der einzige reale Unterschied im Onboarding-Pfad ist:

1. **Treffsicher** hat zusätzlich ein eigenständiges `prisma/seed.ts` (für `prisma db seed` / den
   `/seed`-Befehl nach `/db-reset`). **Ringwerk** hat das nicht.
2. **Env-Variablennamen** für den Initial-Admin unterscheiden sich
   (`ADMIN_*` vs. `SEED_ADMIN_*`).

### Soll-Erwartung (anzugleichen)

Diese Angleichung ist **niedrige Priorität** und rein konsistenzgetrieben (kein Nutzer-sichtbarer
UI-Effekt). Reihenfolge nach Aufwand/Nutzen:

1. **Disziplinen-Seed-Logging angleichen (klein, empfohlen):** Ringwerks `startup.ts` soll das
   Ergebnis von `ensureSystemDisciplines(db)` analog Treffsicher loggen:

   ```ts
   const createdDisciplines = await ensureSystemDisciplines(db)
   if (createdDisciplines > 0) {
     console.warn(`Standarddisziplinen angelegt: ${createdDisciplines}`)
   }
   ```

   (Ringwerks `ensureSystemDisciplines` gibt bereits `number` zurück — nur der Aufrufer ignoriert
   ihn.)

2. **`prisma/seed.ts` in Ringwerk ergänzen (optional):** Ein dünnes `seed.ts`, das
   `ensureSystemDisciplines(db)` und (falls `SEED_ADMIN_*` gesetzt) den Admin anlegt — also dieselbe
   Logik wie `runStartup()`, nur als CLI-Seed nutzbar. Plus `"prisma": { "seed": "tsx prisma/seed.ts" }`
   in `package.json`. Nur umsetzen, wenn ein `/db-reset`+`/seed`-Workflow in Ringwerk gewünscht ist.
   **Der Impl-Agent prüft, ob Treffsichers `seed.ts` `ensureSystemDisciplines` wiederverwendet, und
   spiegelt diesen Aufbau.**

3. **Env-Variablennamen — NICHT automatisch angleichen.** Das Umbenennen von `ADMIN_*` ↔ `SEED_ADMIN_*`
   ist ein **Breaking Change für bestehende Deployments** (`.env`, TrueNAS-Runbook). **Festlegung:**
   nicht im Rahmen dieser UI-Vereinheitlichung anfassen. Nur in der Spec dokumentiert, damit die
   Divergenz bekannt ist. Falls später vereinheitlicht: auf `ADMIN_EMAIL`/`ADMIN_PASSWORD`
   standardisieren (kürzer, Treffsicher-Konvention) und Deploy-Docs beider Apps + `.env.example`
   gleichzeitig anpassen.

> **Kein neues UI-Onboarding** (kein Wizard, kein Begrüßungs-Screen) — das ist out of scope. „Onboarding"
> meint hier ausschließlich die automatische Daten-Initialisierung beim ersten Start, die bereits
> existiert.

---

## 3. FieldError-Konvention (Helper + Render-Muster)

Ziel: Feld-genaue Validierungsfehler unter dem jeweiligen Input, mit `aria-invalid` und
`aria-describedby`, **kompatibel mit beiden ActionResult-Formen** (Abschnitt 0.1).

### Geteilte Dateien (byte-identisch)

#### `src/lib/forms/fieldErrors.ts` — defensiver Reader

```ts
// Liest Feldfehler defensiv aus einem ActionResult-artigen Wert.
// Toleriert beide Projektformen:
//   - { error?: string }                         (nur globaler Fehler)
//   - { error?: string | Record<string, string[] | undefined> }
//   - { success: true; data?: ... }              (kein Fehler)
// Gibt undefined zurück, wenn für das Feld kein Fehler vorliegt.

type FieldErrorSource =
  | { error?: string | Record<string, string[] | undefined> }
  | { success: true }
  | null
  | undefined

export function getFieldError(state: FieldErrorSource, field: string): string | undefined {
  if (!state || !("error" in state) || !state.error) return undefined
  if (typeof state.error === "string") return undefined
  return state.error[field]?.[0]
}

export function getGeneralError(state: FieldErrorSource): string | undefined {
  if (!state || !("error" in state) || !state.error) return undefined
  return typeof state.error === "string" ? state.error : undefined
}
```

#### `src/components/ui/field-error.tsx` — Render-Komponente

```tsx
interface Props {
  // Eindeutige id, passend zum aria-describedby des zugehörigen Inputs.
  id: string
  // Fehlermeldung; bei undefined wird nichts gerendert.
  message?: string
}

// Einheitliche Darstellung eines Feldfehlers unter einem Formularfeld.
export function FieldError({ id, message }: Props) {
  if (!message) return null
  return (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  )
}
```

### Verbindliches Render-Muster pro Feld

```tsx
import { getFieldError, getGeneralError } from "@/lib/forms/fieldErrors"
import { FieldError } from "@/components/ui/field-error"

// ... innerhalb der Komponente:
const nameError = getFieldError(state, "name")

<div className="space-y-2">
  <Label htmlFor="name">Name</Label>
  <Input
    id="name"
    name="name"
    aria-invalid={nameError ? true : undefined}
    aria-describedby={nameError ? "name-error" : undefined}
    // ...
  />
  <FieldError id="name-error" message={nameError} />
</div>
```

- **Konvention für ids:** `<field>-error` (z.B. `name-error`, `disciplineId-error`).
- **Globaler Fehler** (nicht feldgebunden): mit `getGeneralError(state)` lesen und einmal pro
  Formular rendern (z.B. über dem Submit-Button), zusätzlich `toast.error(...)`.
- **Migration bestehender Inline-Checks:** Wo Formulare aktuell `fieldErrors?.name` /
  `state.error[field]` selbst auswerten (Ringwerk `CompetitionForm`, Treffsicher `DisciplineForm`),
  werden diese durch `getFieldError`/`FieldError` ersetzt — gleiche Anzeige, plus `aria-*`.

---

## 4. Datei-Änderungslisten pro App

### 4A — Treffsicher

**Neue Dependencies:** `sonner`, `next-themes` (siehe Abschnitt 5).

**Neue Dateien (geteilt, byte-identisch zu Ringwerk):**

- `src/components/ui/sonner.tsx`
- `src/components/ui/empty-state.tsx`
- `src/components/ui/field-error.tsx`
- `src/components/app/shell/DetailActionBar.tsx`
- `src/components/app/shell/ConfirmDialog.tsx`
- `src/lib/hooks/useUnsavedChangesGuard.ts`
- `src/lib/hooks/useNavigationConfirm.ts`
- `src/lib/forms/fieldErrors.ts`

**Geänderte Dateien:**

| Datei                                                                                                    | Änderung                                                                                                          |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `src/app/layout.tsx`                                                                                     | `<Toaster />` nach `<Providers>` einfügen (P0.1)                                                                  |
| `src/components/app/shell/Navigation.tsx`                                                                | Hamburger-Mobile-Nav (P2.1); Konto-Icon `User` → `UserCircle` (P0.3); Icon-Strip entfernen                        |
| `src/components/app/sessions/detail/SessionDetailHeaderActions.tsx`                                      | Wrapper-`div` → `DetailActionBar` (P0.2)                                                                          |
| `src/app/(app)/goals/[id]/page.tsx`                                                                      | Aktionsleiste auf `DetailActionBar` umstellen (P0.2), falls Aktionen vorhanden                                    |
| `src/app/(app)/disciplines/[id]/page.tsx`                                                                | dito                                                                                                              |
| `src/app/(app)/shot-routines/[id]/page.tsx`                                                              | dito                                                                                                              |
| `src/app/(app)/sessions/page.tsx`                                                                        | Empty-State-Cards → `EmptyState` (P1.2)                                                                           |
| `src/app/(app)/goals/page.tsx`                                                                           | Empty-State → `EmptyState` (P1.2)                                                                                 |
| `src/app/(app)/disciplines/page.tsx`                                                                     | Empty-State → `EmptyState` (P1.2)                                                                                 |
| `src/app/(app)/shot-routines/page.tsx`                                                                   | Empty-State → `EmptyState` (P1.2)                                                                                 |
| `src/app/(app)/statistics/page.tsx`                                                                      | Empty-State → `EmptyState` (P1.2), falls vorhanden                                                                |
| `src/components/app/sessions/FavouriteButton.tsx`                                                        | Rollback + `toast.error` (P2.2)                                                                                   |
| `src/lib/sessions/actions/session/toggleFavourite.ts`                                                    | bei Bedarf `ActionResult`-Rückgabe statt `void`/throw (P2.2)                                                      |
| `src/components/app/session-form/SessionForm.tsx` (+ `useSessionFormSubmit.ts`, `SessionFormFooter.tsx`) | Dirty-Guard (P1.1); `toast.success`/`toast.error` nach Submit; FieldError-Konvention für serverseitige Feldfehler |
| `src/components/app/disciplines/DisciplineForm.tsx`                                                      | lokalen `fieldError`-Helfer durch `getFieldError`/`FieldError` + `aria-*` ersetzen (P0.1/§3); `toast` nach Submit |
| `src/components/app/goals/...` (GoalEditForm/AssignmentsForm)                                            | `toast` + FieldError-Konvention (§3); Dirty-Guard für Lang-Edit optional                                          |
| `src/components/app/shot-routines/ShotRoutineEditor.tsx`                                                 | `toast` + FieldError-Konvention; Dirty-Guard (P1.1, Langformular)                                                 |
| `src/components/app/sessions/{Prognosis,Feedback,Reflection,Wellbeing}Form.tsx`                          | `toast.success`/`toast.error` nach Submit; FieldError wo Feldfehler geliefert werden                              |
| `src/components/app/account/AccountPasswordForm.tsx`                                                     | `toast` + FieldError-Konvention                                                                                   |
| `src/components/app/admin/AdminCreateUserForm.tsx`, `AdminEditUserForm.tsx`                              | `toast` + FieldError-Konvention                                                                                   |

**Dirty-Guard-Pflicht (Langformulare Treffsicher):** `SessionForm` (Haupt-Langformular),
`ShotRoutineEditor`. Optional für `DisciplineForm`/`GoalEditForm` (kürzer).

### 4B — Ringwerk

**Neue Dependencies:** keine (sonner + next-themes bereits vorhanden).

**Neue Dateien (geteilt, byte-identisch zu Treffsicher):**

- `src/components/ui/empty-state.tsx`
- `src/components/ui/field-error.tsx`
- `src/components/app/shell/DetailActionBar.tsx`
- `src/components/app/shell/ConfirmDialog.tsx`
- `src/lib/hooks/useUnsavedChangesGuard.ts`
- `src/lib/hooks/useNavigationConfirm.ts`
- `src/lib/forms/fieldErrors.ts`
- `src/components/app/competitions/CompetitionsFilters.tsx` (app-spezifisch, P1.3 — Muster aus Treffsicher)

> `src/components/ui/sonner.tsx` existiert bereits in Ringwerk — **nicht** neu anlegen, nur als
> Referenz für die byte-identische Treffsicher-Kopie verwenden.

**Geänderte Dateien:**

| Datei                                                                                        | Änderung                                                                                                                                                    |
| -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/components/app/shell/Navigation.tsx`                                                    | Logo `Target` → `Trophy`; Dashboard `Target` → `LayoutDashboard`; Disziplinen `Crosshair` → `Target`; Wettbewerbe `Trophy` → `ListOrdered` (P0.3)           |
| `src/components/app/competitions/CompetitionActions.tsx`                                     | Dropdown/`MoreHorizontal` → Inline-`ghost`-Buttons in `DetailActionBar` (P0.2); ggf. Split in `CompetitionStatusActions.tsx`                                |
| `src/app/(app)/competitions/[id]/page.tsx`                                                   | Detail-Aktionsleiste auf `DetailActionBar` (fachlich → destruktiv → Zurück) (P0.2)                                                                          |
| `src/app/(app)/competitions/page.tsx`                                                        | Empty-State → `EmptyState` (P1.2); Filter via `CompetitionsFilters` + `searchParams` (P1.3); Wettbewerbs-Name als `<Link href="/competitions/[id]">` (P1.3) |
| `src/app/(app)/disciplines/page.tsx`                                                         | Empty-State → `EmptyState` (P1.2)                                                                                                                           |
| `src/app/(app)/participants/page.tsx`                                                        | Empty-State → `EmptyState` (P1.2); Row-Klickbarkeit auf Edit-Detail (P1.3, Einzelziel)                                                                      |
| `src/components/app/competitions/CompetitionForm.tsx`                                        | lokale `fieldErrors`/`generalError`-Auswertung → `getFieldError`/`getGeneralError`/`FieldError` + `aria-*` (§3); Dirty-Guard (P1.1, Langformular)           |
| `src/components/app/disciplines/DisciplineForm.tsx`                                          | FieldError-Konvention (§3); `toast` nach Submit                                                                                                             |
| `src/components/app/participants/ParticipantForm.tsx`                                        | FieldError-Konvention (§3); `toast` nach Submit                                                                                                             |
| `src/components/app/users/UserCreateForm.tsx`, `UserEditForm.tsx`, `AccountPasswordForm.tsx` | FieldError-Konvention (§3); `toast`                                                                                                                         |
| `src/lib/startup.ts`                                                                         | `ensureSystemDisciplines`-Ergebnis loggen (P2.3, optional)                                                                                                  |
| `prisma/seed.ts` (neu) + `package.json`                                                      | optionaler CLI-Seed (P2.3, optional)                                                                                                                        |

**Dirty-Guard-Pflicht (Langformulare Ringwerk):** `CompetitionForm` (großes Langformular).

---

## 5. Dependencies

| Paket         | Treffsicher     | Ringwerk           | Aktion                                                        |
| ------------- | --------------- | ------------------ | ------------------------------------------------------------- |
| `sonner`      | **fehlt**       | `^2.0.7` vorhanden | Treffsicher: `sonner@^2.0.7` hinzufügen                       |
| `next-themes` | **fehlt**       | `^0.4.6` vorhanden | Treffsicher: `next-themes@^0.4.6` hinzufügen (für sonner.tsx) |
| alles andere  | identisch genug | identisch genug    | keine                                                         |

> Installation Treffsicher (im Dev-Container, gemäß CLAUDE.md):
> `docker compose -f docker-compose.dev.yml run --rm app npm install sonner@^2.0.7 next-themes@^0.4.6`
> Danach `package-lock.json` mit committen.
>
> **Falls** der Treffsicher-Impl-Agent die `next-themes`-freie sonner-Variante wählt (Abschnitt
> P0.1), entfällt nur `next-themes`; `sonner` ist in jedem Fall nötig.

---

## 6. Konsistenz-Checkliste (Reviewer-Gate)

Diese Dateien MÜSSEN nach der Umsetzung in **beiden** Repos inhaltlich (byte-)gleich sein
(nur `@/`-Import-Pfade sind ohnehin identisch). Ein Reviewer prüft mit `diff`:

| Datei                                          | Erwartung                                   |
| ---------------------------------------------- | ------------------------------------------- |
| `src/components/ui/sonner.tsx`                 | byte-identisch (bei `next-themes`-Variante) |
| `src/components/ui/empty-state.tsx`            | byte-identisch                              |
| `src/components/ui/field-error.tsx`            | byte-identisch                              |
| `src/components/app/shell/DetailActionBar.tsx` | byte-identisch                              |
| `src/components/app/shell/ConfirmDialog.tsx`   | byte-identisch                              |
| `src/lib/hooks/useUnsavedChangesGuard.ts`      | byte-identisch                              |
| `src/lib/hooks/useNavigationConfirm.ts`        | byte-identisch                              |
| `src/lib/forms/fieldErrors.ts`                 | byte-identisch                              |
| `src/components/ui/button.tsx`                 | byte-identisch (bereits erfüllt)            |
| `src/components/ui/card.tsx`                   | byte-identisch (bereits erfüllt)            |

Reviewer-Befehl (Beispiel):

```bash
for f in \
  src/components/ui/sonner.tsx \
  src/components/ui/empty-state.tsx \
  src/components/ui/field-error.tsx \
  src/components/app/shell/DetailActionBar.tsx \
  src/components/app/shell/ConfirmDialog.tsx \
  src/lib/hooks/useUnsavedChangesGuard.ts \
  src/lib/hooks/useNavigationConfirm.ts \
  src/lib/forms/fieldErrors.ts; do
  diff -q "/Users/christian/repos/treffsicher/$f" "/Users/christian/repos/ringwerk/$f" \
    && echo "OK  $f" || echo "DIFF $f"
done
```

**Verhaltens-/Muster-Konsistenz (nicht byte-gleich, aber gleiches Schema — manuell prüfen):**

- [ ] Beide `Navigation.tsx` folgen dem Hamburger-Schema (Desktop `hidden md:flex`, Mobil
      `{mobileOpen && <nav className="border-t md:hidden">}`).
- [ ] `Target` = Disziplinen in beiden Apps; kein Marken-Logo nutzt `Target`.
- [ ] Logos eindeutig: Treffsicher `Crosshair`, Ringwerk `CircleDot`; kein Logo nutzt einen
      Funktions-/Semantik-Glyph (`Target`/`Trophy`).
- [ ] Detail-Aktionsleisten: Reihenfolge fachlich → destruktiv → Zurück, alle `ghost`.
- [ ] Kein `DropdownMenu`/`MoreHorizontal` mehr in Listen-Aktionen (Ringwerk
      `CompetitionActions`).
- [ ] Jede mutierende Server-Action im UI führt zu `toast.success`/`toast.error`.
- [ ] Feldfehler überall über `getFieldError` + `FieldError` mit `aria-invalid`/`aria-describedby`.
- [ ] Langformulare (`SessionForm`, `ShotRoutineEditor`, `CompetitionForm`) haben Dirty-Guard.
- [ ] Listen ohne „Details/Anzeigen"-Button; klickbare Navigation gemäß P1.3.
- [ ] Empty-States nutzen `EmptyState` (kein Inline-`<p className="rounded-lg border bg-card">`).

**Quality-Gates (beide Repos, vor Merge):**

```bash
docker compose -f docker-compose.dev.yml run --rm app npm run lint
docker compose -f docker-compose.dev.yml run --rm app npm run format:check
docker compose -f docker-compose.dev.yml run --rm app npm run test
docker compose -f docker-compose.dev.yml run --rm app npx tsc --noEmit
```

---

## 7. Offene Annahmen (vom Architekten getroffen)

1. **`next-themes` als sonner-Theme-Quelle** in Treffsicher akzeptiert, um `sonner.tsx`
   byte-identisch zu halten. Alternative (hart `theme="dark"`) dokumentiert, aber nicht bevorzugt.
2. **Ringwerk-Logo = `CircleDot`** gewählt: `Trophy` ist in Ringwerk bereits Semantik-Icon für
   „Wettbewerb/Sieger", daher wäre `Trophy` als Logo eine Kollision. `CircleDot` ist eindeutig,
   thematisch passend („Ring") und kollidiert mit keinem Funktions-/Semantik-Icon.
3. **Wettbewerbskarten in Ringwerk nicht ganz-klickbar** (Multi-Ziel-Objekt): stattdessen
   Name-als-Link auf `/competitions/[id]`. Bewusste, begründete Abweichung von „ganze Karte
   klickbar".
4. **ActionResult-Typen werden NICHT vereinheitlicht** — zu invasiv; FieldError-Konvention ist
   bewusst form-tolerant.
5. **Env-Variablen `ADMIN_*` vs. `SEED_ADMIN_*` werden NICHT umbenannt** (Breaking Change für
   Deployments). Nur dokumentiert.
6. **P2.3 hat keinen funktionalen Mangel** — Disziplinen werden in beiden Apps bereits beim Start
   geseedet; Angleichung ist rein kosmetisch (Logging) bzw. optional (CLI-`seed.ts` für Ringwerk).
7. **`toggleFavourite`-Rückgabe** ist in Treffsicher ggf. anzupassen, damit der Rollback-Fix
   ein Fehlersignal hat; der Impl-Agent prüft die aktuelle Signatur.
8. **Filter-Mechanik nicht als Datei geteilt** (app-spezifische Felder); nur das URL-State-Muster
   ist kanonisch.

```

```
