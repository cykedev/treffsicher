# Shared Conventions — Treffsicher × Ringwerk

> **Lebende Quelle der Wahrheit für app-übergreifende Konsistenz.** Diese Datei ist in beiden Repos
> **byte-identisch** und wird vom Drift-Gate (`vereinsheim/scripts/consistency-check.sh`) erzwungen.
> Änderungen hier immer in **beiden** Repos gleich einpflegen.
>
> Löst die historischen Migrationsdokumente `ui-unification-spec.md` und `baseline-fix-canon.md` ab.

## 1. Byte-identische Shared-Schicht

Diese Dateien MÜSSEN in beiden Repos identisch sein (Gate = fatal bei Abweichung):

- Configs: `components.json`, `eslint.config.mjs`, `.prettierrc`, `tsconfig.json`, `postcss.config.mjs`,
  `next.config.ts`, `Dockerfile`, `src/app/globals.css`
- Error-Boundaries: `src/app/error.tsx`, `src/app/(app)/error.tsx`
- ui-Primitives: alle gemeinsamen `src/components/ui/*` (insb. `button`, `card`, `sonner`,
  `empty-state`, `field-error`, `dropdown-menu`)
- Shell: `src/components/app/shell/{DetailActionBar,ConfirmDialog,PageHeader}.tsx`
- Hooks/Forms: `src/lib/hooks/{useUnsavedChangesGuard,useNavigationConfirm}.ts`, `src/lib/forms/fieldErrors.ts`
- Diese Datei: `docs/shared-conventions.md`

Regel: Wer eine dieser Dateien ändert, ändert sie in **beiden** Repos gleich. Neue, klar
app-übergreifende Komponenten gehören in diese Liste (in `MUST_MATCH` des Gates ergänzen).

## 2. Komponenten-Kanon

- **Seitenkopf:** `<PageHeader title description action />` (`shell/PageHeader.tsx`). Kein inline-h1.
  Detailseiten mit oberer Aktionsleiste nutzen stattdessen `DetailActionBar` (siehe unten) + rohes
  `h1` im selben Stil.
- **Detail-Aktionen:** `<DetailActionBar>` — Inline-`ghost`-Buttons oben rechts, Reihenfolge
  **fachlich → destruktiv → Zurück**. **Kein** `DropdownMenu`/`MoreHorizontal` für Objekt-Aktionen.
- **Leerzustände:** `<EmptyState title description icon actionLabel actionHref />`. Kein inline
  `Keine … vorhanden`.
- **Bestätigungen:** `<ConfirmDialog>` (destruktiv: `destructive`-Prop). Nie native `confirm()`.
- **Feldfehler:** `getFieldError`/`getGeneralError` (`lib/forms/fieldErrors.ts`) + `<FieldError>` mit
  `aria-invalid`/`aria-describedby`.
- **Toasts:** nach jeder mutierenden Server-Action `toast.success(...)` bzw. `toast.error(...)` (sonner).
- **Datenverlust:** Langformulare nutzen `useUnsavedChangesGuard` + `useNavigationConfirm` + `ConfirmDialog`.

## 3. Typografie & Layout

- Seitentitel: `text-2xl font-semibold tracking-tight` (**nicht** `font-bold`).
- Untertitel: `text-sm text-muted-foreground`.
- Pending-/Lade-Texte: Unicode-Ellipsis `…` (U+2026), nie ASCII `...`.
- App-Shell: `mx-auto max-w-6xl px-4 py-8`. Pro-Seiten-`max-w` (z.B. enger für Lesbarkeit) ist
  erlaubt, aber bewusst zu setzen.

## 4. Icon-Vokabular (lucide-react)

| Bedeutung   | Icon         |     | Bedeutung        | Icon                       |
| ----------- | ------------ | --- | ---------------- | -------------------------- |
| Disziplinen | `Target`     |     | Bearbeiten       | `Pencil`                   |
| Löschen     | `Trash2`     |     | Archiv / Restore | `Archive`/`ArchiveRestore` |
| Neu anlegen | `Plus`       |     | Zurück           | `ArrowLeft`                |
| Konto       | `UserCircle` |     | Abmelden         | `LogOut`                   |
| Mobil-Menü  | `Menu`/`X`   |     | PDF/Download     | `Download`                 |

Marken-Logos (kollisionsfrei, je App eindeutig): **Treffsicher `Crosshair`**, **Ringwerk `CircleDot`**.
`Target` ist Disziplinen, `Trophy` ist in Ringwerk Wettbewerb/Sieger — **keines davon als Logo**.

## 5. Navigation

Hamburger-Schema in beiden: Desktop `hidden md:flex`-Links + Logo links, Konto als `UserCircle`-
**Dropdown** rechts („Mein Konto" + Separator + „Abmelden"). Mobil `{mobileOpen && <nav className="border-t md:hidden">}`.

## 6. Daten & Formatierung

- Datum/Zeit/Zahl über `src/lib/dateTime.ts` (`formatDateOnly(date, displayTimeZone)` etc.) — **kein**
  inline `new Intl.DateTimeFormat(...)` in Seiten.
- Zeitzone-Default: `Europe/Berlin` (beide Apps).
- **ActionResult-Kanon** (Zielform, Ringwerk-Muster): diskriminierte Union
  `{ success: true; data?: T } | { error: string | Record<string, string[] | undefined> }`.
  _Hinweis: Treffsichers Module sind noch nicht vollständig migriert — geplanter Folgeschritt._

## 7. Listen & Karten

Ganze Karte ist Link auf die Detailseite; keine „Details →"-Buttons. Ausnahme Ringwerk-Wettbewerbe
(Mehrfachziel): Name-als-Link. Verwaltungslisten zeigen kompakte Karten.

## 8. Drift-Schutz (Prozess)

- **Gate:** `vereinsheim/scripts/consistency-check.sh` läuft vor jedem Release (in
  `build-and-push.sh`) und ist **fatal** bei Abweichung der Shared-Schicht/Configs, **warnend** bei
  Dependency-Drift und Anti-Pattern.
- **Geplant (Tier 1):** die Shared-Schicht in ein gemeinsames Paket/Workspace ziehen, damit Drift
  strukturell unmöglich wird (siehe `vereinsheim/docs/consistency.md`).
- **Offene Angleichungen:** ActionResult-Vereinheitlichung (Treffsicher), Dependency-Pins
  (inkl. TypeScript-Major).
