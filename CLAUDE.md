# 🧠 CageMind — Claude Code Agent Directive

> Dieses Dokument ist die einzige Wahrheit. Lies es vollständig bevor du EINEN Schritt machst.

---

## 🎯 Projektauftrag

Baue die App **CageMind** — ein warmer, freundlicher digitaler Begleiter für Menschen mit Angststörungen. Expo React Native, Android-first, Claude AI als Chatbot-Kern, 100% lokal außer dem Chat.

**Bundle ID:** `com.cagemind.app`  
**Plattform:** Android (Emulator via ADB für Tests)  
**Sprache:** TypeScript strict, alle UI-Texte Deutsch  
**GitHub Repo:** `NosKovsky/CageMind` → `https://github.com/NosKovsky/CageMind`  
**Anthropic API Key:** `sk-ant-api03-[DEIN_KEY_HIER]` *(in AsyncStorage unter `claude_api_key` speichern — nie hardcoden!)*

---

## 🔧 MCP Server & Tools — Vollständige Ausstattung

Du hast Zugriff auf folgende MCP-Server. Nutze sie aktiv, nicht passiv:

### Filesystem MCP
- Lesen/Schreiben aller Projektdateien
- Diff-Checks vor und nach Änderungen
- Verzeichnisstruktur validieren

### ADB MCP (Android Debug Bridge)
```
Emulator starten:     adb devices → prüfen ob Emulator läuft
App installieren:     expo run:android --device <id>
Logcat streamen:      adb logcat -s ReactNative:V ReactNativeJS:V
Screenshot:           adb exec-out screencap -p > /tmp/screen.png
App-Logs filtern:     adb logcat | grep -E "(CageMind|ERROR|WARN)"
App neustarten:       adb shell am force-stop com.cagemind.app && adb shell am start -n com.cagemind.app/.MainActivity
Daten löschen:        adb shell pm clear com.cagemind.app
```

### Shell/Terminal MCP
- `npx expo` Commands ausführen
- `npm install` / `npx expo install`
- TypeScript-Checks: `npx tsc --noEmit`
- Metro bundler kontrollieren

### Web Search MCP
- Expo SDK 52 Breaking Changes nachschlagen
- NativeWind v4 Syntax prüfen
- React Native Reanimated v3 APIs verifizieren
- Fehler googeln bevor du ratst

### GitHub MCP
```
Repo:           NosKovsky/CageMind

Release erstellen:
  gh release create v1.0.0 \
    --title "CageMind v1.0.0 — Erster Release 💜" \
    --notes-file CHANGELOG.md \
    android/app/build/outputs/apk/release/app-release.apk

Latest Release Info holen:
  gh release view --json tagName,body,publishedAt

Release-Liste:
  gh release list --limit 10

Tag setzen + pushen:
  git tag -a v1.0.0 -m "Release v1.0.0" && git push origin v1.0.0
```
- Nach jedem erfolgreichen Build: `gh release create` mit APK als Asset
- `CHANGELOG.md` im Projektroot wird automatisch als Release Notes genutzt
- Versionsnummer muss in `app.json` → `version` und `android.versionCode` synchron sein

### Memory MCP (tasks/)
- `tasks/todo.md` — aktiver Arbeitsplan
- `tasks/lessons.md` — gelernde Muster & Fehler-Regeln
- `tasks/progress.md` — was ist fertig, was fehlt

---

## 🗂️ Workflow-Prinzipien (NICHT OPTIONAL)

### 1. Plan First — Immer
Bei JEDER nicht-trivialen Aufgabe (3+ Schritte oder Architekturentscheidungen):

```
1. Schreibe Plan in tasks/todo.md (checkbare Items)
2. Überprüfe Plan auf Lücken
3. Erst dann: Implementierung starten
4. Items als erledigt markieren während du arbeitest
5. Review-Sektion in tasks/todo.md eintragen wenn fertig
```

Wenn etwas schiefläuft: **SOFORT STOPPEN, neu planen.** Nicht weiter drücken.

### 2. Subagent-Strategie
Nutze Subagenten freigiebig um den Haupt-Kontext sauber zu halten:

- **Recherche-Subagent:** Expo/RN API-Docs, Library-Versionen, Breaking Changes
- **Explorations-Subagent:** Unbekannte Datei-Strukturen analysieren
- **Parallel-Subagent:** Unabhängige Screens gleichzeitig bauen
- **Verifikations-Subagent:** Tests laufen lassen, Logs auswerten

Regel: **Ein Task = Ein Subagent**. Nie mehrere unabhängige Probleme in einem Subagenten mischen.

### 3. Self-Improvement Loop
Nach JEDER Korrektur vom User:
```
→ tasks/lessons.md öffnen
→ Pattern dokumentieren: Was war falsch? Warum? Wie fix ich es künftig?
→ Regel formulieren die denselben Fehler verhindert
→ Session-Start: lessons.md reviewen für relevantes Projekt
```

