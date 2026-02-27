# Fachliche Anforderungen — Schiesstraining App

## Projektziel

Eine digitale Trainingsunterstützungs-App für Schiesssportler, die Trainingstagebuch, Ergebniserfassung und Mentaltraining zu einem kohärenten System verbindet. Die App soll sowohl von Hobbyschützen (minimaler Aufwand) als auch von ambitionierten Wettkampfschützen (voller Funktionsumfang) genutzt werden können. Sie ist disziplinunabhängig aufgebaut und für den Einzelnutzer wie auch für den Vereinseinsatz geeignet.

---

## Zielgruppen

- **Hobbyschütze**: Schnelle Ergebniserfassung, kein Aufwand für Felder die ihn nicht interessieren
- **Ambitionierter Wettkampfschütze**: Vollständige Nutzung aller Ebenen (Mentaltraining, Statistiken, Trends)
- **Verein**: Mehrere Schützen, eigene Daten, zentrale Nutzerverwaltung

---

## Kernprinzipien

1. **Session-zentrisch**: Alles dreht sich um eine "Einheit" (Training, Wettkampf, Trockentraining)
2. **Progressive Komplexität**: Minimale Pflichtfelder — nur Ringe eingeben reicht aus
3. **Mentaltraining integriert**: Kein separates Modul, natürlicher Bestandteil jeder Einheit
4. **Dreiklang**: Vor der Einheit (Intention) → Ergebnisse → Nach der Einheit (Reflexion)
5. **Optional, nicht zwingend**: Jede Erweiterung (Befinden, Reflexion, Prognose) ist freiwillig

---

## Disziplinen

Disziplinen sind frei durch den Nutzer konfigurierbar. Folgende Eigenschaften werden je Disziplin definiert:

- Name (z.B. "Luftpistole 40", "Luftpistole Auflage 30")
- Anzahl Wertungsserien
- Schuss pro Serie
- Wertungsart: ganzzählig (z.B. 1–10) oder Zehntelwertung (z.B. 10.9)
- Anzahl Probeschuss-Serien (optional)

Das System wird mit gängigen Standarddisziplinen vorinstalliert geliefert (z.B. Luftpistole: 4 Serien × 10 Schuss, Ganzringwertung).

---

## Die Einheit — Herzstück des Systems

### Einheitentypen

| Typ             | Beschreibung                        |
| --------------- | ----------------------------------- |
| Training        | Reguläres Schiessen                 |
| Wettkampf       | Wettkampfschiessen                  |
| Trockentraining | Übungen ohne Ergebnis               |
| Mentaltraining  | Reine mentale Arbeit ohne Schiessen |

### Pflichtfelder (alle Typen)

- Datum und Uhrzeit
- Einheitentyp
- Disziplin (bei Training und Wettkampf)

### Optionale Basisfelder

- Ort (Freitext oder aus früheren Einträgen)

---

## Ergebniserfassung

Gilt für Einheitentypen "Training" und "Wettkampf".

### Serien

- Die Anzahl und Struktur der Serien ergibt sich aus der gewählten Disziplin — diese Werte sind **Standardvorgaben, keine fixen Limits**
- Im Training (und allen Typen ausser Wettkampf) kann die Serienanzahl und die Schussanzahl pro Serie **frei angepasst** werden (z.B. nur 2 statt 4 Serien schiessen, oder eine Serie mit 5 statt 10 Schuss)
- Serien mit abweichender Schussanzahl erzeugen **keine falschen Berechnungen**: Statistiken und Gesamtergebnisse basieren auf den tatsächlich erfassten Rohwerten
- Erfassung der Ringe je Serie (Summe oder Einzelschuss — je nach Präferenz)
- Wertung in ganzen Ringen oder Zehntelringen (gemäss Disziplin)
- Probeschuss-Serien können optional separat erfasst werden (fliessen nicht in die Wertung ein)
- Optionale Bewertung der Ausführungsqualität je Serie (Skala 1–5, subjektiv): Erlaubt die Unterscheidung zwischen "gutes Ergebnis trotz schlechter Technik" und umgekehrt

### Gesamtergebnis

- Wird automatisch aus den Serienergebnissen berechnet
- Anzeige: Ringe gesamt, Ringe je Serie, Durchschnitt

---

## Befinden-Tracking

Vor jeder Einheit kann das aktuelle Befinden erfasst werden (Schieberegler 0–10):

- Schlafqualität
- Energieniveau
- Stressniveau
- Motivation

Diese Daten werden in Statistiken mit Ergebnissen korreliert, um persönliche Muster sichtbar zu machen.

---

## Reflexion nach der Einheit

Nach einer Einheit können folgende optionale Felder ausgefüllt werden:

- **Freie Beobachtungen**: Was lief gut? Was fiel auf?
- **Erfolgsmonitoring**: Ergänze den Satz "Heute ist mir klargeworden, dass …"
- **Lernfrage**: Ergänze den Satz "Was kann ich tun, um …?"
- **Schuss-Ablauf**: Wurde der Ablauf eingehalten? (Ja/Nein + optionale Notiz zu Abweichungen)

---

## Prognose & Feedback (Wettkampf und fokussiertes Training)

Diese Erweiterung ist für Wettkämpfe vorgesehen, kann aber auch für fokussierte Trainingseinheiten aktiviert werden.

