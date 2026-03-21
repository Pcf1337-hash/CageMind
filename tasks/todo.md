# CageMind — Aktiver Arbeitsplan

## Phase 1 — Fundament
- [x] tasks/todo.md + tasks/lessons.md anlegen
- [ ] Expo-Projekt erstellen + alle Dependencies installieren
- [ ] app.json konfigurieren (Bundle ID, Permissions, etc.)
- [ ] tailwind.config.js + babel.config.js
- [ ] tsconfig.json (strict mode)

## Phase 2 — Core Libraries
- [ ] lib/constants.ts (COLORS, AFFIRMATIONS, alle Texte)
- [ ] lib/database.ts (Schema + alle CRUD-Funktionen)
- [ ] lib/claude.ts (API Client + Streaming)
- [ ] lib/notifications.ts (lokale Reminder)
- [ ] lib/updater.ts (GitHub Release Check + Semver)

## Phase 3 — Komponenten
- [ ] components/SOSButton.tsx
- [ ] components/MoodPicker.tsx
- [ ] components/BreathCircle.tsx
- [ ] components/MoodChart.tsx (SVG)
- [ ] components/AffirmationCard.tsx
- [ ] components/JournalEntry.tsx
- [ ] components/StreakCard.tsx
- [ ] components/CrisisBanner.tsx
- [ ] components/UpdateModal.tsx

## Phase 4 — Navigation & Root
- [ ] app/_layout.tsx (DB Init + Theme + Splash + Auto-Update-Check)
- [ ] app/index.tsx (Onboarding vs Home Redirect)

## Phase 5 — Onboarding
- [ ] onboarding/_layout.tsx
- [ ] onboarding/welcome.tsx
- [ ] onboarding/disclaimer.tsx
- [ ] onboarding/setup.tsx

## Phase 6 — Tabs
- [ ] (tabs)/_layout.tsx
- [ ] (tabs)/home.tsx
- [ ] (tabs)/chat.tsx
- [ ] (tabs)/journal.tsx
- [ ] (tabs)/exercises.tsx
- [ ] (tabs)/insights.tsx

## Phase 7 — Extra Screens
- [ ] exercises/breathing.tsx
- [ ] exercises/affirmations.tsx
- [ ] sos.tsx (Modal)
- [ ] settings.tsx (inkl. Update-Sektion)

## Phase 8 — Verifikation
- [ ] npx tsc --noEmit → 0 Fehler
- [ ] Emulator starten + adb devices prüfen
- [ ] npx expo run:android
- [ ] Alle Screens durchklicken + adb screenshots
- [ ] Logcat auf Errors prüfen
- [ ] UpdateModal testen

## Phase 9 — GitHub Release
- [ ] CHANGELOG.md anlegen (v1.0.0)
- [ ] app.json: version + versionCode final prüfen
- [ ] npx expo run:android --variant release (Release APK)
- [ ] git init + remote → NosKovsky/CageMind
- [ ] git add . && git commit -m "chore: Initial release v1.0.0"
- [ ] git tag -a v1.0.0 && git push origin main --tags
- [ ] gh release create v1.0.0
- [ ] GitHub Release prüfen: APK downloadbar?