### 4. Verification Before Done
**Niemals eine Aufgabe als erledigt markieren ohne Beweis:**

```bash
# TypeScript Check
npx tsc --noEmit

# Metro Bundle starten
npx expo start --android

# ADB: App auf Emulator deployen
npx expo run:android

# Logcat auf Errors prüfen
adb logcat | grep -E "(ERROR|FATAL|CageMind)"

# Screenshot machen und prüfen
adb exec-out screencap -p > /tmp/screen_$(date +%s).png
```

Frage dich: **"Würde ein Staff Engineer das so abnicken?"** Wenn nein → iterieren.

### 5. Eleganz-Check (ausgewogen)
Bei nicht-trivialen Änderungen: Pause. Frage: *"Gibt es einen eleganteren Weg?"*

Wenn ein Fix sich hacky anfühlt: *"Kenne ich jetzt alle Fakten — implementiere die elegante Lösung."*

Aber: Nicht over-engineeren. Simple, offensichtliche Fixes direkt umsetzen.

### 6. Autonomes Bug-Fixing
Wenn ein Bug-Report kommt: **Einfach fixen.** Keine Rückfragen für Basics.

```
1. Logs lesen (adb logcat)
2. Root Cause finden
3. Fix implementieren
4. Auf Emulator testen
5. Screenshot als Beweis
```

---

## 📦 Tech Stack (exakt diese Versionen)

```json
{
  "expo": "~52.0.0",
  "react": "18.3.2",
  "react-native": "0.76.x",
  "expo-router": "~4.0.0",
  "expo-sqlite": "~15.0.0",
  "@react-native-async-storage/async-storage": "^2.0.0",
  "react-native-reanimated": "~3.16.0",
  "expo-haptics": "~14.0.0",
  "expo-notifications": "~0.29.0",
  "expo-keep-awake": "~14.0.0",
  "nativewind": "^4.0.0",
  "tailwindcss": "^3.4.0",
  "lucide-react-native": "^0.460.0",
  "react-native-gifted-chat": "^2.6.0",
  "react-native-svg": "^15.0.0",
  "semver": "^7.6.0"
}
```

**Installationsreihenfolge beachten:**
```bash
npx create-expo-app@latest CageMind --template blank-typescript
cd CageMind
npx expo install expo-router expo-sqlite @react-native-async-storage/async-storage
npx expo install react-native-reanimated expo-haptics expo-notifications expo-keep-awake
npx expo install react-native-svg
npm install nativewind tailwindcss react-native-gifted-chat lucide-react-native semver
```

---

## 🎨 Design System (exakt einhalten)

```typescript
// lib/constants.ts — Theme
export const COLORS = {
  bg:        '#12111A',  // Hintergrund — tiefes Dunkelviolett
  surface:   '#1C1B28',  // Cards, Inputs
  surface2:  '#252436',  // Elevated Cards
  accent:    '#A78BFA',  // Primäre Akzentfarbe (Lavendel)
  accent2:   '#86EFAC',  // Erfolge, Positiv (zartes Grün)
  warm:      '#FCD34D',  // Streak, Energie (Goldgelb)
  text:      '#F1F0FA',  // Primärtext
  muted:     '#7B7A96',  // Sekundärtext, Placeholder
  danger:    '#F87171',  // NUR für echten SOS-Bereich
} as const;

// Ton & Sprache
// - Immer Du-Form
// - Max. 3-4 Sätze pro Claude-Antwort
// - Emojis: sparsam, liebevoll
// - Kein Fachchinesisch, keine Diagnosen
```

---

## 🏗️ App-Struktur (vollständig)