### Prognose (vor der Einheit)

- **Selbsteinschätzung** des aktuellen Leistungsstands in 7 Dimensionen (Skala 0–100):
  - Kondition
  - Ernährung
  - Technik
  - Taktik
  - Mentale Stärke
  - Umfeld
  - Material
- **Ergebnisprognose**: Erwartete Ringe und erwartete Anzahl sauberer Schüsse
- **Leistungsziel**: Freitext — kann ein Ringergebnis sein, aber auch ein technischer oder mentaler Teilaspekt

### Feedback (nach der Einheit)

- **Tatsächlicher Leistungsstand** in den gleichen 7 Dimensionen (Skala 0–100)
- **Erklärungstext** zum tatsächlichen Stand
- **Automatischer Vergleich** zwischen Prognose und tatsächlichem Stand
- **Leistungsziel erreicht?** (Ja/Nein + Freitext)
- **Fortschritte** durch diese Einheit (Freitext)
- **Five Best Shots**: Was waren die besten 5 Schüsse? (Freitext)
- **Was lief besonders gut** (Freitext)
- **Aha-Erlebnisse** (Freitext)

---

## Schuss-Ablauf

Der Schuss-Ablauf ist ein eigenes, jederzeit editierbares Dokument — unabhängig von einzelnen Einheiten. Er beschreibt den idealen Ablauf eines Schusses in geordneten Schritten.

- Strukturiert als geordnete Liste von Schritten (frei editierbar)
- Mehrere Abläufe möglich (z.B. je Disziplin oder Wettkampf vs. Training)
- Einheiten können mit dem Ablauf verknüpft werden: Abweichungen werden als Notiz bei der Einheit festgehalten

**Hintergrund**: Ziel ist, den Ablauf bewusst zu kennen und zu beschreiben, damit er unbewusst (automatisch) ausgeführt werden kann. Abweichungen werden erkannt, dokumentiert und führen bei Bedarf zur Anpassung des Ablaufs.

---

## Saisonziele

Ziele auf Saisonebene können verwaltet werden:

- Titel und Beschreibung
- Typ: Ergebnisziel (messbar) oder Prozessziel (Verhaltensänderung)
- Zeitraum: frei wählbares Von–Bis Datum (eine "Saison" ist kein fixes Kalenderjahr, sondern ein frei benannter Zeitraum, z.B. "Saison 2025", "Wintervorbereitung")
- Einheiten können Zielen zugeordnet werden
- Übersicht: Wie viele Einheiten wurden einem Ziel gewidmet?

---

## Dateien & Bilder

An jede Einheit können Dateien angehängt werden:

- Bilder (z.B. Schussbild / Trefferbild)
- PDFs (z.B. Wettkampfausdruck)
- Beliebige Dateien
- Je Anhang kann eine optionale Beschriftung vergeben werden

---

## Statistiken & Auswertung

### Zeiträume

- Frei konfigurierbar (von–bis Datumswahl)
- Voreinstellungen: letzte 4 Wochen, laufende Saison, gesamte Zeit

### Filter

- Training, Wettkampf oder beides kombiniert
- Disziplin-Filter

### Auswertungsansichten

- **Ergebnisverlauf**: Gesamtringe über Zeit mit gleitendem Trend
- **Serienwertungen**: Minimum, Maximum, Durchschnitt je Serienposition
- **Befinden-Korrelation**: Schlaf / Energie / Stress vs. Ergebnis
- **Selbsteinschätzung (7 Dimensionen)**: Radarchart über Zeit (Prognose vs. Feedback)
- **Schussqualität vs. Ringe**: Visualisierung ob Technikqualität und Ergebnis übereinstimmen

---

## Nutzerverwaltung & Sicherheit

- Jeder Nutzer hat einen eigenen Account mit Login und Passwort
- Konten werden ausschliesslich durch Administratoren erstellt — keine Selbstregistrierung
- Jeder Nutzer sieht ausschliesslich seine eigenen Daten
- Die Anwendung ist über das Internet zugänglich (Web-App)
- Datenschutz: Keine Daten sind ohne Login einsehbar

### Vereinsbetrieb

- Mehrere Nutzer können die gleiche Instanz verwenden
- Jeder Schütze hat seine eigene, abgeschottete Datenwelt
- Administratoren können Nutzer anlegen, deaktivieren und Passwörter zurücksetzen
- Standarddisziplinen sind systemweit für alle Nutzer sichtbar
- Administratoren können neue systemweite Disziplinen für alle Nutzer bereitstellen

---

## Export

- Einzelne Einheiten oder Zeiträume können exportiert werden (PDF und/oder CSV)
- Export dient der bewussten Weitergabe an Trainer oder für eigene Archivierung
- Kein automatischer Trainer-Zugang — Export ist ein manueller, bewusster Schritt

---

## Offene Punkte (spätere Phasen)

- Offline-Nutzung am Schiessstand (bei schlechter oder fehlender Internetverbindung)
- Trockentraining als vollständig eigener Einheitentyp mit spezifischen Feldern
- Mustererkennung / smarte Auswertungen ("Wie schiesse ich nach schlechtem Schlaf?")
- Trainer-Zugang (read-only, eingeschränkt)
