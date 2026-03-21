import AsyncStorage from '@react-native-async-storage/async-storage';

const API_KEY_STORAGE_KEY = 'claude_api_key';
const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';
const MODEL_EXTRACTION = 'claude-haiku-4-5-20251001'; // Cheaper model for background profile extraction

export function buildSystemPrompt(
  userName: string,
  streak: number,
  avgMood: number | null,
  profileNotes?: string | null,
): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('de-DE', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const hourStr = now.getHours();
  const timeOfDay =
    hourStr >= 5 && hourStr < 12
      ? 'Morgen'
      : hourStr >= 12 && hourStr < 17
      ? 'Mittag'
      : hourStr >= 17 && hourStr < 22
      ? 'Abend'
      : 'Nacht';

  const moodContext = avgMood !== null
    ? `Die durchschnittliche Stimmung von ${userName} in den letzten Tagen lag bei ${avgMood.toFixed(1)}/5.`
    : `${userName} hat noch keine Stimmungseinträge hinterlegt.`;

  const streakContext =
    streak >= 7
      ? `${userName} ist seit ${streak} Tagen aktiv dabei — das ist beeindruckend.`
      : streak >= 3
      ? `${userName} hat einen Streak von ${streak} Tagen — schön, dass die Kontinuität wächst.`
      : streak === 1
      ? `${userName} hat heute einen neuen Start gemacht.`
      : `${userName} fängt gerade erst an — jeder Anfang zählt.`;

  const profileSection = profileNotes && profileNotes.trim().length > 0
    ? `\n## Was ich über ${userName} weiß — dauerhaftes Gedächtnis\n${profileNotes}\n\nDiese Erkenntnisse stammen aus früheren Gesprächen. Nutze sie natürlich und organisch — nicht als Checkliste, sondern wie ein Freund der sich wirklich erinnert. Wenn ${userName} etwas erwähnt das du schon kennst, zeige ruhig dass du es weißt.`
    : '';

  return `Du bist CageMind — der persönliche, digitale Begleiter von ${userName}.

## Deine Identität
Du bist kein Chatbot und kein Therapeut. Du bist wie der eine Freund, den man um 2 Uhr nachts anrufen kann, der wirklich zuhört, keine Urteile fällt und sich an alles erinnert. Du kennst ${userName} — sein/ihr Leben, seine/ihre Ängste, seine/ihre kleinen Siege und schwierigen Momente. Dieser Kontext macht jedes Gespräch tiefer als das letzte.

## Kontext über ${userName} heute
- Heutiges Datum: ${dateStr} (${timeOfDay})
- Aktive Streak: ${streakContext}
- Stimmungsbild: ${moodContext}
${profileSection}
## Gedächtnis & Kontinuität — das ist dein Kernmerkmal
Der vollständige bisherige Gesprächsverlauf wird dir als Nachrichten übergeben. Das ist dein Gedächtnis. Nutze es aktiv:
- Erkenne Muster: Wenn ${userName} wieder über Schlafprobleme spricht, verbinde das mit früheren Erwähnungen
- Referenziere konkret: "Du hast mal erzählt, dass..." oder "Letztes Mal sagtest du..."
- Baue auf Vertrauen: ${userName} soll spüren, dass du wirklich zugehört hast — nicht nur im letzten Gespräch, sondern in allen

## Persönlichkeit & Stil
- Immer Du-Form, immer ${userName} mit Namen ansprechen wenn es natürlich passt
- Kurze, echte Antworten (2-4 Sätze) — außer ${userName} fragt nach mehr oder braucht offensichtlich Raum
- Stelle eine echte Folgefrage pro Antwort — zeige echtes Interesse
- Validiere zuerst die Gefühle, bevor du irgendetwas vorschlägst
- Vermeide Phrasen wie "Natürlich!", "Absolut!", "Das klingt toll!" — sie wirken unecht
- Emojis: sparsam, nur wenn sie wirklich passen (max. 1 pro Antwort)
- Sei direkt wenn nötig, sanft wenn nötig — lies die Situation
- Sprich immer grammatikalisch fließend — prüfe mental jeden Satz bevor du ihn schreibst, vermeide Wortwiederholungen (z.B. niemals "du ... du" im selben Satzteil)

## Was du NICHT tust
- Keine medizinischen Diagnosen oder Medikamentenempfehlungen
- Keine leeren Plattitüden oder performative Positivität
- Keine langen Aufzählungen oder Bullet-Points in der Antwort
- Nicht ständig Übungen vorschlagen — nur wenn es sich organisch ergibt

## Bei ernstem Leid
Wenn ${userName} sehr verzweifelt klingt oder Andeutungen auf Selbstverletzung macht:
1. Zuerst ruhig bleiben und voll präsent sein
2. Die Telefonseelsorge sanft nennen: 0800 111 0 111 (kostenlos, 24/7, anonym)
3. Fragen: "Bist du gerade in Sicherheit?"
4. Den SOS-Button in der App erwähnen wenn sinnvoll

## App-Übungen die du kennen und empfehlen kannst
- **4-7-8 Atemübung** (Tab "Übungen"): 4s einatmen, 7s halten, 8s ausatmen — hervorragend bei akuter Angst
- **Affirmationskarten** (Tab "Übungen"): tägliche, ehrliche Affirmationen zum Durchblättern
- **Tagebuch** (Tab "Tagebuch"): Gefühle strukturieren hilft beim Verarbeiten
- **Einblicke** (Tab "Einblicke"): Stimmungsverlauf der letzten 7 Tage ansehen

## Wenn ${userName} ein Bild teilt
1. Beschreibe kurz in einem Satz was du siehst — neutral und offen
2. Stelle eine echte Frage die das Bild mit ${userName}'s Gefühlsleben verbindet ("Was bedeutet das Bild für dich?", "Wie war die Stimmung in diesem Moment?")
3. Urteile nicht — frage zuerst nach der Bedeutung, bevor du eine Einschätzung gibst
4. Wenn das Bild Stress, Unordnung oder belastende Situationen zeigt: validiere zuerst, frage dann nach dem Kontext`;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ImageAttachment {
  base64: string;
  mediaType: string;
}

export async function getApiKey(): Promise<string | null> {
  try {
    const stored = await AsyncStorage.getItem(API_KEY_STORAGE_KEY);
    if (stored && stored.trim()) return stored.trim();
    const envKey = process.env.EXPO_PUBLIC_CLAUDE_API_KEY;
    return envKey || null;
  } catch {
    return null;
  }
}

export async function setApiKey(key: string): Promise<void> {
  await AsyncStorage.setItem(API_KEY_STORAGE_KEY, key.trim());
}

export async function hasApiKey(): Promise<boolean> {
  const key = await getApiKey();
  return key !== null && key.trim().length > 0;
}

export async function sendMessage(
  messages: Message[],
  userMessage: string,
  onChunk: (chunk: string) => void,
  systemPrompt?: string,
  image?: ImageAttachment,
): Promise<string> {
  const apiKey = await getApiKey();

  if (!apiKey) {
    throw new Error('NO_API_KEY');
  }

  // Build the user content — plain text or vision (image + text)
  type ApiContent =
    | string
    | Array<
        | { type: 'text'; text: string }
        | { type: 'image'; source: { type: 'base64'; media_type: string; data: string } }
      >;

  const userContent: ApiContent = image
    ? [
        {
          type: 'image' as const,
          source: {
            type: 'base64' as const,
            media_type: image.mediaType,
            data: image.base64,
          },
        },
        {
          type: 'text' as const,
          text: userMessage.trim() || 'Bitte analysiere dieses Bild.',
        },
      ]
    : userMessage;

  const conversationHistory: Array<{ role: 'user' | 'assistant'; content: ApiContent }> = [
    ...messages.map((m) => ({ role: m.role, content: m.content as ApiContent })),
    { role: 'user' as const, content: userContent },
  ];

  const attemptRequest = async (attempt: number): Promise<string> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1024,
          stream: true,
          system: systemPrompt ?? buildSystemPrompt('Nutzer', 0, null),
          messages: conversationHistory,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const status = response.status;
        if (status === 401) {
          throw new Error('INVALID_API_KEY');
        }
        if (status === 429) {
          throw new Error('RATE_LIMIT');
        }
        throw new Error(`API_ERROR_${status}`);
      }

      // Helper: parse SSE lines and call onChunk for each text delta
      const parseSSELines = (lines: string[], fullText: string): string => {
        let text = fullText;
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data) as {
              type: string;
              delta?: { type: string; text: string };
            };
            if (
              parsed.type === 'content_block_delta' &&
              parsed.delta?.type === 'text_delta'
            ) {
              const chunk = parsed.delta.text;
              text += chunk;
              onChunk(chunk);
            }
          } catch {
            // Malformed JSON chunk — skip
          }
        }
        return text;
      };

      const reader = response.body?.getReader();

      if (!reader) {
        // Fallback for React Native environments where response.body is null:
        // Read full SSE text at once and parse it
        const rawText = await response.text();
        const lines = rawText.split('\n');
        const fullText = parseSSELines(lines, '');
        return fullText;
      }

      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';
        fullText = parseSSELines(lines, fullText);
      }

      return fullText;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          if (attempt < 2) {
            return attemptRequest(attempt + 1);
          }
          throw new Error('TIMEOUT');
        }
        throw error;
      }
      throw error;
    }
  };

  return attemptRequest(1);
}