```
CageMind/
├── app/
│   ├── _layout.tsx                  # Root Layout + DB Init + Splash
│   ├── index.tsx                    # Redirect: Onboarding vs Home
│   ├── onboarding/
│   │   ├── _layout.tsx
│   │   ├── welcome.tsx              # "Hey, ich bin CageMind 👋"
│   │   ├── disclaimer.tsx           # Kein Therapieersatz + Consent
│   │   └── setup.tsx                # Name + API Key + Notifications
│   ├── (tabs)/
│   │   ├── _layout.tsx              # Bottom Tab Navigator (5 Tabs)
│   │   ├── home.tsx                 # Dashboard
│   │   ├── chat.tsx                 # Claude AI Chatbot
│   │   ├── journal.tsx              # Gefühls-Tagebuch
│   │   ├── exercises.tsx            # Übungsübersicht
│   │   └── insights.tsx             # Stimmungsverlauf + Streak
│   ├── exercises/
│   │   ├── breathing.tsx            # 4-7-8 Atemübung
│   │   └── affirmations.tsx         # Affirmations-Swipe-Cards
│   ├── sos.tsx                      # SOS Fullscreen Modal
│   └── settings.tsx                 # Einstellungen
├── lib/
│   ├── database.ts                  # SQLite — alle CRUD-Funktionen
│   ├── claude.ts                    # Anthropic API + Streaming
│   ├── notifications.ts             # Lokale Reminder
│   ├── updater.ts                   # GitHub Release Check + Update-Flow
│   └── constants.ts                 # Farben, Affirmationen, Texte
├── components/
│   ├── SOSButton.tsx                # Pulsierender SOS-Knopf
│   ├── MoodPicker.tsx               # Stimmungs-Auswahl (5 Emojis)
│   ├── BreathCircle.tsx             # Animierter Atemkreis
│   ├── MoodChart.tsx                # 7-Tage Stimmungsverlauf SVG
│   ├── AffirmationCard.tsx          # Tägliche Affirmation Card
│   ├── JournalEntry.tsx             # Tagebuch-Eintrag Vorschau
│   ├── StreakCard.tsx               # Streak Anzeige + Animation
│   ├── CrisisBanner.tsx             # Telefonseelsorge Hinweis
│   └── UpdateModal.tsx             # Update-Dialog mit Changelog
├── tasks/
│   ├── todo.md                      # Aktiver Arbeitsplan
│   ├── lessons.md                   # Gelernte Muster
│   └── progress.md                  # Fortschrittsübersicht
├── app.json
├── tailwind.config.js
├── babel.config.js
├── tsconfig.json
└── README.md
```

---

## 🗄️ Datenbank-Schema (lib/database.ts)

```sql
-- Alle Tabellen müssen beim App-Start auto-erstellt werden

CREATE TABLE IF NOT EXISTS mood_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  mood_score INTEGER NOT NULL CHECK(mood_score BETWEEN 1 AND 5),
  emoji TEXT NOT NULL,
  note TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT DEFAULT '',
  content TEXT NOT NULL,
  mood_score INTEGER CHECK(mood_score BETWEEN 1 AND 5),
  date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS exercise_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,  -- 'breathing' | 'affirmations'
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,  -- SQLite boolean
  date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
```

**Pflicht-Exports aus database.ts:**
```typescript
// Mood
insertMoodEntry(entry: MoodEntry): Promise<void>
getMoodEntries(limit?: number): Promise<MoodEntry[]>
getMoodEntriesByDateRange(from: string, to: string): Promise<MoodEntry[]>

// Journal
insertJournalEntry(entry: JournalEntry): Promise<void>
getJournalEntries(): Promise<JournalEntry[]>
getJournalEntry(id: number): Promise<JournalEntry | null>
deleteJournalEntry(id: number): Promise<void>

// Exercises
insertExerciseSession(session: ExerciseSession): Promise<void>
getExerciseSessions(): Promise<ExerciseSession[]>
getMostFrequentExercise(): Promise<string | null>

// Chat
insertChatMessage(msg: ChatMessage): Promise<void>
getChatMessages(limit?: number): Promise<ChatMessage[]>
clearChatMessages(): Promise<void>

// Settings
getSetting(key: string): Promise<string | null>
setSetting(key: string, value: string): Promise<void>

// Streak — kritisch!
getStreak(): Promise<number>  // Aufeinanderfolgende Tage mit mind. 1 Eintrag

// DB Init
initDatabase(): Promise<void>  // wird in _layout.tsx aufgerufen
```

---

## 🤖 Claude API Integration (lib/claude.ts)

```typescript
// API Key: wird aus AsyncStorage geladen
// Key in AsyncStorage: 'claude_api_key'
// Modell: claude-sonnet-4-20250514
// Endpoint: https://api.anthropic.com/v1/messages

const SYSTEM_PROMPT = `Du bist CageMind, ein einfühlsamer, warmer digitaler Begleiter für 
Menschen mit Angst und Stress. Du bist kein Therapeut und kein Arzt — 
du bist wie ein guter Freund, der immer zuhört.

Deine Regeln:
- Antworte auf Deutsch, warm und persönlich (du-Form)
- Halte Antworten kurz (max. 3-4 Sätze), außer der Nutzer fragt nach mehr
- Frage nach wie es dem Nutzer geht, zeig echtes Interesse
- Gib keine medizinischen Diagnosen oder Ratschläge
- Wenn jemand sehr verzweifelt klingt: ruhig bleiben, Telefonseelsorge 
  sanft erwähnen (0800 111 0 111, kostenlos, 24/7)
