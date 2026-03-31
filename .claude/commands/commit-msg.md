Analysiere die aktuellen Änderungen im Arbeitsbereich und erstelle eine passende Commit-Message.

Führe folgende Schritte aus:

1. Führe `git diff --staged` aus. Falls leer, führe `git diff HEAD` aus, um alle uncommitteten Änderungen zu sehen.
2. Führe zusätzlich `git status` aus, um neue (ungetrackte) Dateien zu sehen.
3. Analysiere die Änderungen: Was wurde geändert, hinzugefügt oder entfernt? Was ist der fachliche Zweck?
4. Gib **nur** die fertige Commit-Message aus — kein erklärender Text darum herum.

## Verbindliche Regeln für die Commit-Message

**Format:**

```
type: short imperative summary

- Bullet point describing what and why
- Another bullet point if needed
```

**Types:**

- `feat` — neue Funktionalität
- `fix` — Bugfix
- `refactor` — Umstrukturierung ohne Verhaltensänderung
- `style` — Formatierung, kein Logik-Change (Prettier, Lucide icons, CSS)
- `docs` — nur Dokumentation
- `chore` — Build, Dependencies, Konfiguration
- `test` — Tests hinzufügen oder ändern
- `perf` — Performance-Verbesserung

**Regeln:**

- Alles Englisch
- Erste Zeile: imperativ, kein Punkt am Ende, max. 72 Zeichen
- Bullet Points mit `-`, beschreiben WAS geändert wurde und WARUM (nicht nur "refactoring")
- Kein "various changes", "updates", "fixes" ohne Kontext
- Bei mehreren unabhängigen Bereichen: den dominanten Typ wählen und alle Bereiche in den Bullets abdecken
- Keine Co-Authored-By Zeile

## Beispiele

```
feat: add drag-and-drop Meyton PDF import to session form
- Listen for window dragover/drop events in SessionForm to accept dropped PDF files
- Auto-select favourite discipline when a PDF is dropped on the new session form
- Trigger Meyton import preview automatically on drop
```

```
refactor: split session server actions into focused sub-modules
- Extract attachmentActions.ts, mentalActions.ts, meytonActions.ts, sessionActions.ts
  from monolithic actions.ts
- Barrel-export all actions through actions.ts for backward compatibility
```

```
fix: restrict attachment file serving to the owning user
- Rewrite uploads API route to verify session and match attachment userId before
  serving file
- Return 401/403 for unauthenticated or unauthorized access attempts
```
