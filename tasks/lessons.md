# CageMind — Agent Lessons

## Expo/React Native
- NativeWind v4 verwendet `className` prop, NICHT `style` fur Tailwind-Klassen
- expo-router v4: Tabs mussen in `(tabs)/` Verzeichnis, Layout in `(tabs)/_layout.tsx`
- expo-sqlite v15: `useSQLiteContext()` Hook statt direktem DB-Zugriff in Komponenten
- Reanimated v3: `useSharedValue`, `useAnimatedStyle`, `withTiming`, `withRepeat` — kein direkter `Animated.Value`
- react-native-gifted-chat: `renderBubble` fur Custom Colors, `isTyping` Prop fur Tipp-Animation

## API / Streaming
- Anthropic Streaming: `stream: true` + `text/event-stream` Response parsen
- Jeder Chunk: `data: {...}` Zeilen parsen, `delta.type === 'text_delta'` → `delta.text` extrahieren
- API Key immer frisch aus AsyncStorage laden, nie cachen

## GitHub / Updater
- GitHub Releases API: `https://api.github.com/repos/NosKovsky/CageMind/releases/latest`
- `tag_name` kommt mit "v" Prefix → vor semver.gt() Vergleich strippen: `tag.replace(/^v/, '')`
- APK-Asset: `release.assets.find(a => a.name.endsWith('.apk'))?.browser_download_url`
- Rate Limit: 60 requests/h fur unauthenticated — mit 24h Cooldown kein Problem
- `gh release create` benotigt installierten GitHub CLI + `gh auth login` im Projekt

## ADB / Testing
- Emulator muss laufen BEVOR `npx expo run:android` ausgefuhrt wird
- Nach Code-Anderungen: Metro Cache clearen mit `npx expo start --clear`
- SQLite-Daten bei Tests zurucksetzen: `adb shell pm clear com.cagemind.app`