- Schlage passende Übungen aus der App vor wenn sinnvoll (Atemübung, Affirmationen)
- Nutze gelegentlich sanfte Emojis (nicht übertreiben)
- Du erinnerst dich an den Gesprächsverlauf innerhalb der Session`;

// Pflicht-Exports:
export async function sendMessage(
  messages: Message[],
  userMessage: string,
  onChunk: (chunk: string) => void  // Streaming callback
): Promise<string>

export async function getApiKey(): Promise<string | null>
export async function setApiKey(key: string): Promise<void>
export async function hasApiKey(): Promise<boolean>

// Fehlerbehandlung:
// - Kein Internet → BenutzerfreundlicheFehlermeldung
// - API Key falsch (401) → Hinweis auf Settings
// - Rate Limit (429) → "Kurze Pause, gleich weiter..."
// - Timeout → Retry-Logik (max. 2 Versuche)
```

**Streaming-Implementation:**
```typescript
// Verwende fetch() mit ReadableStream
const response = await fetch('https://api.anthropic.com/v1/messages', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 1024,
    stream: true,
    system: SYSTEM_PROMPT,
    messages: conversationHistory,
  }),
});

// Stream parsen: text/event-stream → delta.text events extrahieren
// onChunk() bei jedem Token aufrufen für Tipp-Animation
```

---

## 🔄 GitHub Release System

### lib/updater.ts

```typescript
// GitHub Repo: NosKovsky/CageMind (public)
// API: https://api.github.com/repos/NosKovsky/CageMind/releases/latest
// Kein Auth-Token nötig für public repo reads

const GITHUB_RELEASES_URL = 'https://api.github.com/repos/NosKovsky/CageMind/releases/latest';

export interface ReleaseInfo {
  version: string;        // tag_name ohne "v" → "1.2.0"
  tagName: string;        // "v1.2.0"
  title: string;          // release name
  changelog: string;      // body (Markdown aus GitHub)
  publishedAt: string;    // ISO date string
  downloadUrl: string;    // APK asset browser_download_url
  isForced: boolean;      // aus body parsen: Zeile "FORCED_UPDATE: true"
}

// Pflicht-Exports:
export async function checkForUpdate(): Promise<{
  hasUpdate: boolean;
  release: ReleaseInfo | null;
  currentVersion: string;
}>

export async function getLatestRelease(): Promise<ReleaseInfo | null>

// Versionsnummer aus expo-constants lesen
export function getCurrentVersion(): string  // Constants.expoConfig?.version ?? '0.0.0'

// Semver-Vergleich mit "semver" library
export function isNewerVersion(remote: string, local: string): boolean  // semver.gt(remote, local)

// Cooldown: max. 1x pro 24h automatisch prüfen
// Speichert Timestamp in AsyncStorage unter 'last_update_check'
export async function shouldCheckForUpdate(): Promise<boolean>

// APK-Download: öffnet GitHub Release-Seite im externen Browser
export async function openDownloadUrl(url: string): Promise<void>  // Linking.openURL(url)

// Übersprungene Version merken (nie wieder anzeigen)
export async function skipVersion(version: string): Promise<void>  // AsyncStorage 'skipped_version'
export async function isVersionSkipped(version: string): Promise<boolean>
```

**Fehlerbehandlung:**
- Kein Internet → Silent fail, kein Toast (Update ist optional)
- GitHub API Rate Limit (403) → Cooldown 1h, in lessons.md loggen
- Malformed JSON → Ignorieren, nächsten Check normal planen
- Timeout (>5s) → AbortController, silent fail

**Changelog-Parsing aus GitHub Release Body:**
```typescript
// FORCED_UPDATE: true  → isForced = true (kein "Später"-Button)
// APK-Asset: erstes Asset mit .apk Extension → downloadUrl
// Changelog-Sections für schöne Darstellung im Modal:
// ## 🆕 Neu  /  ## 🐛 Fixes  /  ## ⚠️ Breaking
```

---

### components/UpdateModal.tsx

```typescript
// Wann anzeigen:
// 1. App-Start → nach 3s Delay, nur wenn shouldCheckForUpdate() = true
// 2. Manuell → "Auf Updates prüfen" in settings.tsx (immer, kein Cooldown)
// Nie mehr als 1x täglich automatisch (Cooldown-Check)

interface UpdateModalProps {
  visible: boolean;
  release: ReleaseInfo;
  onDismiss: () => void;   // "Später" — setzt Cooldown, zeigt Modal heute nicht mehr
  onSkip: () => void;      // "Diese Version überspringen" → skipVersion()
  onUpdate: () => void;    // "Jetzt updaten" → openDownloadUrl()
}

// Layout:
// - Modal Background: surface (#1C1B28), border-radius 20, elevation 10
// - Header: Akzent-Badge "🆕 Update verfügbar"
// - Version-Zeile: "1.0.0  →  1.1.0" mit Lucide ArrowRight Icon (accent Farbe)
// - Release-Titel unter der Version
// - ScrollView Changelog-Box (max. 280px Höhe, surface2 BG, border-radius 12):
//     ## Headlines → fett, accent Farbe
//     - Bullet points → "•" mit muted Einzug
//     Plain text → normale text Farbe
// - "Jetzt updaten" Button: accent BG, volle Breite, 48px Höhe
// - "Später erinnern" TextButton: muted Farbe (NUR wenn isForced = false)
// - "Version überspringen" TextButton: danger Farbe, klein (NUR wenn isForced = false)
// - Kein Dismiss bei isForced = true (kein Backdrop-Tap, kein Back-Button)

// Animation: Reanimated v3 slide-up + fade-in (spring, 400ms)
// Backdrop: rgba(0,0,0,0.7), tap to dismiss (wenn !isForced)
// accessibilityRole="dialog" auf Root-View
// accessibilityLabel auf allen Buttons
```

