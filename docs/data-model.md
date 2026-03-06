# Datenmodell & Domänen-Specs — Verbindliche Regeln

Ausgelagert aus `docs/technical-constraints.md`. Gilt gleichrangig als verbindlich.

## Index

- **Datenmodell** — vollständiges Prisma-Schema (User, Sessions, Disciplines, ShotRoutines, Goals)
- **Umgebungsvariablen** — alle benötigten Env-Vars mit Beschreibung
- **Nutzerverwaltung & Rollen** — ADMIN/USER, kein Self-Service, Admin-Init
- **Disziplinen** — Archivierung (nicht Löschen), 5 vorinstallierte Standarddisziplinen
- **Ergebniserfassung** — Serien, Validierungsregeln (WHOLE/TENTH), Meyton-PDF Import

---

## Datenmodell (verbindlich)

Das Prisma-Schema implementiert dieses Modell. Abweichungen erfordern eine Migration und Begründung.

```
User
  ├── id, name?, email, passwordHash, role (ADMIN | USER)
  ├── createdAt, isActive (Boolean — deaktiviert statt gelöscht)
  │
  ├── Sessions (Einheiten)
  │     ├── id, userId
  │     ├── type: TRAINING | WETTKAMPF | TROCKENTRAINING | MENTAL
  │     ├── date (DateTime), location? (String)
  │     ├── disciplineId? (→ Discipline, nur bei TRAINING/WETTKAMPF)
  │     ├── isFavourite (Boolean)
  │     ├── trainingGoal? (String — bei TRAINING/TROCKENTRAINING/MENTAL)
  │     │
  │     ├── Wellbeing? (1:1, optional)
  │     │     └── sleep, energy, stress, motivation (je Int 0–100)
  │     │
  │     ├── Series[] (nur bei TRAINING/WETTKAMPF)
  │     │     ├── position (Int — Reihenfolge 1,2,3...)
  │     │     ├── isPractice (Boolean — Probeschuss-Serie)
  │     │     ├── scoreTotal? (Decimal(5,1) — Seriensumme, z.B. 94.7)
  │     │     ├── shots? (Json — Einzelschuss-Werte als Strings ["9.5","10.1"])
  │     │     └── executionQuality? (Int 1–5)
  │     │
  │     ├── Attachments[]
  │     │     ├── filePath (String — relativer Pfad im Upload-Volume)
  │     │     ├── fileType: IMAGE | PDF
  │     │     ├── originalName (String — für Anzeige)
  │     │     └── label? (String)
  │     │
  │     ├── Reflection? (1:1, optional)
  │     │     ├── observations? (String)
  │     │     ├── insight? (String — "Heute ist mir klargeworden, dass …")
  │     │     ├── learningQuestion? (String — "Was kann ich tun, um …?")
  │     │     ├── routineFollowed? (Boolean)
  │     │     └── routineDeviation? (String)
  │     │
  │     ├── Prognosis? (1:1, optional — nur TRAINING/WETTKAMPF)
  │     │     ├── fitness, nutrition, technique, tactics,
  │     │     │   mentalStrength, environment, equipment (je Int 0–100)
  │     │     ├── expectedScore? (Decimal(5,1))
  │     │     ├── expectedCleanShots? (Int)
  │     │     └── performanceGoal? (String)
  │     │
  │     ├── Feedback? (1:1, optional — nur TRAINING/WETTKAMPF)
  │     │     ├── fitness, nutrition, technique, tactics,
  │     │     │   mentalStrength, environment, equipment (je Int 0–100)
  │     │     ├── explanation? (String)
  │     │     ├── goalAchieved? (Boolean), goalAchievedNote? (String)
  │     │     ├── progress? (String)
  │     │     ├── fiveBestShots? (String)
  │     │     ├── wentWell? (String)
  │     │     └── insights? (String)
  │     │
  │     └── Goals[] (Many-to-Many via SessionGoal-Tabelle)
  │
  ├── Disciplines
  │     ├── id, name
  │     ├── seriesCount (Int), shotsPerSeries (Int)
  │     ├── practiceSeries (Int, Standard: 0)
  │     ├── scoringType: WHOLE | TENTH
  │     ├── isSystem (Boolean — systemweit für alle Nutzer)
  │     ├── isArchived (Boolean — archiviert statt gelöscht)
  │     └── ownerId? (→ User, null bei System-Disziplinen)
  │
  ├── ShotRoutines
  │     ├── id, userId (Pflicht — jeder Ablauf gehört einem Nutzer)
  │     ├── name (String)
  │     ├── disciplineId? (→ Discipline, optional)
  │     └── steps (Json — [{order: Int, title: String, description?: String}])
  │
  └── Goals
        ├── id, userId
        ├── title (String), description? (String)
        ├── type: RESULT | PROCESS
        ├── dateFrom (DateTime), dateTo (DateTime)
        └── Sessions[] (Many-to-Many via SessionGoal)

Speicher-Hinweise:
- Zehntelwertung: Decimal(5,1) — erlaubt Werte von 0.0 bis 999.9
- Ganzringwertung: Int (scoreTotal als Int, nicht Decimal)
- shots[]-Array: Json-Feld, Einzelwerte als Strings ("9.5") für exakte Dezimaldarstellung
- Archivierte/deaktivierte Einträge werden nie gelöscht — isArchived/isActive als Filter
```

---

## Umgebungsvariablen

Eine `.env.example` Datei dokumentiert alle benötigten Variablen.
Die echte `.env` Datei ist **niemals** im Repository eingecheckt (`.gitignore`).

