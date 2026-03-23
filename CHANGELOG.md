# Changelog

## [1.4.0] — 2026-03-23

### Neu
- Combo-System: Aufeinanderfolgende richtige Antworten bauen einen Combo-Multiplikator auf (+5/+10/+20 XP)
- Perfekte Runde: 100% Genauigkeit in einer Session gibt extra +25 XP und ein spezielles Abzeichen
- Persönlicher Rekord: Nach jeder Session Vergleich mit deiner bisherigen Bestleistung
- Gedächtnis-Zeitlimit: Ab Level 5 lauft ein Countdown (120s/90s/60s) — der Druck steigt!
- Combo-Anzeige live im Spiel: Bei 3+ richtigen in Folge leuchtet die Flamme
- 6 neue Badges: Combo x3, Combo x5, Combo-Meister, Perfekte Runde, Legende (5000 XP) und mehr
- Badge-System jetzt vollstandig verknupft: Badges werden nach jeder Session automatisch freigeschaltet

### Verbesserungen
- Ergebnis-Screen zeigt jetzt XP-Aufschlussel (Basis + Combo-Bonus + Perfekt-Bonus)
- Brain-Zentrale: Tages-Mission korrekt initialisiert
- TypeScript: Alle Typen bereinigt (avg_response_ms optional, BrainDailyMission snake_case)

## [1.3.0] — 2026-03-22

### Neu
- Gehirn-Zentrale: Neuer Tab mit kognitivem Training (Gedächtnis, Sprache, Logik, Reaktion)
- Memory-Karten: Klassisches Kartenspiel mit adaptiver Schwierigkeit und Reanimated Flip-Animation
- Anagramm: Buchstaben antippen und zum richtigen Wort anordnen, Zeitlimit per Level
- Zahlenreihen + Mathe-Sprint: Multiple-Choice Sequenzen und Tipp-Eingabe mit Combo-Bonus
- Tap-Target + Stroop-Test: Reaktionsmessung und kognitiver Interferenz-Test
- Adaptive Schwierigkeit: Level steigt automatisch wenn Genauigkeit > 80%
- XP-System mit animierter XP-Leiste und Gesamt-Level
- Tages-Mission: Täglich wechselnde Aufgabe mit XP-Belohnung
- 15 Badges (freigeschaltet/gesperrt) mit Unlock-Logik
- Vollständige Kognitivstatistiken per Domain (faltbare Sektionen)
- Patientenakte kompakt in Einblicke: Accordion-Ansicht direkt im Tab

### Verbesserungen
- Einblicke-Tab: Profil-Sektionen jetzt als kompakte Accordion-Karte mit Farbkodierung
- "Vollständige Akte öffnen" Link aus Einblicke direkt zur Patientenakte

## [1.2.0] — 2026-03-22

### Neu
- Patientenakte: strukturiertes Profil im psychiatrischen Akten-Format mit Sektionen (Anamnese, Psychisches Bild, Auslöser & Stressoren, Ressourcen & Coping, Soziales & Persönliches, Verlaufsnotizen)
- Eigener Screen "Patientenakte" mit stilvoller Ansicht: Patientenkopf, Stimmungsstatistiken, farbcodierte Sektionen
- Akte wird automatisch nach jedem Gespräch und manuell über Einblicke aktualisiert
- Zeitstempel der letzten Aktualisierung wird angezeigt
- Direktlink zur Patientenakte aus den Einstellungen

### Verbesserungen
- Einstellungen: Sektion "KI-Gehirn" umbenannt zu "Patientenakte" mit "Akte ansehen"-Button
- KI generiert jetzt strukturierte Fallnotizen statt einfacher Bullet-Points

## [1.1.0] — 2026-03-21

### Neu
- Quadrat-Atmung (Box Breathing): 4-4-4-4 Atemtechnik mit Visualisierung
- Grounding-Ubung: 5-4-3-2-1 Technik durch alle Sinne
- Progressive Muskelentspannung: 7 Muskelgruppen, Anspannen und Loslassen
- Persoenliches Profil: CageMind erstellt ein Profil aus allen Daten
- Einblicke-Tab: Profil-Karte mit Zusammenfassung und Insights
- Chat: Kontext-Sliding-Window fuer lange Unterhaltungen
- Offline-Erkennung im Chat mit Hinweisbanner

### Fixes
- Streak-Berechnung mit lokalem Datum (kein UTC-Versatz mehr)
- Uebungstypen vollstaendig in Datenbank unterstuetzt

## [1.0.0] — 2026-03-21

### Neu
- Erste Release von CageMind
- Claude AI Chatbot mit Streaming (Anthropic API)
- 4-7-8 Atemubung mit Animation und Haptik-Feedback
- Gefahls-Tagebuch mit Stimmungsauswahl
- SOS-Notfallscreen mit Sofort-Hilfe-Schritten
- 7-Tage Stimmungsverlauf (SVG Chart)
- 23 Affirmationen mit Favoriten-Funktion
- Streak-Tracking fur tagtliche Nutzung
- Telefonseelsorge-Banner im SOS-Bereich
- GitHub Auto-Update-Check beim App-Start
- Vollstandiges Onboarding
- Lokale Erinnerungen (Push Notifications)
- 100% offline (auber Claude Chat)

### Hinweise
- Anthropic API-Schlussel in den Einstellungen eintragen
- App funktioniert auch ohne Key — Chat ist dann deaktiviert
- Kein Tracking, kein Analytics, kein Firebase