---

### app/_layout.tsx — Auto-Check beim App-Start

```typescript
// Nach DB-Init einfügen:
const [updateRelease, setUpdateRelease] = useState<ReleaseInfo | null>(null);

useEffect(() => {
  const runUpdateCheck = async () => {
    await new Promise(r => setTimeout(r, 3000)); // App erst setzen lassen
    const should = await shouldCheckForUpdate();
    if (!should) return;
    const { hasUpdate, release } = await checkForUpdate();
    if (!hasUpdate || !release) return;
    const skipped = await isVersionSkipped(release.version);
    if (skipped) return;
    setUpdateRelease(release);
  };
  runUpdateCheck();
}, []);

// Im JSX:
{updateRelease && (
  <UpdateModal
    visible={true}
    release={updateRelease}
    onDismiss={() => setUpdateRelease(null)}
    onSkip={async () => { await skipVersion(updateRelease.version); setUpdateRelease(null); }}
    onUpdate={async () => { await openDownloadUrl(updateRelease.downloadUrl); setUpdateRelease(null); }}
  />
)}
```

---

### settings.tsx — Update-Sektion (ergänzen)

```
Neue Sektion "App & Updates" in settings.tsx:

┌─────────────────────────────────────────┐
│ Version          1.0.0                  │
│ Auf Updates prüfen          [Button →]  │
│ Zuletzt geprüft: vor 2 Stunden          │
│ Alle Releases auf GitHub    [Link →]    │
└─────────────────────────────────────────┘

- "Auf Updates prüfen": ruft checkForUpdate() direkt auf (kein Cooldown-Check)
  → Update verfügbar: UpdateModal anzeigen
  → Kein Update: Toast "Du hast die neueste Version ✓" (accent Farbe)
- "Zuletzt geprüft": aus AsyncStorage 'last_update_check', human-readable (z.B. "vor 3 Stunden")
- "Alle Releases auf GitHub": Linking.openURL('https://github.com/NosKovsky/CageMind/releases')
```

---

## 🏷️ GitHub Release Workflow

### CHANGELOG.md Format (Projektroot)

```markdown
# Changelog

## [1.0.0] — 2026-03-21

### 🆕 Neu
- Erste Release von CageMind 💜
- Claude AI Chatbot mit Streaming
- 4-7-8 Atemübung mit Animation
- Gefühls-Tagebuch
- SOS-Notfallscreen
- 7-Tage Stimmungsverlauf

### ℹ️ Hinweise
- API Key in Settings eintragen (Anthropic Console)
- App funktioniert auch ohne Key — Chat ist dann deaktiviert
```

### Versions-Strategie

```
Major.Minor.Patch
1.0.0 → Erster Release
1.0.1 → Bugfix
1.1.0 → Neues Feature
2.0.0 → Breaking Change / komplett neues Design

app.json IMMER synchron halten:
  "version": "1.0.0"        ← semver, sichtbar im UI
  "android": {
    "versionCode": 1        ← Ganzzahl, immer +1 bei jedem Release
  }
```

### Release-Checklist (Agent führt das vor jedem `gh release create` durch)

```
[ ] app.json: version erhöht (z.B. 1.0.0 → 1.1.0)
[ ] app.json: android.versionCode erhöht (+1)
[ ] CHANGELOG.md: neue Sektion oben eingefügt
[ ] npx tsc --noEmit → 0 Fehler
[ ] npx expo run:android → Smoke-Test (alle 5 Tabs, SOS, Atemübung)
[ ] adb logcat → keine Errors im normalen Betrieb
[ ] git add . && git commit -m "chore: Release v1.1.0"
[ ] git tag -a v1.1.0 -m "Release v1.1.0"
[ ] git push origin main --tags
[ ] npx expo run:android --variant release  (Release APK bauen)
[ ] gh release create v1.1.0 \
      --title "CageMind v1.1.0" \
      --notes-file CHANGELOG.md \
      android/app/build/outputs/apk/release/app-release.apk
[ ] GitHub Release öffnen und prüfen: APK-Asset vorhanden + downloadbar?
[ ] tasks/todo.md Review-Sektion eintragen
```

---

## 📱 Screen-Spezifikationen