/**
 * Extracts and updates a persistent psychological profile from the conversation.
 * Called silently every 5 user messages. Never throws — returns currentNotes on failure.
 */
export async function extractProfileInsights(
  recentMessages: Message[],
  currentNotes: string,
  userName: string,
): Promise<string> {
  const apiKey = await getApiKey();
  if (!apiKey) return currentNotes;

  // Need at least a few exchanges to extract something meaningful
  if (recentMessages.length < 4) return currentNotes;

  const messagesText = recentMessages
    .slice(-20)
    .map((m) => `${m.role === 'user' ? userName : 'CageMind'}: ${m.content}`)
    .join('\n\n');

  const extractionPrompt = `Analysiere dieses Gespräch und aktualisiere das Profil über ${userName}.

Bisheriges Profil:
${currentNotes || '(noch keine Notizen)'}

Jüngste Nachrichten:
${messagesText}

Schreibe das aktualisierte Profil als kompakte Bullet-Points (max. 15 Punkte, nur was wirklich aus dem Gespräch bekannt ist).
Decke diese Kategorien ab (nur wenn Informationen vorhanden):
- Bekannte Ängste und Sorgen
- Persönliche Auslöser/Stressoren
- Was hilft (Coping-Strategien die funktionieren)
- Persönliche Fakten (Beruf, Familie, Wohnsituation, Hobbys)
- Wiederkehrende Themen und Muster
- Fortschritte und Erfolge
- Wie ${userName} Unterstützung am besten annimmt`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL_EXTRACTION,
        max_tokens: 600,
        system: `Du bist ein präziser Assistent der knappe, faktische Notizen über eine Person in deutschen Bullet-Points schreibt. Nur belegte Fakten aus dem Gespräch — keine Spekulationen. Format: "- [Kategorie]: [Fakt]". Keine Einleitung, keine Erklärung.`,
        messages: [{ role: 'user', content: extractionPrompt }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return currentNotes;

    const json = await response.json() as {
      content?: Array<{ type: string; text: string }>;
    };
    const extracted = json.content?.[0]?.text?.trim() ?? '';
    return extracted.length > 10 ? extracted : currentNotes;
  } catch {
    return currentNotes;
  }
}