```
DATABASE_URL=               # PostgreSQL Connection String (z.B. postgresql://user:pass@db:5432/treffsicher)
NEXTAUTH_SECRET=            # Zufälliger Secret für Session-Verschlüsselung (min. 32 Zeichen)
NEXTAUTH_URL=               # Öffentliche URL der App (z.B. https://training.example.com)
UPLOAD_DIR=                 # Pfad zum Upload-Verzeichnis (Standard: /app/uploads)
ADMIN_EMAIL=                # E-Mail des ersten Admin-Accounts (wird beim ersten Start angelegt)
ADMIN_PASSWORD=             # Passwort des ersten Admin-Accounts (min. 12 Zeichen)
AUTH_TRUST_PROXY_HEADERS=   # true nur bei vertrauenswürdigem Reverse Proxy (für IP-Rate-Limit)
AUTH_RATE_LIMIT_MAX_BUCKETS= # Max. In-Memory Buckets für Login-Rate-Limit (Standard: 10000)
PRISMA_AUTO_RESOLVE_FAILED_MIGRATIONS=         # true: bekannte P3009-Fälle automatisch auflösen
PRISMA_AUTO_RESOLVE_UNKNOWN_FAILED_MIGRATIONS= # false (sicherer Default): unbekannte Fälle stoppen
```

---

## Nutzerverwaltung & Rollen

- **Keine Selbstregistrierung** — nur Admins können Konten erstellen
- **Rollen**: `ADMIN` und `USER`
- **Erster Admin**: Wird automatisch beim ersten App-Start angelegt, wenn noch kein Admin existiert (aus `ADMIN_EMAIL` + `ADMIN_PASSWORD`)
- **Admin-Funktionen**: Nutzer anlegen, bearbeiten (Name, E-Mail, Rolle, Status), deaktivieren, Passwort zurücksetzen
- **Nutzer-Funktion**: Eigenes Passwort ändern unter `/account` (aktuelles Passwort erforderlich)
- **Session-Invalidierung**: Passwortwechsel/-Reset erhöht `sessionVersion` — alte JWTs werden ungültig

---

## Disziplinen

### Verhalten bei Löschung

- Disziplinen werden **archiviert, nicht gelöscht** — bestehende Einheiten bleiben lesbar
- Archivierte Disziplinen erscheinen nicht mehr in der Auswahl für neue Einheiten

### Vorinstallierte Standarddisziplinen

| Name                 | Serien | Schuss/Serie | Wertung      |
| -------------------- | ------ | ------------ | ------------ |
| Luftpistole          | 4      | 10           | Ganzringe    |
| Luftgewehr           | 4      | 10           | Ganzringe    |
| Luftgewehr (Zehntel) | 4      | 10           | Zehntelringe |
| Luftpistole Auflage  | 3      | 10           | Zehntelringe |
| Luftgewehr Auflage   | 3      | 10           | Zehntelringe |

Standarddisziplinen gehören dem System (`isSystem: true`, `ownerId: null`) und sind für alle Nutzer sichtbar.
Admins können System-Disziplinen verwalten (anlegen, bearbeiten, archivieren/reaktivieren).

---

## Ergebniserfassung

- **Standard**: Seriensumme (z.B. 94 Ringe bei Ganzwertung, 94.7 bei Zehntelwertung)
- **Optional**: Einzelschuss-Eingabe aktivierbar — Seriensumme wird dann automatisch berechnet
- **Gültige Wertebereiche**:
  - Ganzringe: 0–10 pro Schuss
  - Zehntelringe: 0.0 oder 1.0–10.9 (0.1–0.9 existieren gemäss ISSF nicht)
- **Wahl gilt pro Einheit**: Nicht global konfigurierbar
- **Probeschuss-Serien**: Immer als Seriensumme, fliessen nicht in Gesamtergebnis ein

### Validierungsregeln

| Wertungsart  | Gültige Schusswerte                                       | Max. Seriensumme          |
| ------------ | --------------------------------------------------------- | ------------------------- |
| WHOLE        | 0–10, ganzzahlig                                          | `Schussanzahl × 10`       |
| TENTH        | 0.0 oder 1.0–10.9 (1 Dezimalstelle)                      | `Schussanzahl × 10.9`     |

Leere Felder gelten nie als Fehler. Implementiert in `src/lib/sessions/validation.ts`.

### Meyton-PDF Import (verbindlich)

- Import-Startpunkt: Dialog direkt im Einheit-Formular (`neu` und `bearbeiten`)
- Quelle: `URL` oder Datei-Upload (`application/pdf`)
- Verarbeitung: strikt textbasiert (kein OCR)
- Architekturtrennung: **PDF laden** → **Text extrahieren** → **Meyton-Parsing**
- Serienerkennung: über `Serie <n>:`; Reihenfolge entspricht Dokumentreihenfolge
- Schussparser: nur Werte im Bereich `0.0` bis `10.9`; Marker (`*`, `T`) und Footer-Texte werden ignoriert
- Importierte Serien sind initial immer `isPractice: false`
- Bei Disziplin `WHOLE`: jeder importierte Schusswert wird per `Math.floor()` umgerechnet
- Import ersetzt die aktuell geladenen Serien im Formular vollständig
- Import speichert nicht direkt in der DB — Speichern erst durch Nutzeraktion
- Bei neuen, noch nicht gespeicherten Einheiten kann Datum/Uhrzeit aus dem PDF übernommen werden
- Fehlerstrategie: harter Abbruch mit deutscher Fehlermeldung, kein Teilimport
- Schutzgrenzen:
  - Datei-Grenze 10 MB (Upload und URL-Import)
  - URL-Import: 15 Sekunden Timeout, keine Redirects
  - Dekompression: 2 MB pro Stream, 8 MB gesamt, 25'000 Tokens
  - Formularübernahme: max. 120 Serien, max. 120 Schusswerte pro Serie