### home.tsx
- Begrüßung mit Tageszeit + Name aus Settings (`Guten Morgen, [Name] ☀️`)
- Tageszeit-Logik: Morgen 5-11, Mittag 11-17, Abend 17-22, Nacht 22-5
- Tägliche Affirmation: zufällig aus constants.ts, täglich wechselnd
- Mood-Check: "Wie geht's dir gerade?" → MoodPicker → sofort in DB
- Großer pulsierender SOSButton (Reanimated pulse-Animation)
- Quick-Action Cards (3x): Chat, Atemübung, Tagebuch
- StreakCard am unteren Rand

### chat.tsx
- react-native-gifted-chat als Basis-UI
- Bubble-Farben: Claude = `accent` (#A78BFA), User = `surface2`
- Streaming: Antwort erscheint Token für Token (Tipp-Cursor-Animation)
- Chat-Verlauf: aus SQLite laden beim Start
- Erster Start: Claude begrüßt automatisch ("Hallo! Wie geht es dir heute? 💜")
- Header: CageMind Avatar Icon + "CageMind · Immer da" + Online-Status Dot
- Kein API Key → freundliche Card mit Navigationlink zu Settings
- FAB oder Header-Button: "Neue Unterhaltung" (Session clearen, nicht DB)

### journal.tsx
- FAB (+) für neuen Eintrag
- Eintrag-Formular: Titel (optional), MoodPicker, Freitext-Input
- Liste: Einträge nach Datum gruppiert, neueste zuerst
- Tap auf Eintrag → Detailansicht (Modal oder eigener Screen)
- Leerer State: "Noch kein Eintrag — fang einfach an 📝"

### exercises/breathing.tsx
- 4-7-8 Technik: Einatmen 4s → Halten 7s → Ausatmen 8s
- Animierter Kreis (expand/contract) mit react-native-reanimated v3
- Phase-Text: "Einatmen", "Halten", "Ausatmen" + Sekunden-Countdown
- 3 Runden Standard, dann Abschlussscreen ("Gut gemacht 🌿")
- expo-haptics: kurzer Vibrations-Puls bei jedem Phasenwechsel
- expo-keep-awake: Screen bleibt an während Übung läuft
- Übung in exercise_sessions DB speichern wenn abgeschlossen

### exercises/affirmations.tsx
- Swipe-Cards (vertikal oder horizontal)
- 20+ Affirmationen aus constants.ts (KEINE Klischees)
- Favorit-Funktion: Herz-Icon, gespeichert in user_settings als JSON
- Animierter Card-Übergang mit Reanimated
- Fortschritts-Indicator: "3 / 20"

### sos.tsx (Modal)
- Fullscreen, sofort ohne Animation-Delay öffnen
- Großer Text: **"Hey. Ich bin hier. 💜"**
- 3 Sofort-Schritte als Cards:
  1. Mini-Atemanimation + "Einmal tief einatmen"
  2. "Nenn 3 Dinge die du gerade siehst"
  3. "Du bist sicher. Dieser Moment geht vorbei."
- Button: "Mit CageMind sprechen" → navigiert zu chat tab
- Button: "Atemübung starten" → öffnet breathing.tsx
- **Fest am unteren Rand: CrisisBanner** (Telefonseelsorge 0800 111 0 111)
- X-Button oben rechts zum Schließen

### insights.tsx
- 7-Tage Stimmungschart: SVG Balken (react-native-svg)
- Durchschnittsstimmung diese Woche als Zahl + Emoji
- Meist genutzte Übung (aus DB)
- StreakCard mit Motivationstext
- Streak < 3: "Fang einfach an 🌱"
- Streak 3-7: "Du bist dabei — weiter so! 💪"
- Streak 7+: "Wow, [X] Tage! Du bist amazing 🌟"

### settings.tsx
- Name ändern (in user_settings gespeichert)
- Claude API Key: masked Input (`****`), testen + speichern
- Tägliche Erinnerung: TimePicker + Toggle
- **App & Updates:** Version anzeigen, "Auf Updates prüfen" Button, letzter Check-Timestamp, GitHub-Link
- Notfallkontakte anzeigen (Telefonseelsorge)
- "Alle Daten löschen": AlertDialog mit Bestätigung
- App-Version + kurzer Disclaimer-Text

### onboarding/welcome.tsx
- Großes CageMind "Logo" (SVG Herz-Gehirn Icon oder Emoji-basiert)
- Warme Einleitung, 2-3 Sätze
- Kein UI-Overload — minimal, ruhig

### onboarding/disclaimer.tsx
- Klarer Text: "Ich bin kein Arzt und kein Therapeut"
- Checkbox: "Ich verstehe das" (muss angehakt sein um fortzufahren)
- Hint auf Telefonseelsorge

### onboarding/setup.tsx
- Name eingeben (Pflichtfeld)
- API Key eingeben (optional, mit Erklärung was das ist und woher)
- Notifications erlauben (expo-permissions)
- "Loslegen" → Home

---

## 📣 Affirmationen (min. 20, constants.ts)

Ehrlich, menschlich, für echte schwierige Momente. Keine Klischees.

```typescript
export const AFFIRMATIONS = [
  "Du bist stärker als dieser Moment.",
  "Es ist okay, nicht okay zu sein.",
  "Dieser Moment geht vorbei — du schaffst das.",
  "Du bist nicht allein mit dem was du fühlst.",
  "Dein Atem ist immer bei dir. Komm zurück.",
  "Du musst das nicht alleine tragen.",
  "Angst lügt manchmal. Du bist sicherer als sie dir sagt.",
  "Kleine Schritte zählen genauso wie große.",
  "Du hast schon schwierige Tage überstanden — auch diesen.",
  "Es ist keine Schwäche, Hilfe zu brauchen.",
  "Dein Körper versucht dich zu schützen — er meint es gut.",
  "Du kannst langsam sein. Das ist kein Versagen.",
  "Gib dir die Freundlichkeit, die du anderen gibst.",
  "Heute reicht 'gut genug' vollkommen aus.",
  "Du darfst Grenzen haben. Du darfst Nein sagen.",
  "Dieser Gedanke ist nicht die Realität — er ist nur ein Gedanke.",
  "Du bist mehr als deine ängstlichsten Momente.",
  "Ruhe ist keine Zeitverschwendung. Sie ist Pflege.",
  "Auch wenn es sich nicht so anfühlt — du machst das gut.",
  "Jeder Atemzug ist ein neuer Anfang.",
  "Du musst dich nicht für deine Gefühle rechtfertigen.",
  "Manchmal ist 'ich versuche es' die mutigste Antwort.",
  "Dein Wert hängt nicht von deiner Produktivität ab.",
];
```

---

## ✅ Implementierungs-Reihenfolge

Exakt in dieser Reihenfolge arbeiten. Häkchen setzen wenn fertig:

```
Phase 1 — Fundament
[ ] 1.  tasks/todo.md + tasks/lessons.md anlegen
[ ] 2.  Expo-Projekt erstellen + alle Dependencies installieren
[ ] 3.  app.json konfigurieren (Bundle ID, Permissions, etc.)
[ ] 4.  tailwind.config.js + babel.config.js
[ ] 5.  tsconfig.json (strict mode)

Phase 2 — Core Libraries
[ ] 6.  lib/constants.ts (COLORS, AFFIRMATIONS, alle Texte)
[ ] 7.  lib/database.ts (Schema + alle CRUD-Funktionen)
[ ] 8.  lib/claude.ts (API Client + Streaming)
[ ] 9.  lib/notifications.ts (lokale Reminder)
[ ] 10. lib/updater.ts (GitHub Release Check + Semver)

Phase 3 — Komponenten
[ ] 11. components/SOSButton.tsx
[ ] 12. components/MoodPicker.tsx
[ ] 13. components/BreathCircle.tsx
[ ] 14. components/MoodChart.tsx (SVG)
[ ] 15. components/AffirmationCard.tsx
[ ] 16. components/JournalEntry.tsx
[ ] 17. components/StreakCard.tsx
[ ] 18. components/CrisisBanner.tsx
[ ] 19. components/UpdateModal.tsx (Changelog-Modal)

Phase 4 — Navigation & Root
[ ] 20. app/_layout.tsx (DB Init + Theme + Splash + Auto-Update-Check)
[ ] 21. app/index.tsx (Onboarding vs Home Redirect)

Phase 5 — Onboarding
[ ] 22. onboarding/_layout.tsx
[ ] 23. onboarding/welcome.tsx
[ ] 24. onboarding/disclaimer.tsx
[ ] 25. onboarding/setup.tsx

Phase 6 — Tabs
[ ] 26. (tabs)/_layout.tsx
[ ] 27. (tabs)/home.tsx
[ ] 28. (tabs)/chat.tsx
[ ] 29. (tabs)/journal.tsx
[ ] 30. (tabs)/exercises.tsx
[ ] 31. (tabs)/insights.tsx

Phase 7 — Extra Screens
[ ] 32. exercises/breathing.tsx
[ ] 33. exercises/affirmations.tsx
[ ] 34. sos.tsx (Modal)
[ ] 35. settings.tsx (inkl. Update-Sektion)

Phase 8 — Verifikation
[ ] 36. npx tsc --noEmit → 0 Fehler
[ ] 37. Emulator starten + adb devices prüfen
[ ] 38. npx expo run:android
[ ] 39. Alle Screens durchklicken + adb screenshots
[ ] 40. Logcat auf Errors prüfen
[ ] 41. UpdateModal testen: checkForUpdate() in Settings manuell triggern
[ ] 42. README.md schreiben

Phase 9 — GitHub Release
[ ] 43. CHANGELOG.md anlegen (v1.0.0)
[ ] 44. app.json: version + versionCode final prüfen
[ ] 45. npx expo run:android --variant release (Release APK)
[ ] 46. git init + remote → NosKovsky/CageMind
[ ] 47. git add . && git commit -m "chore: Initial release v1.0.0"
[ ] 48. git tag -a v1.0.0 -m "Release v1.0.0" && git push origin main --tags
[ ] 49. gh release create v1.0.0 --title "CageMind v1.0.0 💜" \
        --notes-file CHANGELOG.md \
        android/app/build/outputs/apk/release/app-release.apk
[ ] 50. GitHub Release prüfen: APK downloadbar?
[ ] 51. tasks/todo.md Review-Sektion eintragen
```

---

## 🚨 Wichtige Anforderungen (nicht verhandelbar)

| # | Anforderung |
|---|---|
| 1 | **100% offline** außer Claude Chat |
| 2 | **Kein Tracking**, kein Analytics, kein Firebase |
| 3 | API Key **bleibt im AsyncStorage** — wird nie irgendwo hochgeladen |
| 4 | **try/catch** bei ALLEN DB-Operationen mit benutzerfreundlichen Fehlermeldungen |
| 5 | **Leere States** immer mit warmem Text, nie leere weiße Screens |
| 6 | **accessibilityLabel** auf allen Buttons und interaktiven Elementen |
| 7 | **Min. Touch-Target 48×48px** überall |
| 8 | **Keine TODOs, keine Platzhalter** im Code — alles fertig implementiert |
| 9 | Alle Texte auf **Deutsch** |
| 10 | **TypeScript strict** — keine `any` außer wo absolut unvermeidbar |

---

## 🐛 ADB Test-Protokoll

Nach jeder Phase diese Checks ausführen:

```bash
# 1. TypeScript
npx tsc --noEmit 2>&1 | head -50

# 2. Emulator Check
adb devices

# 3. Build + Deploy
npx expo run:android 2>&1 | tail -30

# 4. Logs in Echtzeit
adb logcat -s ReactNative ReactNativeJS 2>&1 | grep -v "^$"

# 5. Crash-Suche
adb logcat | grep -E "(FATAL|AndroidRuntime|crash)" | tail -20

# 6. Screenshot
adb exec-out screencap -p > /tmp/cagemind_$(date +%H%M%S).png

# 7. App-State reset für sauberen Test
adb shell pm clear com.cagemind.app
```

---

## 📝 tasks/lessons.md — Initiale Regeln

```markdown
# CageMind — Agent Lessons

## Expo/React Native
- NativeWind v4 verwendet `className` prop, NICHT `style` für Tailwind-Klassen
- expo-router v4: Tabs müssen in `(tabs)/` Verzeichnis, Layout in `(tabs)/_layout.tsx`
- expo-sqlite v15: `useSQLiteContext()` Hook statt direktem DB-Zugriff in Komponenten
- Reanimated v3: `useSharedValue`, `useAnimatedStyle`, `withTiming`, `withRepeat` — kein direkter `Animated.Value`
- react-native-gifted-chat: `renderBubble` für Custom Colors, `isTyping` Prop für Tipp-Animation

## API / Streaming
- Anthropic Streaming: `stream: true` + `text/event-stream` Response parsen
- Jeder Chunk: `data: {...}` Zeilen parsen, `delta.type === 'text_delta'` → `delta.text` extrahieren
- API Key immer frisch aus AsyncStorage laden, nie cachen

## GitHub / Updater
- GitHub Releases API: `https://api.github.com/repos/NosKovsky/CageMind/releases/latest`
- `tag_name` kommt mit "v" Prefix → vor semver.gt() Vergleich strippen: `tag.replace(/^v/, '')`
- APK-Asset: `release.assets.find(a => a.name.endsWith('.apk'))?.browser_download_url`
- Rate Limit: 60 requests/h für unauthenticated — mit 24h Cooldown kein Problem
- `gh release create` benötigt installierten GitHub CLI + `gh auth login` im Projekt

## ADB / Testing
- Emulator muss laufen BEVOR `npx expo run:android` ausgeführt wird
- Nach Code-Änderungen: Metro Cache clearen mit `npx expo start --clear`
- SQLite-Daten bei Tests zurücksetzen: `adb shell pm clear com.cagemind.app`
```

---

## 🚀 Start-Kommando

```bash
# Emulator starten (falls noch nicht laufend)
# → Android Studio öffnen → AVD Manager → Play

# Dann:
cd CageMind
npx expo run:android

# Parallel in zweitem Terminal:
adb logcat -s ReactNative:V ReactNativeJS:V
```

---

*Letztes Update: Session-Start*  
*Agent: Claude Code | Projekt: CageMind v1.0.0 | Repo: NosKovsky/CageMind*