export interface FullProfileData {
  userName: string;
  currentNotes: string;
  chatMessages: Message[];
  moodEntries: Array<{ date: string; mood_score: number }>;
  journalEntries: Array<{ title: string; content: string; date: string }>;
  exerciseSessions: Array<{ type: string; completed: boolean; date: string }>;
}

/**
 * Builds a comprehensive personal profile from ALL data sources.
 * Called manually via "Profil aufbauen" button. Returns updated profile text.
 * Format: First line "ZUSAMMENFASSUNG: ..." then bullet points.
 */
export async function buildFullProfile(data: FullProfileData): Promise<string> {
  const apiKey = await getApiKey();
  if (!apiKey) return data.currentNotes;

  const { userName, currentNotes, chatMessages, moodEntries, journalEntries, exerciseSessions } = data;

  // Mood summary
  const moodSummary = moodEntries.length > 0
    ? moodEntries
        .slice(-30)
        .map((e) => `${e.date}: ${e.mood_score}/5`)
        .join(', ')
    : 'Keine Stimmungseinträge';

  // Average mood per weekday
  const weekdayScores: Record<number, number[]> = {};
  for (const e of moodEntries) {
    const day = new Date(e.date + 'T12:00:00').getDay();
    if (!weekdayScores[day]) weekdayScores[day] = [];
    weekdayScores[day].push(e.mood_score);
  }
  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const weekdayAvgs = Object.entries(weekdayScores)
    .map(([d, scores]) => `${dayNames[Number(d)]}: ${(scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)}`)
    .join(', ');

  // Exercise usage
  const exerciseCounts: Record<string, number> = {};
  for (const s of exerciseSessions) {
    if (s.completed) exerciseCounts[s.type] = (exerciseCounts[s.type] ?? 0) + 1;
  }
  const exerciseSummary = Object.entries(exerciseCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([type, count]) => `${type}: ${count}x`)
    .join(', ') || 'Keine Übungen';

  // Journal excerpts
  const journalText = journalEntries
    .slice(-8)
    .map((j) => `[${j.date}] ${j.title ? j.title + ': ' : ''}${j.content.slice(0, 200)}`)
    .join('\n') || 'Keine Tagebucheinträge';

  // Recent chat
  const chatText = chatMessages
    .slice(-30)
    .map((m) => `${m.role === 'user' ? userName : 'CageMind'}: ${m.content}`)
    .join('\n\n') || 'Kein Chat-Verlauf';

  const prompt = `Erstelle ein tiefes persönliches Profil von ${userName} basierend auf allen verfügbaren Daten.

## Stimmungsdaten (letzte 30 Tage)
${moodSummary}
Wochentag-Durchschnitt: ${weekdayAvgs || 'zu wenig Daten'}

## Übungsnutzung (abgeschlossen)
${exerciseSummary}

## Tagebucheinträge (letzte 8)
${journalText}

## Chat-Verlauf (letzte 30 Nachrichten)
${chatText}

## Bisheriges Profil
${currentNotes || '(noch keins)'}

Schreibe ein aktualisiertes Profil in folgendem Format:
ZUSAMMENFASSUNG: [2-3 warme, persönliche Sätze die ${userName} als Mensch beschreiben — Stärken, Muster, wo er/sie gerade steht]

Dann Bullet-Points (max. 18, nur belegte Fakten):
- [Kategorie]: [Fakt]

Kategorien: Ängste & Sorgen | Auslöser/Stressoren | Was hilft | Stimmungsmuster | Übungspräferenzen | Persönliche Fakten | Fortschritte | Kommunikationsstil`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL_EXTRACTION,
        max_tokens: 900,
        system: `Du bist ein einfühlsamer Assistent der persönliche Profile in präzisen deutschen Bullet-Points schreibt. Nur belegte Fakten — keine Spekulationen. Schreibe warm aber faktenbasiert. Halte dich exakt an das vorgegebene Format.`,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (!response.ok) return currentNotes;

    const json = await response.json() as {
      content?: Array<{ type: string; text: string }>;
    };
    const extracted = json.content?.[0]?.text?.trim() ?? '';
    return extracted.length > 20 ? extracted : currentNotes;
  } catch {
    return currentNotes;
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    switch (error.message) {
      case 'NO_API_KEY':
        return 'Kein API-Schlüssel hinterlegt. Bitte in den Einstellungen eintragen.';
      case 'INVALID_API_KEY':
        return 'Der API-Schlüssel ist ungültig. Bitte in den Einstellungen prüfen.';
      case 'RATE_LIMIT':
        return 'Kurze Pause — gleich weiter...';
      case 'TIMEOUT':
        return 'Die Verbindung hat zu lange gedauert. Bitte versuche es erneut.';
      case 'STREAM_ERROR':
        return 'Fehler beim Empfangen der Antwort. Bitte versuche es erneut.';
      default:
        if (error.message.startsWith('API_ERROR_')) {
          return 'Ein Fehler ist aufgetreten. Bitte versuche es erneut.';
        }
        return 'Keine Verbindung möglich. Bitte prüfe deine Internetverbindung.';
    }
  }
  return 'Unbekannter Fehler. Bitte versuche es erneut.';
}
